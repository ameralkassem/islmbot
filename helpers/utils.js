// =============================================
// مساعدات البوت الإسلامي — أثر | Athar
// =============================================

/**
 * اختيار عنصر عشوائي من مصفوفة
 */
export function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * اختيار N عناصر عشوائية بدون تكرار
 */
export function getRandomN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/**
 * إرسال طلب لـ Telegram API
 */
export async function callTelegram(method, body) {
  const token = process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * إرسال رسالة نصية
 */
export async function sendMessage(chatId, text, extra = {}) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

/**
 * تعديل رسالة موجودة
 */
export async function editMessage(chatId, messageId, text, extra = {}) {
  return callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

/**
 * الرد على callback query (لإزالة اللودينغ من الزر)
 */
export async function answerCallback(callbackQueryId, text = "", showAlert = false) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

/**
 * الرد على inline query
 */
export async function answerInlineQuery(inlineQueryId, results, cacheTime = 30) {
  return callTelegram("answerInlineQuery", {
    inline_query_id: inlineQueryId,
    results,
    cache_time: cacheTime,
  });
}

// =============================================
// تنسيق الرسائل
// =============================================

export function formatDidYouKnow(item) {
  return `🧠 <b>هل تعلم؟</b>\n\n${item.text}\n\n📚 <b>التصنيف:</b> ${item.category}`;
}

export function formatThikr(item) {
  let msg = `📿 <b>ذكر</b>\n\n${item.text}`;
  if (item.count) msg += `\n\n🔢 <b>العدد:</b> ${item.count} ${item.count === 1 ? "مرة" : "مرات"}`;
  if (item.source) msg += `\n📖 <b>المصدر:</b> ${item.source}`;
  return msg;
}

export function formatGeneralThikr(item) {
  let msg = `📿 <b>ذكر — ${item.occasion}</b>\n\n${item.text}`;
  if (item.source) msg += `\n\n📖 <b>المصدر:</b> ${item.source}`;
  return msg;
}

export function formatAyah(item) {
  return `📖 <b>آية قرآنية</b>\n\n﴿${item.text}﴾\n\n📍 <b>سورة ${item.surah} - الآية ${item.ayah_number}</b>`;
}

export function formatHadith(item) {
  let msg = `🕌 <b>حديث نبوي</b>\n\nقال رسول الله ﷺ: "${item.text}"`;
  if (item.narrator) msg += `\n\n👤 <b>الراوي:</b> ${item.narrator}`;
  if (item.source) msg += `\n📖 <b>المصدر:</b> ${item.source}`;
  return msg;
}

export function formatDua(item) {
  let msg = `🤲 <b>دعاء — ${item.occasion}</b>\n\n${item.text}`;
  if (item.source) msg += `\n\n📖 <b>المصدر:</b> ${item.source}`;
  return msg;
}

export function formatAzkarSection(title, items) {
  const lines = items.map((z, i) => {
    let line = `${i + 1}. ${z.text}`;
    if (z.count) line += `\n   🔢 ${z.count} ${z.count === 1 ? "مرة" : "مرات"}`;
    if (z.source) line += `\n   📖 ${z.source}`;
    return line;
  });
  return `${title}\n\n${lines.join("\n\n")}`;
}

export function formatQuizQuestion(item) {
  const optionEmojis = ["🅰️", "🅱️", "🅲️", "🅳️"];
  const opts = item.options.map((o, i) => `${optionEmojis[i]} ${o}`).join("\n");
  return `🏆 <b>مسابقة إسلامية</b>\n\n❓ ${item.question}\n\n${opts}\n\n<i>اختر الإجابة الصحيحة:</i>`;
}

// =============================================
// Inline Keyboard Builders
// =============================================

export function makeInlineKeyboard(buttons) {
  // buttons: array of rows, each row is array of {text, callback_data}
  return { inline_keyboard: buttons };
}

export function makeReplyKeyboard() {
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

// =============================================
// تقسيم النص الطويل إلى أجزاء
// =============================================
export function splitMessage(text, maxLen = 4000) {
  if (text.length <= maxLen) return [text];
  const parts = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > maxLen) {
      parts.push(current.trim());
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) parts.push(current.trim());
  return parts;
}
