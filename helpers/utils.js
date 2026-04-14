// =============================================
// مساعدات البوت الإسلامي — الأثر | Athar
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

function getUserDisplayName(user) {
  if (!user) return "مستخدم";
  const parts = [];
  if (user.first_name) parts.push(user.first_name);
  if (user.last_name)  parts.push(user.last_name);
  if (parts.length === 0) {
    if (user.username) return user.username;
    return "مستخدم";
  }
  return parts.join(" ");
}

function getUserMention(user) {
  if (!user) return "مستخدم";
  const name = escapeHtml(getUserDisplayName(user));
  return `<a href="tg://user?id=${user.id}">${name}</a>`;
}

// أزرار مخصصة من متغير بيئة CUSTOM_BUTTONS
function getCustomButtons() {
  try {
    const buttons = JSON.parse(process.env.CUSTOM_BUTTONS || "[]");
    if (!Array.isArray(buttons) || buttons.length === 0) return [];
    return buttons.map((btn) => [{ text: btn.text, url: btn.url }]);
  } catch {
    return [];
  }
}

// =============================================
// ثوابت التنسيق
// =============================================

const SEP      = "ـــــــــــــــــــــــ";
const BRAND    = "الأثر | @AtharIslamBot";
const ISTIGFAR = "أستغفر الله العظيم وأتوب إليه";

// =============================================
// تنسيق الرسائل
// =============================================

// ---- هل تعلم ----
function formatDidYouKnow(item) {
  return [
    "هل تعلم .",
    "",
    item.text,
    "",
    "التصنيف: " + item.category,
    "",
    SEP,
    BRAND,
    ISTIGFAR,
  ].join("\n");
}

// ---- ذكر من أذكار الصباح/المساء/النوم ----
function formatThikr(item) {
  const lines = ["ذكر .", "", item.text];
  const meta  = [];
  if (item.count)  meta.push("التكرار: " + (item.count === 1 ? "مرة واحدة" : item.count + " مرات"));
  if (item.source) meta.push("المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND, ISTIGFAR);
  return lines.join("\n");
}

// ---- ذكر عام ----
function formatGeneralThikr(item) {
  const lines = ["ذكر .", "", item.text];
  const meta  = [];
  if (item.occasion) meta.push("المناسبة: " + item.occasion);
  if (item.source)   meta.push("المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND, ISTIGFAR);
  return lines.join("\n");
}

// ---- آية قرآنية ----
function formatAyah(item) {
  return [
    "آية .",
    "",
    "﴿" + item.text + "﴾",
    "",
    item.surah + " · " + item.ayah_number,
    "",
    SEP,
    BRAND,
    ISTIGFAR,
  ].join("\n");
}

// ---- حديث نبوي ----
function formatHadith(item) {
  const lines = [
    "حديث .",
    "",
    "قال رسول الله ﷺ:",
    "«" + item.text + "»",
    "",
  ];
  if (item.narrator) lines.push("الراوي: " + item.narrator);
  if (item.source)   lines.push("المصدر: " + item.source);
  lines.push("", SEP, BRAND, ISTIGFAR);
  return lines.join("\n");
}

// ---- دعاء ----
function formatDua(item) {
  const lines = ["دعاء .", "", item.text];
  const meta  = [];
  if (item.occasion) meta.push("المناسبة: " + item.occasion);
  if (item.source)   meta.push("المصدر: " + item.source);
  if (meta.length) { lines.push(""); lines.push(...meta); }
  lines.push("", SEP, BRAND, ISTIGFAR);
  return lines.join("\n");
}

// ---- سؤال المسابقة ----
function formatQuizQuestion(item) {
  return [
    "مسابقة .",
    "",
    item.question,
    "",
    "اختر الإجابة:",
  ].join("\n");
}

// ---- نتيجة المسابقة بعد الإجابة ----
function formatQuizResult(item, chosenIndex, user) {
  const isCorrect   = chosenIndex === item.correct;
  const userMention = user ? getUserMention(user) : null;

  const lines = [
    "مسابقة .",
    "",
    escapeHtml(item.question),
    "",
  ];

  if (isCorrect) {
    lines.push("إجابة صحيحة");
    if (userMention) lines.push(userMention);
    lines.push("الإجابة: " + escapeHtml(item.options[item.correct]));
  } else {
    lines.push("إجابة خاطئة");
    if (userMention) lines.push(userMention);
    lines.push("أجاب: " + escapeHtml(item.options[chosenIndex]));
    lines.push("الصواب: " + escapeHtml(item.options[item.correct]));
  }

  if (item.explanation) {
    lines.push("");
    lines.push(escapeHtml(item.explanation));
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
      [{ text: "أذكار الصباح" }, { text: "أذكار المساء" }],
      [{ text: "أذكار النوم" },  { text: "ذكر" }],
      [{ text: "آية" },          { text: "حديث" }],
      [{ text: "دعاء" },         { text: "هل تعلم" }],
      [{ text: "مسابقة" },       { text: "تسبيح" }],
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
function buildGroupTasbihMessage(counts, participants) {
  const total = counts.reduce((s, v) => s + v, 0);
  const lines = [
    "تسبيح جماعي .",
    "",
    "المجموع: " + total,
    "",
    "المسبّحون:",
  ];
  if (participants && participants.length) {
    participants.forEach((name) => lines.push("· " + escapeHtml(name)));
  } else {
    lines.push("لا أحد بعد");
  }
  lines.push("", SEP, BRAND, ISTIGFAR);
  return lines.join("\n");
}

// تسبيح جماعي — الأزرار
function buildGroupTasbihKeyboard(counts) {
  const cs = counts.join("_");
  return makeInlineKeyboard(
    TASBIH_TYPES.map((t, i) => [
      { text: t.label + " · " + counts[i], callback_data: "tasbih_g_" + i + "_" + cs },
    ])
  );
}

// تسبيح فردي — النص
function buildSoloTasbihMessage(userId, displayName, counts) {
  const total       = counts.reduce((s, v) => s + v, 0);
  const userMention = `<a href="tg://user?id=${userId}">${escapeHtml(displayName)}</a>`;
  return [
    "تسبيح فردي .",
    "",
    "المسبّح: " + userMention,
    "المجموع: " + total,
    "",
    SEP, BRAND, ISTIGFAR,
  ].join("\n");
}

// تسبيح فردي — الأزرار
function buildSoloTasbihKeyboard(userId, counts) {
  const cs   = counts.join("_");
  const rows = TASBIH_TYPES.map((t, i) => [
    { text: t.label + " · " + counts[i], callback_data: "tasbih_s_" + i + "_" + userId + "_" + cs },
  ]);
  rows.push([{ text: "تصفير العدّاد", callback_data: "tasbih_s_rst_" + userId }]);
  return makeInlineKeyboard(rows);
}

// قراءة مشاركي التسبيح الجماعي من نص الرسالة
function parseParticipants(text) {
  if (!text) return [];
  const textLines = text.split("\n");

  // يدعم التنسيق الجديد (بدون إيموجي) والقديم (مع إيموجي)
  const headerIdx = textLines.findIndex(
    (l) => l === "المسبّحون:" || l.startsWith("👥 المسبّحون:")
  );
  if (headerIdx === -1) return [];

  // التنسيق القديم — الأسماء في نفس السطر بعد النقطتين
  const after = textLines[headerIdx].includes(":")
    ? textLines[headerIdx].split(":").slice(1).join(":").trim()
    : "";
  if (after && after !== "لا أحد بعد") {
    return after.split("، ").filter(Boolean);
  }

  // التنسيق الجديد — كل اسم بسطر مع · أو •
  const participants = [];
  for (let i = headerIdx + 1; i < textLines.length; i++) {
    const line = textLines[i].trim();
    if (line.startsWith("· ") || line.startsWith("• ")) {
      participants.push(line.slice(2).trim());
    } else if (line === "" || line.startsWith("ـ")) {
      break;
    }
  }
  return participants;
}

// =============================================

module.exports = {
  getRandom,
  getRandomN,
  escapeHtml,
  getUserDisplayName,
  getUserMention,
  getCustomButtons,
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
