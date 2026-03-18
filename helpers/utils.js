// =============================================
// مساعدات البوت الإسلامي — أثر | Athar
// =============================================

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function callTelegram(method, body) {
  const token = process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
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

async function answerCallback(callbackQueryId, text = "", showAlert = false) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

async function answerInlineQuery(inlineQueryId, results, cacheTime = 30) {
  return callTelegram("answerInlineQuery", {
    inline_query_id: inlineQueryId,
    results,
    cache_time: cacheTime,
  });
}

// =============================================
// تنسيق الرسائل
// =============================================

function formatDidYouKnow(item) {
  return `🧠 <b>هل تعلم؟</b>\n\n${item.text}\n\n📚 <b>التصنيف:</b> ${item.category}`;
}

function formatThikr(item) {
  let msg = `📿 <b>ذكر</b>\n\n${item.text}`;
  if (item.count) msg += `\n\n🔢 <b>العدد:</b> ${item.count} ${item.count === 1 ? "مرة" : "مرات"}`;
  if (item.source) msg += `\n📖 <b>المصدر:</b> ${item.source}`;
  return msg;
}

function formatGeneralThikr(item) {
  let msg = `📿 <b>ذكر — ${item.occasion}</b>\n\n${item.text}`;
  if (item.source) msg += `\n\n📖 <b>المصدر:</b> ${item.source}`;
  return msg;
}

function formatAyah(item) {
  return `📖 <b>آية قرآنية</b>\n\n﴿${item.text}﴾\n\n📍 <b>سورة ${item.surah} - الآية ${item.ayah_number}</b>`;
}

function formatHadith(item) {
  let msg = `🕌 <b>حديث نبوي</b>\n\nقال رسول الله ﷺ: "${item.text}"`;
  if (item.narrator) msg += `\n\n👤 <b>الراوي:</b> ${item.narrator}`;
  if (item.source) msg += `\n📖 <b>المصدر:</b> ${item.source}`;
  return msg;
}

function formatDua(item) {
  let msg = `🤲 <b>دعاء — ${item.occasion}</b>\n\n${item.text}`;
  if (item.source) msg += `\n\n📖 <b>المصدر:</b> ${item.source}`;
  return msg;
}

function formatQuizQuestion(item) {
  const optionEmojis = ["🅰️", "🅱️", "🅲️", "🅳️"];
  const opts = item.options.map((o, i) => `${optionEmojis[i]} ${o}`).join("\n");
  return `🏆 <b>مسابقة إسلامية</b>\n\n❓ ${item.question}\n\n${opts}\n\n<i>اختر الإجابة الصحيحة:</i>`;
}

function makeInlineKeyboard(buttons) {
  return { inline_keyboard: buttons };
}

function makeReplyKeyboard() {
  return {
    keyboard: [
      [{ text: "📿 أذكار الصباح" }, { text: "📿 أذكار المساء" }],
      [{ text: "🧠 هل تعلم" }, { text: "🏆 مسابقة" }],
      [{ text: "📿 أذكار النوم" }, { text: "🤲 دعاء" }],
      [{ text: "📖 آية" }, { text: "🕌 حديث" }],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}

module.exports = {
  getRandom,
  getRandomN,
  callTelegram,
  sendMessage,
  editMessage,
  answerCallback,
  answerInlineQuery,
  formatDidYouKnow,
  formatThikr,
  formatGeneralThikr,
  formatAyah,
  formatHadith,
  formatDua,
  formatQuizQuestion,
  makeInlineKeyboard,
  makeReplyKeyboard,
};
