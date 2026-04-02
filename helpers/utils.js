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
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, arr.length));
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// =============================================
// تنسيق الرسائل
// =============================================

const SEP      = "ـــــــــــــــــــــــ";
const BRAND    = "🌙 أثر | @AtharIslamBot";
const ISTIGFAR = "أستغفر الله العظيم وأتوب إليه";

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
    ISTIGFAR,
  ].join("\n");
}

// ---- ذكر من أذكار الصباح/المساء/النوم (له count) ----
function formatThikr(item) {
  const lines = ["📿 ذكر", "", item.text];
  const meta  = [];
  if (item.count)  meta.push("🔢 التكرار: " + (item.count === 1 ? "مرة واحدة" : item.count + " مرات"));
  if (item.source) meta.push("📖 المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND, ISTIGFAR);
  return lines.join("\n");
}

// ---- ذكر عام (له occasion) ----
function formatGeneralThikr(item) {
  const lines = ["📿 ذكر", "", item.text];
  const meta  = [];
  if (item.occasion) meta.push("📌 المناسبة: " + item.occasion);
  if (item.source)   meta.push("📖 المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND, ISTIGFAR);
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
    ISTIGFAR,
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
  lines.push("", SEP, BRAND, ISTIGFAR);
  return lines.join("\n");
}

// ---- دعاء ----
function formatDua(item) {
  const lines = ["🤲 دعاء", "", item.text];
  const meta  = [];
  if (item.occasion) meta.push("📌 المناسبة: " + item.occasion);
  if (item.source)   meta.push("📖 المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND, ISTIGFAR);
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
// user: اختياري { id, first_name } من callbackQuery.from
function formatQuizResult(item, chosenIndex, user) {
  const isCorrect   = chosenIndex === item.correct;
  const userMention = user
    ? `<a href="tg://user?id=${user.id}">${escapeHtml(user.first_name)}</a>`
    : null;

  const lines = [
    "🏆 مسابقة إسلامية",
    "",
    "❓ " + escapeHtml(item.question),
    "",
  ];

  if (isCorrect) {
    lines.push("✅ الإجابة الصحيحة: " + escapeHtml(item.options[item.correct]));
    if (userMention) lines.push("🎉 أجاب: " + userMention);
  } else {
    if (userMention) {
      lines.push("❌ " + userMention + " أجاب: " + escapeHtml(item.options[chosenIndex]));
    } else {
      lines.push("❌ إجابتك: " + escapeHtml(item.options[chosenIndex]));
    }
    lines.push("✅ الصواب: " + escapeHtml(item.options[item.correct]));
  }

  if (item.explanation) {
    lines.push("");
    lines.push("💡 " + escapeHtml(item.explanation));
  }
  lines.push("", SEP, BRAND, ISTIGFAR);
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
      [{ text: "🏆 مسابقة" },        { text: "📿 تسبيح" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

// =============================================
// عدّاد التسبيح — ثوابت ودوال البناء
// =============================================

const TASBIH_TYPES = [
  { label: "سبحان الله" },
  { label: "الحمد لله" },
  { label: "الله أكبر" },
  { label: "لا إله إلا الله" },
  { label: "أستغفر الله" },
  { label: "لا حول ولا قوة إلا بالله" },
];

// تسبيح جماعي — النص
// counts: مصفوفة 6 أرقام، participants: مصفوفة أسماء
function buildGroupTasbihMessage(counts, participants) {
  const total = counts.reduce((s, v) => s + v, 0);
  const pList = participants && participants.length
    ? participants.map(escapeHtml).join("، ")
    : "لا أحد بعد";
  return [
    "📿 تسبيح جماعي",
    "",
    "سبّحوا معاً واكسبوا الأجر 🤝",
    "",
    "المجموع الكلي: " + total,
    "",
    "👥 المسبّحون: " + pList,
    "",
    SEP, BRAND, ISTIGFAR,
  ].join("\n");
}

// تسبيح جماعي — الأزرار
// كل callback_data تحمل جميع الأعداد: tasbih_g_TYPEIDX_C0_C1_C2_C3_C4_C5
function buildGroupTasbihKeyboard(counts) {
  const cs = counts.join("_");
  return makeInlineKeyboard(
    TASBIH_TYPES.map((t, i) => [
      { text: t.label + " · " + counts[i], callback_data: "tasbih_g_" + i + "_" + cs },
    ])
  );
}

// تسبيح فردي — النص
function buildSoloTasbihMessage(userId, firstName, counts) {
  const total       = counts.reduce((s, v) => s + v, 0);
  const userMention = `<a href="tg://user?id=${userId}">${escapeHtml(firstName)}</a>`;
  return [
    "📿 تسبيح فردي",
    "",
    "المسبّح: " + userMention,
    "",
    "المجموع: " + total,
    "",
    SEP, BRAND, ISTIGFAR,
  ].join("\n");
}

// تسبيح فردي — الأزرار
// كل callback_data: tasbih_s_TYPEIDX_USERID_C0_C1_C2_C3_C4_C5
// زر التصفير: tasbih_s_rst_USERID
function buildSoloTasbihKeyboard(userId, counts) {
  const cs   = counts.join("_");
  const rows = TASBIH_TYPES.map((t, i) => [
    { text: t.label + " · " + counts[i], callback_data: "tasbih_s_" + i + "_" + userId + "_" + cs },
  ]);
  rows.push([{ text: "🔄 تصفير العدّاد", callback_data: "tasbih_s_rst_" + userId }]);
  return makeInlineKeyboard(rows);
}

// قراءة مشاركي التسبيح الجماعي من نص الرسالة القديمة
function parseParticipants(text) {
  if (!text) return [];
  const line = text.split("\n").find((l) => l.startsWith("👥 المسبّحون:"));
  if (!line) return [];
  const after = line.slice("👥 المسبّحون:".length).trim();
  if (!after || after === "لا أحد بعد") return [];
  return after.split("، ").filter(Boolean);
}

// =============================================

module.exports = {
  getRandom,
  getRandomN,
  escapeHtml,
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
  TASBIH_TYPES,
  buildGroupTasbihMessage,
  buildGroupTasbihKeyboard,
  buildSoloTasbihMessage,
  buildSoloTasbihKeyboard,
  parseParticipants,
};
