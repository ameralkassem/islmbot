// =============================================
// بوت أثر | Athar — إرسال الأذكار التلقائية
// Vercel Serverless Function
// =============================================

"use strict";

const fs   = require("fs");
const path = require("path");

const {
  getRandom,
  sendMessage,
  formatGeneralThikr,
  formatAyah,
  formatHadith,
  formatDidYouKnow,
  formatDua,
} = require("../helpers/utils");

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

// =============================================
// Handler الرئيسي — Vercel style
// =============================================
module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const groupIds = getGroupIds();

    if (groupIds.length === 0) {
      console.log("No group IDs configured in GROUP_CHAT_IDS");
      return res.status(200).json({ ok: true, message: "No groups configured", sent: 0 });
    }

    const content = getRandomContent();
    let sent   = 0;
    let errors = 0;

    for (const chatId of groupIds) {
      try {
        await sendMessage(chatId, content.text);
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${chatId}:`, err.message);
        errors++;
      }
      await delay(500);
    }

    console.log(`Scheduled azkar sent: ${sent} success, ${errors} errors`);
    return res.status(200).json({ ok: true, sent, errors, type: content.type });
  } catch (err) {
    console.error("Scheduled azkar error:", err);
    return res.status(200).json({ ok: false, error: err.message });
  }
};

function getGroupIds() {
  const raw = process.env.GROUP_CHAT_IDS || "";
  return raw.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
}

function getRandomContent() {
  const contentTypes = ["thikr", "ayah", "hadith", "didyouknow", "dua"];
  const type = getRandom(contentTypes);

  switch (type) {
    case "thikr":      return { type, text: formatGeneralThikr(getRandom(loadData("azkar-general.json"))) };
    case "ayah":       return { type, text: formatAyah(getRandom(loadData("ayat.json"))) };
    case "hadith":     return { type, text: formatHadith(getRandom(loadData("ahadith.json"))) };
    case "didyouknow": return { type, text: formatDidYouKnow(getRandom(loadData("did-you-know.json"))) };
    case "dua":        return { type, text: formatDua(getRandom(loadData("duas.json"))) };
    default:           return { type: "thikr", text: formatGeneralThikr(getRandom(loadData("azkar-general.json"))) };
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
