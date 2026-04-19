// =============================================
// Upstash Redis — مساعد تخزين الـ Chat IDs
// =============================================

"use strict";

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(command) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const response = await fetch(UPSTASH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Redis error:", error.message);
    return null;
  }
}

async function addChatId(chatId, type, username, name) {
  await redisCommand(["SADD", "chat_ids", String(chatId)]);
  await redisCommand(["HSET", `chat:${chatId}`,
    "type",    type,
    "username", username || "",
    "name",     name     || "",
    "updated",  Date.now().toString(),
  ]);
  await redisCommand(["DEL", "chat_list_cache"]);
}

async function removeChatId(chatId) {
  await redisCommand(["SREM", "chat_ids", String(chatId)]);
  await redisCommand(["DEL", `chat:${chatId}`]);
  await redisCommand(["DEL", "chat_list_cache"]);
}

async function getAllChatIds() {
  const ids = await redisCommand(["SMEMBERS", "chat_ids"]);
  return ids || [];
}

// قائمة مرتّبة مخزّنة في كاش — قنوات ← مجموعات ← خاص
async function getCachedList() {
  const cached = await redisCommand(["GET", "chat_list_cache"]);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }
  const allIds = await redisCommand(["SMEMBERS", "chat_ids"]);
  if (!allIds || allIds.length === 0) return [];
  const entries = [];
  for (const id of allIds) {
    const fields = await redisCommand(["HGETALL", `chat:${id}`]);
    const obj = { id };
    if (Array.isArray(fields)) {
      for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
    }
    if (!obj.type)     obj.type     = "private";
    if (!obj.username) obj.username = "";
    if (!obj.name)     obj.name     = "";
    entries.push(obj);
  }
  const order = (t) => t === "channel" ? 0 : (t === "group" || t === "supergroup") ? 1 : 2;
  entries.sort((a, b) => order(a.type) - order(b.type));
  await redisCommand(["SET", "chat_list_cache", JSON.stringify(entries), "EX", "300"]);
  return entries;
}

module.exports = { redisCommand, addChatId, removeChatId, getAllChatIds, getCachedList };
