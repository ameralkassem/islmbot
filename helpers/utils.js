// =============================================
// مساعدات البوت الإسلامي — أثر | Athar
// =============================================

"use strict";

// =============================================
// Telegram API
// =============================================

async function callTelegram(method, body) {
  const token = process.env.BOT_TOKEN;
  const url   = `https://api.telegram.org/bot${token}/${method}`;
  const res   = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(chatId, text, extra = {}) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

async function editMessage(chatId, messageId, text, extra = {}) {
  return callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

async function editMessageInline(inlineMessageId, text, extra = {}) {
  return callTelegram("editMessageText", {
    inline_message_id: inlineMessageId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

async function answerCallback(callbackQueryId, text = "", showAlert = false) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

async function answerInlineQuery(inlineQueryId, results, cacheTime = 0) {
  return callTelegram("answerInlineQuery", {
    inline_query_id: inlineQueryId,
    results,
    cache_time: cacheTime,
  });
}

// =============================================
// مساعدات عامة
// =============================================

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// =============================================
// تنسيق الرسائل
// =============================================

const SEP   = "ـــــــــــــــــــــــ";
const BRAND = "🌙 أثر | @AtharIslamBot";

// ---- هل تعلم ----
function formatDidYouKnow(item) {
  return [
    "🧠 هل تعلم؟",
    "",
    item.text,
    "",
    "📚 التصنيف: " + item.category,
    "",
    SEP,
    BRAND,
  ].join("\n");
}

// ---- ذكر من أذكار الصباح/المساء/النوم (له count) ----
function formatThikr(item) {
  const lines = ["📿 ذكر", "", item.text];
  const meta  = [];
  if (item.count)  meta.push("🔢 التكرار: " + (item.count === 1 ? "مرة واحدة" : item.count + " مرات"));
  if (item.source) meta.push("📖 المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND);
  return lines.join("\n");
}

// ---- ذكر عام (له occasion) ----
function formatGeneralThikr(item) {
  const lines = ["📿 ذكر", "", item.text];
  const meta  = [];
  if (item.occasion) meta.push("📌 المناسبة: " + item.occasion);
  if (item.source)   meta.push("📖 المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND);
  return lines.join("\n");
}

// ---- آية قرآنية ----
function formatAyah(item) {
  return [
    "📖 آية قرآنية",
    "",
    "﴿" + item.text + "﴾",
    "",
    "📍 " + item.surah + " · الآية " + item.ayah_number,
    "",
    SEP,
    BRAND,
  ].join("\n");
}

// ---- حديث نبوي ----
function formatHadith(item) {
  const lines = [
    "🕌 حديث نبوي",
    "",
    "قال رسول الله ﷺ: «" + item.text + "»",
    "",
  ];
  if (item.narrator) lines.push("👤 الراوي: " + item.narrator);
  if (item.source)   lines.push("📖 المصدر: " + item.source);
  lines.push("", SEP, BRAND);
  return lines.join("\n");
}

// ---- دعاء ----
function formatDua(item) {
  const lines = ["🤲 دعاء", "", item.text];
  const meta  = [];
  if (item.occasion) meta.push("📌 المناسبة: " + item.occasion);
  if (item.source)   meta.push("📖 المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND);
  return lines.join("\n");
}

// ---- سؤال المسابقة ----
function formatQuizQuestion(item) {
  return [
    "🏆 مسابقة إسلامية",
    "",
    "❓ " + item.question,
    "",
    "اختر الإجابة الصحيحة:",
  ].join("\n");
}

// ---- نتيجة المسابقة بعد الإجابة ----
function formatQuizResult(item, chosenIndex) {
  const isCorrect = chosenIndex === item.correct;
  const lines = [
    "🏆 مسابقة إسلامية",
    "",
    "❓ " + item.question,
    "",
  ];
  if (isCorrect) {
    lines.push("✅ الإجابة الصحيحة: " + item.options[item.correct]);
  } else {
    lines.push("❌ إجابتك: " + item.options[chosenIndex]);
    lines.push("✅ الصواب: " + item.options[item.correct]);
  }
  if (item.explanation) {
    lines.push("");
    lines.push("💡 " + item.explanation);
  }
  lines.push("", SEP, BRAND);
  return lines.join("\n");
}

// =============================================
// لوحات المفاتيح
// =============================================

function makeInlineKeyboard(buttons) {
  return { inline_keyboard: buttons };
}

function makeReplyKeyboard() {
  return {
    keyboard: [
      [{ text: "📿 أذكار الصباح" }, { text: "📿 أذكار المساء" }],
      [{ text: "🌙 أذكار النوم" },  { text: "📿 ذكر" }],
      [{ text: "📖 آية" },           { text: "🕌 حديث" }],
      [{ text: "🤲 دعاء" },          { text: "🧠 هل تعلم" }],
      [{ text: "🏆 مسابقة" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

// =============================================

module.exports = {
  getRandom,
  getRandomN,
  callTelegram,
  sendMessage,
  editMessage,
  editMessageInline,
  answerCallback,
  answerInlineQuery,
  formatDidYouKnow,
  formatThikr,
  formatGeneralThikr,
  formatAyah,
  formatHadith,
  formatDua,
  formatQuizQuestion,
  formatQuizResult,
  makeInlineKeyboard,
  makeReplyKeyboard,
};
