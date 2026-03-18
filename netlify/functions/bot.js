// =============================================
// بوت أثر | Athar — الـ Webhook الرئيسي
// Netlify Function تستقبل كل تحديثات تيليغرام
// =============================================

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ملفات البيانات
const dataDir = path.join(__dirname, "../../data");

function loadData(filename) {
  try {
    const raw = readFileSync(path.join(dataDir, filename), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// مساعدات
import {
  getRandom,
  getRandomN,
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
} from "../../helpers/utils.js";

// =============================================
// Handler الرئيسي
// =============================================
export const handler = async (event) => {
  // تيليغرام يرسل POST فقط
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "Bot is running ✅" };
  }

  try {
    const update = JSON.parse(event.body || "{}");
    await handleUpdate(update);
  } catch (err) {
    console.error("Handler error:", err);
  }

  // دائماً نرجع 200 عشان تيليغرام ما يعيد المحاولة
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

// =============================================
// توزيع التحديثات
// =============================================
async function handleUpdate(update) {
  // رسالة عادية
  if (update.message) {
    await handleMessage(update.message);
    return;
  }
  // ضغطة زر inline
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }
  // inline query (المستخدم يكتب @Bot بمحادثة ثانية)
  if (update.inline_query) {
    await handleInlineQuery(update.inline_query);
    return;
  }
  // البوت انضاف أو اتحذف من مجموعة
  if (update.my_chat_member) {
    await handleMyChatMember(update.my_chat_member);
    return;
  }
}

// =============================================
// معالجة الرسائل
// =============================================
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // أوامر /start و /help
  if (text === "/start" || text.startsWith("/start ")) {
    await handleStart(chatId);
    return;
  }
  if (text === "/help") {
    await handleHelp(chatId);
    return;
  }

  // ========================
  // هل تعلم
  // ========================
  if (
    text === "/هل_تعلم" ||
    text === "/didyouknow" ||
    text === "🧠 هل تعلم"
  ) {
    await handleDidYouKnow(chatId);
    return;
  }

  // ========================
  // الأذكار
  // ========================
  if (text === "/اذكار_الصباح" || text === "/morning" || text === "📿 أذكار الصباح") {
    await handleAzkarMorning(chatId);
    return;
  }
  if (text === "/اذكار_المساء" || text === "/evening" || text === "📿 أذكار المساء") {
    await handleAzkarEvening(chatId);
    return;
  }
  if (text === "/اذكار_النوم" || text === "/sleep" || text === "📿 أذكار النوم") {
    await handleAzkarSleep(chatId);
    return;
  }
  if (text === "/ذكر" || text === "/thikr") {
    await handleThikr(chatId);
    return;
  }

  // ========================
  // أدعية وآيات وأحاديث
  // ========================
  if (text === "/دعاء" || text === "/dua" || text === "🤲 دعاء") {
    await handleDua(chatId);
    return;
  }
  if (text === "/آية" || text === "/ayah" || text === "📖 آية") {
    await handleAyah(chatId);
    return;
  }
  if (text === "/حديث" || text === "/hadith" || text === "🕌 حديث") {
    await handleHadith(chatId);
    return;
  }

  // ========================
  // المسابقة
  // ========================
  if (text === "/مسابقة" || text === "/quiz" || text === "🏆 مسابقة") {
    await handleQuiz(chatId);
    return;
  }
}

// =============================================
// معالجة Callback Queries (ضغطات الأزرار)
// =============================================
async function handleCallbackQuery(cq) {
  const chatId = cq.message?.chat.id;
  const msgId = cq.message?.message_id;
  const data = cq.data || "";

  // ---- هل تعلم: معلومة أخرى ----
  if (data === "didyouknow_next") {
    const items = loadData("did-you-know.json");
    const item = getRandom(items);
    const text = formatDidYouKnow(item);
    const kb = makeInlineKeyboard([[{ text: "معلومة أخرى 🔄", callback_data: "didyouknow_next" }]]);
    await answerCallback(cq.id);
    await editMessage(chatId, msgId, text, { reply_markup: kb });
    return;
  }

  // ---- مسابقة: سؤال آخر ----
  if (data === "quiz_next") {
    await answerCallback(cq.id);
    const items = loadData("quiz.json");
    const item = getRandom(items);
    const text = formatQuizQuestion(item);
    const kb = buildQuizKeyboard(item);
    await editMessage(chatId, msgId, text, { reply_markup: kb });
    return;
  }

  // ---- مسابقة: اختيار إجابة ----
  if (data.startsWith("quiz_")) {
    await handleQuizAnswer(cq, data);
    return;
  }

  // ---- ذكر آخر / دعاء آخر / آية أخرى / حديث آخر ----
  if (data === "thikr_next") {
    await answerCallback(cq.id);
    const items = loadData("azkar-general.json");
    const item = getRandom(items);
    const text = formatGeneralThikr(item);
    const kb = makeInlineKeyboard([[{ text: "ذكر آخر 🔄", callback_data: "thikr_next" }]]);
    await editMessage(chatId, msgId, text, { reply_markup: kb });
    return;
  }
  if (data === "dua_next") {
    await answerCallback(cq.id);
    const items = loadData("duas.json");
    const item = getRandom(items);
    const text = formatDua(item);
    const kb = makeInlineKeyboard([[{ text: "دعاء آخر 🔄", callback_data: "dua_next" }]]);
    await editMessage(chatId, msgId, text, { reply_markup: kb });
    return;
  }
  if (data === "ayah_next") {
    await answerCallback(cq.id);
    const items = loadData("ayat.json");
    const item = getRandom(items);
    const text = formatAyah(item);
    const kb = makeInlineKeyboard([[{ text: "آية أخرى 🔄", callback_data: "ayah_next" }]]);
    await editMessage(chatId, msgId, text, { reply_markup: kb });
    return;
  }
  if (data === "hadith_next") {
    await answerCallback(cq.id);
    const items = loadData("ahadith.json");
    const item = getRandom(items);
    const text = formatHadith(item);
    const kb = makeInlineKeyboard([[{ text: "حديث آخر 🔄", callback_data: "hadith_next" }]]);
    await editMessage(chatId, msgId, text, { reply_markup: kb });
    return;
  }

  // افتراضي
  await answerCallback(cq.id);
}

// =============================================
// معالجة إجابة المسابقة
// =============================================
async function handleQuizAnswer(cq, data) {
  // data format: quiz_{quizId}_{chosenIndex}
  const parts = data.split("_");
  // quiz_<id>_<chosen>
  const quizId = parseInt(parts[1]);
  const chosen = parseInt(parts[2]);

  const items = loadData("quiz.json");
  const item = items.find((q) => q.id === quizId);

  if (!item) {
    await answerCallback(cq.id, "انتهت صلاحية السؤال", true);
    return;
  }

  const isCorrect = chosen === item.correct;
  const explanation = item.explanation || "";
  let alertText;
  if (isCorrect) {
    alertText = `✅ إجابة صحيحة! أحسنت 🎉\n\n${explanation}`;
  } else {
    alertText = `❌ إجابة خاطئة!\n\nالجواب الصحيح: ${item.options[item.correct]}\n\n${explanation}`;
  }
  // Telegram يرفض نص الـ alert إذا تجاوز 200 حرف
  if (alertText.length > 200) alertText = alertText.substring(0, 197) + "...";

  await answerCallback(cq.id, alertText, true);

  // تحديث الرسالة بزر "سؤال آخر"
  const chatId = cq.message?.chat.id;
  const msgId = cq.message?.message_id;
  if (chatId && msgId) {
    const optionEmojis = ["🅰️", "🅱️", "🅲️", "🅳️"];
    const resultEmoji = isCorrect ? "✅" : "❌";
    const opts = item.options.map((o, i) => {
      const mark = i === item.correct ? "✅" : chosen === i ? "❌" : "◻️";
      return `${optionEmojis[i]} ${o} ${mark}`;
    }).join("\n");

    const newText = `🏆 <b>مسابقة إسلامية</b>\n\n❓ ${item.question}\n\n${opts}\n\n${resultEmoji} ${isCorrect ? "إجابة صحيحة!" : `الجواب: ${item.options[item.correct]}`}`;
    const kb = makeInlineKeyboard([[{ text: "سؤال آخر 🔄", callback_data: "quiz_next" }]]);
    await editMessage(chatId, msgId, newText, { reply_markup: kb });
  }
}

// =============================================
// Inline Queries
// =============================================
async function handleInlineQuery(iq) {
  const query = (iq.query || "").trim().toLowerCase();
  const iqId = iq.id;

  // تحديد نوع المحتوى حسب الكلمة
  if (!query || query.includes("هل تعلم") || query.includes("معلومة")) {
    await serveDidYouKnowInline(iqId);
  } else if (query.includes("صباح") || query.includes("morning")) {
    await serveAzkarInline(iqId, "azkar-morning.json", "📿 أذكار الصباح");
  } else if (query.includes("مساء") || query.includes("evening")) {
    await serveAzkarInline(iqId, "azkar-evening.json", "📿 أذكار المساء");
  } else if (query.includes("نوم") || query.includes("sleep")) {
    await serveAzkarInline(iqId, "azkar-sleep.json", "📿 أذكار النوم");
  } else if (query.includes("دعاء") || query.includes("dua")) {
    await serveDuasInline(iqId);
  } else if (query.includes("آية") || query.includes("ayah") || query.includes("قرآن")) {
    await serveAyatInline(iqId);
  } else if (query.includes("حديث") || query.includes("hadith")) {
    await serveAhadithInline(iqId);
  } else if (query.includes("مسابقة") || query.includes("quiz")) {
    await serveQuizInline(iqId);
  } else if (query.includes("ذكر") || query.includes("thikr") || query.includes("اذكار")) {
    await serveThikrInline(iqId);
  } else {
    // افتراضي: اعرض خيارات متنوعة
    await serveDefaultInline(iqId);
  }
}

// ---- Inline Helpers ----

function makeArticleResult(id, title, description, messageText) {
  return {
    type: "article",
    id: String(id),
    title,
    description,
    input_message_content: {
      message_text: messageText,
      parse_mode: "HTML",
    },
  };
}

async function serveDidYouKnowInline(iqId) {
  const items = loadData("did-you-know.json");
  const selected = getRandomN(items, 8);
  const results = selected.map((item) =>
    makeArticleResult(
      item.id,
      `🧠 ${item.category}`,
      item.text.substring(0, 80),
      formatDidYouKnow(item)
    )
  );
  await answerInlineQuery(iqId, results);
}

async function serveAzkarInline(iqId, filename, title) {
  const items = loadData(filename);
  const selected = getRandomN(items, 8);
  const results = selected.map((item, i) =>
    makeArticleResult(
      `az_${i}`,
      title,
      item.text.substring(0, 80),
      formatThikr(item)
    )
  );
  await answerInlineQuery(iqId, results);
}

async function serveDuasInline(iqId) {
  const items = loadData("duas.json");
  const selected = getRandomN(items, 8);
  const results = selected.map((item) =>
    makeArticleResult(
      `dua_${item.id}`,
      `🤲 ${item.occasion}`,
      item.text.substring(0, 80),
      formatDua(item)
    )
  );
  await answerInlineQuery(iqId, results);
}

async function serveAyatInline(iqId) {
  const items = loadData("ayat.json");
  const selected = getRandomN(items, 8);
  const results = selected.map((item) =>
    makeArticleResult(
      `ay_${item.id}`,
      `📖 سورة ${item.surah} - آية ${item.ayah_number}`,
      item.text.substring(0, 80),
      formatAyah(item)
    )
  );
  await answerInlineQuery(iqId, results);
}

async function serveAhadithInline(iqId) {
  const items = loadData("ahadith.json");
  const selected = getRandomN(items, 8);
  const results = selected.map((item) =>
    makeArticleResult(
      `hd_${item.id}`,
      `🕌 ${item.source}`,
      item.text.substring(0, 80),
      formatHadith(item)
    )
  );
  await answerInlineQuery(iqId, results);
}

async function serveThikrInline(iqId) {
  const items = loadData("azkar-general.json");
  const selected = getRandomN(items, 8);
  const results = selected.map((item) =>
    makeArticleResult(
      `th_${item.id}`,
      `📿 ${item.occasion}`,
      item.text.substring(0, 80),
      formatGeneralThikr(item)
    )
  );
  await answerInlineQuery(iqId, results);
}

async function serveQuizInline(iqId) {
  const items = loadData("quiz.json");
  const selected = getRandomN(items, 8);
  const results = selected.map((item) =>
    makeArticleResult(
      `qz_${item.id}`,
      `🏆 ${item.category}`,
      item.question.substring(0, 80),
      formatQuizQuestion(item)
    )
  );
  await answerInlineQuery(iqId, results);
}

async function serveDefaultInline(iqId) {
  const didYouKnow = loadData("did-you-know.json");
  const duas = loadData("duas.json");
  const ayat = loadData("ayat.json");

  const dyk1 = getRandom(didYouKnow);
  const dyk2 = getRandom(didYouKnow);
  const dua1 = getRandom(duas);
  const dua2 = getRandom(duas);
  const ayah1 = getRandom(ayat);

  const results = [
    makeArticleResult("d1", `🧠 ${dyk1.category}`, "هل تعلم؟", formatDidYouKnow(dyk1)),
    makeArticleResult("d2", `🤲 ${dua1.occasion}`, "دعاء", formatDua(dua1)),
    makeArticleResult("d3", `📖 آية قرآنية`, "آية كريمة", formatAyah(ayah1)),
    makeArticleResult("d4", `🧠 ${dyk2.category}`, "معلومة إسلامية", formatDidYouKnow(dyk2)),
    makeArticleResult("d5", `🤲 ${dua2.occasion}`, "دعاء من السنة", formatDua(dua2)),
  ];
  await answerInlineQuery(iqId, results);
}

// =============================================
// Handlers الأوامر
// =============================================

async function handleStart(chatId) {
  const text = `﷽

✨ <b>أهلاً بك في أثر — رفيقك الإيماني اليومي</b>

❝ وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ ❞

اختر من القائمة أو اكتب @AtharIslamBot في أي محادثة:

📿 <b>الأذكـار</b> — صباح · مساء · نوم
📖 <b>القـرآن</b> — آيات تنير قلبك
🕌 <b>الحديث</b> — من كلام المصطفى ﷺ
🤲 <b>الدعـاء</b> — أدعية لكل حال
🧠 <b>هل تعلم</b> — حقائق تزيد بصيرتك
🏆 <b>مسابقة</b> — اختبر معرفتك الدينية

─────────────────
🌙 <b>أثر</b> · اترك أثراً في يومك`;

  await sendMessage(chatId, text, { reply_markup: makeReplyKeyboard() });
}

async function handleHelp(chatId) {
  const text = `📋 <b>قائمة الأوامر</b>

📿 <b>الأذكار:</b>
/اذكار_الصباح أو /morning — أذكار الصباح
/اذكار_المساء أو /evening — أذكار المساء
/اذكار_النوم أو /sleep — أذكار النوم
/ذكر أو /thikr — ذكر عشوائي

🤲 <b>الأدعية والآيات:</b>
/دعاء أو /dua — دعاء عشوائي
/آية أو /ayah — آية قرآنية عشوائية
/حديث أو /hadith — حديث نبوي

🧠 <b>هل تعلم:</b>
/هل_تعلم أو /didyouknow — معلومة دينية

🏆 <b>المسابقات:</b>
/مسابقة أو /quiz — سؤال عشوائي

<i>يمكنك أيضاً كتابة @AtharIslamBot في أي محادثة للاستخدام inline!</i>`;

  await sendMessage(chatId, text, { reply_markup: makeReplyKeyboard() });
}

async function handleDidYouKnow(chatId) {
  const items = loadData("did-you-know.json");
  const item = getRandom(items);
  const text = formatDidYouKnow(item);
  const kb = makeInlineKeyboard([[{ text: "معلومة أخرى 🔄", callback_data: "didyouknow_next" }]]);
  await sendMessage(chatId, text, { reply_markup: kb });
}

async function handleAzkarMorning(chatId) {
  const items = loadData("azkar-morning.json");
  const chunks = chunkAzkar(items, 10);
  const title = "☀️ <b>أذكار الصباح</b>\n\nاللهم بك أصبحنا وبك أمسينا...\n\n";

  for (let i = 0; i < chunks.length; i++) {
    const part = i === 0 ? title : `<b>تابع — أذكار الصباح (${i + 1})</b>\n\n`;
    const body = chunks[i].map((z, j) => {
      let line = `${i * 10 + j + 1}. ${z.text}`;
      if (z.count) line += `\n   🔢 ${z.count} ${z.count === 1 ? "مرة" : "مرات"}`;
      if (z.source) line += `\n   📖 ${z.source}`;
      return line;
    }).join("\n\n");
    await sendMessage(chatId, part + body);
    if (i < chunks.length - 1) await delay(300);
  }
}

async function handleAzkarEvening(chatId) {
  const items = loadData("azkar-evening.json");
  const chunks = chunkAzkar(items, 10);
  const title = "🌆 <b>أذكار المساء</b>\n\nاللهم بك أمسينا وبك أصبحنا...\n\n";

  for (let i = 0; i < chunks.length; i++) {
    const part = i === 0 ? title : `<b>تابع — أذكار المساء (${i + 1})</b>\n\n`;
    const body = chunks[i].map((z, j) => {
      let line = `${i * 10 + j + 1}. ${z.text}`;
      if (z.count) line += `\n   🔢 ${z.count} ${z.count === 1 ? "مرة" : "مرات"}`;
      if (z.source) line += `\n   📖 ${z.source}`;
      return line;
    }).join("\n\n");
    await sendMessage(chatId, part + body);
    if (i < chunks.length - 1) await delay(300);
  }
}

async function handleAzkarSleep(chatId) {
  const items = loadData("azkar-sleep.json");
  const chunks = chunkAzkar(items, 10);
  const title = "🌙 <b>أذكار النوم</b>\n\nبسمك اللهم أموت وأحيا...\n\n";

  for (let i = 0; i < chunks.length; i++) {
    const part = i === 0 ? title : `<b>تابع — أذكار النوم (${i + 1})</b>\n\n`;
    const body = chunks[i].map((z, j) => {
      let line = `${i * 10 + j + 1}. ${z.text}`;
      if (z.count) line += `\n   🔢 ${z.count} ${z.count === 1 ? "مرة" : "مرات"}`;
      if (z.source) line += `\n   📖 ${z.source}`;
      return line;
    }).join("\n\n");
    await sendMessage(chatId, part + body);
    if (i < chunks.length - 1) await delay(300);
  }
}

async function handleThikr(chatId) {
  const items = loadData("azkar-general.json");
  const item = getRandom(items);
  const text = formatGeneralThikr(item);
  const kb = makeInlineKeyboard([[{ text: "ذكر آخر 🔄", callback_data: "thikr_next" }]]);
  await sendMessage(chatId, text, { reply_markup: kb });
}

async function handleDua(chatId) {
  const items = loadData("duas.json");
  const item = getRandom(items);
  const text = formatDua(item);
  const kb = makeInlineKeyboard([[{ text: "دعاء آخر 🔄", callback_data: "dua_next" }]]);
  await sendMessage(chatId, text, { reply_markup: kb });
}

async function handleAyah(chatId) {
  const items = loadData("ayat.json");
  const item = getRandom(items);
  const text = formatAyah(item);
  const kb = makeInlineKeyboard([[{ text: "آية أخرى 🔄", callback_data: "ayah_next" }]]);
  await sendMessage(chatId, text, { reply_markup: kb });
}

async function handleHadith(chatId) {
  const items = loadData("ahadith.json");
  const item = getRandom(items);
  const text = formatHadith(item);
  const kb = makeInlineKeyboard([[{ text: "حديث آخر 🔄", callback_data: "hadith_next" }]]);
  await sendMessage(chatId, text, { reply_markup: kb });
}

async function handleQuiz(chatId) {
  const items = loadData("quiz.json");
  const item = getRandom(items);
  const text = formatQuizQuestion(item);
  const kb = buildQuizKeyboard(item);
  await sendMessage(chatId, text, { reply_markup: kb });
}

// =============================================
// بناء لوحة مفاتيح المسابقة
// =============================================
function buildQuizKeyboard(item) {
  const optionEmojis = ["🅰️", "🅱️", "🅲️", "🅳️"];
  const rows = item.options.map((opt, i) => [
    {
      text: `${optionEmojis[i]} ${opt}`,
      callback_data: `quiz_${item.id}_${i}`,
    },
  ]);
  return makeInlineKeyboard(rows);
}

// =============================================
// انضمام/مغادرة المجموعات
// NOTE: Netlify Functions لا تدعم الكتابة على الملفات في runtime.
// لإدارة المجموعات استخدم متغير البيئة GROUP_CHAT_IDS
// (مفصولة بفاصلة) أو أضف IDs يدوياً في scheduled-azkar.js
// =============================================
async function handleMyChatMember(update) {
  const chat = update.chat;
  const newStatus = update.new_chat_member?.status;

  if (chat.type === "group" || chat.type === "supergroup") {
    if (newStatus === "member" || newStatus === "administrator") {
      // البوت انضاف للمجموعة
      await sendMessage(
        chat.id,
        `﷽\n\n🌙 أهلاً بكم مع <b>أثر</b> — رفيقكم الإيماني اليومي!\n\nسأشارككم الأذكار والأدعية والآيات والمعلومات الإسلامية.\n\nاكتبوا /start لمعرفة الأوامر.`
      );
      console.log(`Bot added to group: ${chat.id} — ${chat.title}`);
    } else if (newStatus === "kicked" || newStatus === "left") {
      console.log(`Bot removed from group: ${chat.id} — ${chat.title}`);
    }
  }
}

// =============================================
// مساعدات داخلية
// =============================================
function chunkAzkar(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
