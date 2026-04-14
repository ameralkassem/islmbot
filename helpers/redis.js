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

async function addChatId(chatId, type) {
  await redisCommand(["SADD", "chat_ids", String(chatId)]);
  await redisCommand(["HSET", `chat:${chatId}`, "type", type, "added", Date.now().toString()]);
}

async function removeChatId(chatId) {
  await redisCommand(["SREM", "chat_ids", String(chatId)]);
  await redisCommand(["DEL", `chat:${chatId}`]);
}

async function getAllChatIds() {
  const ids = await redisCommand(["SMEMBERS", "chat_ids"]);
  return ids || [];
}

module.exports = { addChatId, removeChatId, getAllChatIds };
