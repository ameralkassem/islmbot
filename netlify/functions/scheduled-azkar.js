// =============================================
// بوت أثر | Athar — إرسال الأذكار التلقائية
// =============================================
// هذه الـ Function ترسل ذكر/آية/حديث عشوائي
// لكل المجموعات المسجلة عند استدعائها عبر HTTP GET
//
// كيفية الاستخدام:
// 1. اضبط متغير البيئة GROUP_CHAT_IDS بقيم مثل:
//    -100123456789,-100987654321
// 2. استدعِ هذه الـ Function عبر Netlify Cron أو
//    أي خدمة Cron خارجية (cron-job.org مثلاً)
//    على المسار: /.netlify/functions/scheduled-azkar
//
// NOTE: Netlify Functions لا تدعم الكتابة على الملفات
// في runtime (بيئة serverless فقط للقراءة).
// لذلك المجموعات تُحدَّد عبر متغير البيئة GROUP_CHAT_IDS.
// =============================================

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.join(__dirname, "../../data");

function loadData(filename) {
  try {
    const raw = readFileSync(path.join(dataDir, filename), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

import {
  getRandom,
  sendMessage,
  formatThikr,
  formatAyah,
  formatHadith,
  formatGeneralThikr,
  formatDidYouKnow,
} from "../../helpers/utils.js";

// =============================================
// الـ Handler الرئيسي
// =============================================
export const handler = async (event) => {
  // نقبل فقط GET أو POST (للـ Cron)
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const groupIds = getGroupIds();

    if (groupIds.length === 0) {
      console.log("No group IDs configured in GROUP_CHAT_IDS");
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, message: "No groups configured", sent: 0 }),
      };
    }

    const content = getRandomContent();
    let sent = 0;
    let errors = 0;

    for (const chatId of groupIds) {
      try {
        await sendMessage(chatId, content.text);
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${chatId}:`, err.message);
        errors++;
      }
      // تأخير صغير بين الرسائل لتجنب Rate Limit
      await delay(500);
    }

    console.log(`Scheduled azkar sent: ${sent} success, ${errors} errors`);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, sent, errors, type: content.type }),
    };
  } catch (err) {
    console.error("Scheduled azkar error:", err);
    return {
      statusCode: 200, // دائماً 200 عشان ما يعيد المحاولة
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};

// =============================================
// قراءة IDs المجموعات من متغير البيئة
// =============================================
function getGroupIds() {
  const raw = process.env.GROUP_CHAT_IDS || "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

// =============================================
// اختيار محتوى عشوائي للإرسال
// =============================================
function getRandomContent() {
  const contentTypes = ["thikr", "ayah", "hadith", "didyouknow", "dua"];
  const type = getRandom(contentTypes);

  switch (type) {
    case "thikr": {
      const items = loadData("azkar-general.json");
      return { type, text: formatGeneralThikr(getRandom(items)) };
    }
    case "ayah": {
      const items = loadData("ayat.json");
      return { type, text: formatAyah(getRandom(items)) };
    }
    case "hadith": {
      const items = loadData("ahadith.json");
      return { type, text: formatHadith(getRandom(items)) };
    }
    case "didyouknow": {
      const items = loadData("did-you-know.json");
      return { type, text: formatDidYouKnow(getRandom(items)) };
    }
    case "dua": {
      const items = loadData("duas.json");
      const item = getRandom(items);
      let text = `🤲 <b>دعاء — ${item.occasion}</b>\n\n${item.text}`;
      if (item.source) text += `\n\n📖 <b>المصدر:</b> ${item.source}`;
      return { type, text };
    }
    default: {
      const items = loadData("azkar-general.json");
      return { type: "thikr", text: formatGeneralThikr(getRandom(items)) };
    }
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
