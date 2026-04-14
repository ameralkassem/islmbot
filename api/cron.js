// =============================================
// الأثر — النشر التلقائي كل ساعتين
// Vercel Serverless Function + Cron
// =============================================

"use strict";

const fs   = require("fs");
const path = require("path");

const {
  getRandom,
  getCustomButtons,
  makeInlineKeyboard,
  formatDidYouKnow,
  formatGeneralThikr,
  formatAyah,
  formatHadith,
  formatDua,
} = require("../helpers/utils");

const { getAllChatIds, removeChatId } = require("../helpers/redis");

const dataDir = path.resolve(__dirname, "../data");

function loadData(filename) {
  try {
    const raw = fs.readFileSync(path.join(dataDir, filename), "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`loadData error (${filename}):`, err.message);
    return [];
  }
}

function getRandomContent() {
  const types = ["thikr", "ayah", "hadith", "didyouknow", "dua"];
  const type  = getRandom(types);
  switch (type) {
    case "thikr":      return { type, text: formatGeneralThikr(getRandom(loadData("azkar-general.json"))) };
    case "ayah":       return { type, text: formatAyah(getRandom(loadData("ayat.json"))) };
    case "hadith":     return { type, text: formatHadith(getRandom(loadData("ahadith.json"))) };
    case "didyouknow": return { type, text: formatDidYouKnow(getRandom(loadData("did-you-know.json"))) };
    case "dua":        return { type, text: formatDua(getRandom(loadData("duas.json"))) };
    default:           return { type: "thikr", text: formatGeneralThikr(getRandom(loadData("azkar-general.json"))) };
  }
}

function buildReplyMarkup() {
  const custom = getCustomButtons();
  if (custom.length === 0) return undefined;
  return makeInlineKeyboard(custom);
}

async function sendToChat(chatId, text, replyMarkup) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// =============================================
// Handler الرئيسي — Vercel style
// =============================================
module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const chatIds = await getAllChatIds();

    if (chatIds.length === 0) {
      console.log("Cron: no chat IDs in Redis");
      return res.status(200).json({ ok: true, message: "no chats", sent: 0 });
    }

    const content     = getRandomContent();
    const replyMarkup = buildReplyMarkup();
    let sent   = 0;
    let errors = 0;

    for (const chatId of chatIds) {
      try {
        const result = await sendToChat(chatId, content.text, replyMarkup);
        if (result.ok) {
          sent++;
        } else if (result.error_code === 403 || result.error_code === 400) {
          // محظور أو محذوف — شيل من القائمة
          await removeChatId(chatId).catch(() => {});
          errors++;
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`Cron: failed to send to ${chatId}:`, err.message);
        errors++;
      }
      // تأخير بسيط لتجنب rate limiting
      await delay(50);
    }

    console.log(`Cron: sent=${sent} errors=${errors} type=${content.type}`);
    return res.status(200).json({ ok: true, sent, errors, type: content.type });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(200).json({ ok: false, error: err.message });
  }
};
