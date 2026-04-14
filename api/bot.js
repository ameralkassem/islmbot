// =============================================
// بوت الأثر — الـ Webhook الرئيسي
// Vercel Serverless Function
// =============================================

"use strict";

const fs   = require("fs");
const path = require("path");

const {
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
  escapeHtml,
  getUserDisplayName,
  getCustomButtons,
  TASBIH_TYPES,
  buildGroupTasbihMessage,
  buildGroupTasbihKeyboard,
  buildSoloTasbihMessage,
  buildSoloTasbihKeyboard,
  parseParticipants,
} = require("../helpers/utils");

const { addChatId, removeChatId } = require("../helpers/redis");

const dataDir = path.resolve(__dirname, "../data");

const SEP      = "ـــــــــــــــــــــــ";
const BRAND    = "الأثر | @AtharIslamBot";
const ISTIGFAR = "أستغفر الله العظيم وأتوب إليه";

// استخراج الـ Bot ID من التوكن
const BOT_ID = process.env.BOT_TOKEN
  ? parseInt(process.env.BOT_TOKEN.split(":")[0], 10)
  : 0;

// =============================================
// send() — wrapper يضيف remove_keyboard للمجموعات
// =============================================
function send(chatId, chatType, text, extra = {}) {
  const isGroup = chatType === "group" || chatType === "supergroup";
  if (isGroup && !(extra.reply_markup && extra.reply_markup.inline_keyboard)) {
    return sendMessage(chatId, text, { ...extra, reply_markup: { remove_keyboard: true } });
  }
  return sendMessage(chatId, text, extra);
}

// يبني keyboard مع دمج الأزرار المخصصة
function buildKeyboardWithCustom(rows) {
  const custom = getCustomButtons();
  return makeInlineKeyboard([...rows, ...custom]);
}

// تسجّل أوامر البوت عند تيليغرام (تُستدعى مرة واحدة عند /start)
let _commandsRegistered = false;
async function registerCommands() {
  if (_commandsRegistered) return;
  _commandsRegistered = true;
  await callTelegram("setMyCommands", {
    commands: [
      { command: "start",      description: "البداية" },
      { command: "menu",       description: "القائمة الرئيسية" },
      { command: "help",       description: "المساعدة" },
      { command: "morning",    description: "أذكار الصباح" },
      { command: "evening",    description: "أذكار المساء" },
      { command: "sleep",      description: "أذكار النوم" },
      { command: "thikr",      description: "ذكر عشوائي" },
      { command: "ayah",       description: "آية قرآنية" },
      { command: "hadith",     description: "حديث نبوي" },
      { command: "dua",        description: "دعاء" },
      { command: "didyouknow", description: "هل تعلم" },
      { command: "quiz",       description: "مسابقة إسلامية" },
      { command: "tasbih",     description: "عدّاد التسبيح" },
    ],
  });
}

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
  if (req.method !== "POST") {
    return res.status(200).send("Bot is running ✅");
  }
  try {
    const update = req.body || {};
    await handleUpdate(update);
  } catch (err) {
    console.error("Handler error:", err);
  }
  return res.status(200).json({ ok: true });
};

// =============================================
// توزيع التحديثات
// =============================================
async function handleUpdate(update) {
  if (update.message) {
    const chat = update.message.chat;
    // حفظ الـ Chat ID تلقائياً
    await addChatId(chat.id, chat.type).catch(() => {});
    await handleMessage(update.message);
    return;
  }
  if (update.callback_query) { await handleCallbackQuery(update.callback_query); return; }
  if (update.inline_query)   { await handleInlineQuery(update.inline_query);     return; }
  if (update.my_chat_member) { await handleMyChatMember(update.my_chat_member);  return; }
}

// =============================================
// معالجة الرسائل
// =============================================
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const chat   = msg.chat;

  // إزالة البوت من المجموعة
  if (msg.left_chat_member && BOT_ID && msg.left_chat_member.id === BOT_ID) {
    await removeChatId(chatId).catch(() => {});
    return;
  }

  // شيل @BotUsername من الأمر (للمجموعات: /sleep@AtharIslamBot → /sleep)
  const raw  = (msg.text || "").trim();
  const text = raw.startsWith("/") ? raw.split("@")[0] : raw;

  if (text === "/start" || text.startsWith("/start ")) { await handleStart(chatId, chat);      return; }
  if (text === "/help")                                 { await handleHelp(chatId, chat);       return; }

  const ct = chat.type;
  if (text === "/هل_تعلم"      || text === "/didyouknow"  || text === "هل تعلم")       { await handleDidYouKnow(chatId, ct);   return; }
  if (text === "/اذكار_الصباح" || text === "/morning"     || text === "أذكار الصباح")  { await handleAzkarMorning(chatId, ct); return; }
  if (text === "/اذكار_المساء" || text === "/evening"     || text === "أذكار المساء")  { await handleAzkarEvening(chatId, ct); return; }
  if (text === "/اذكار_النوم"  || text === "/sleep"       || text === "أذكار النوم")   { await handleAzkarSleep(chatId, ct);   return; }
  if (text === "/ذكر"           || text === "/thikr"       || text === "ذكر")           { await handleThikr(chatId, ct);        return; }
  if (text === "/دعاء"          || text === "/dua"         || text === "دعاء")          { await handleDua(chatId, ct);          return; }
  if (text === "/آية"           || text === "/ayah"        || text === "آية")           { await handleAyah(chatId, ct);         return; }
  if (text === "/حديث"          || text === "/hadith"      || text === "حديث")          { await handleHadith(chatId, ct);       return; }
  if (text === "/مسابقة"        || text === "/quiz"        || text === "مسابقة")        { await handleQuiz(chatId, ct);         return; }
  if (text === "/menu")                                                                  { await handleMenu(chatId, ct);         return; }
  if (text === "/tasbih" || text === "تسبيح") {
    await handleTasbih(chatId, chat.type, msg.from && msg.from.id, msg.from ? getUserDisplayName(msg.from) : "مستخدم");
    return;
  }
}

// =============================================
// معالجة Callback Queries
// =============================================
async function handleCallbackQuery(cq) {
  const data        = cq.data || "";
  const inlineMsgId = cq.inline_message_id;
  const chatId      = cq.message && cq.message.chat.id;
  const msgId       = cq.message && cq.message.message_id;

  const doEdit = (text, extra = {}) =>
    inlineMsgId
      ? editMessageInline(inlineMsgId, text, extra)
      : editMessage(chatId, msgId, text, extra);

  if (data.startsWith("menu_")) {
    await answerCallback(cq.id);
    const ct = (cq.message && cq.message.chat && cq.message.chat.type) || "private";
    const menuActions = {
      menu_morning:    () => handleAzkarMorning(chatId, ct),
      menu_evening:    () => handleAzkarEvening(chatId, ct),
      menu_sleep:      () => handleAzkarSleep(chatId, ct),
      menu_thikr:      () => handleThikr(chatId, ct),
      menu_ayah:       () => handleAyah(chatId, ct),
      menu_hadith:     () => handleHadith(chatId, ct),
      menu_dua:        () => handleDua(chatId, ct),
      menu_didyouknow: () => handleDidYouKnow(chatId, ct),
      menu_quiz:       () => handleQuiz(chatId, ct),
      menu_tasbih:     () => handleTasbih(chatId, ct, cq.from.id, getUserDisplayName(cq.from)),
    };
    if (menuActions[data]) await menuActions[data]();
    return;
  }

  if (data.startsWith("tasbih_")) {
    await handleTasbihCallback(cq, data, doEdit);
    return;
  }

  if (data === "didyouknow_next") {
    const item = getRandom(loadData("did-you-know.json"));
    await answerCallback(cq.id);
    await doEdit(formatDidYouKnow(item), {
      reply_markup: buildKeyboardWithCustom([[{ text: "معلومة أخرى", callback_data: "didyouknow_next" }]]),
    });
    return;
  }

  if (data === "quiz_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("quiz.json"));
    await doEdit(formatQuizQuestion(item), { reply_markup: buildQuizKeyboard(item) });
    return;
  }

  if (data.startsWith("quiz_")) {
    await handleQuizAnswer(cq, data, doEdit);
    return;
  }

  if (data === "thikr_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("azkar-general.json"));
    await doEdit(formatGeneralThikr(item), {
      reply_markup: buildKeyboardWithCustom([[{ text: "ذكر آخر", callback_data: "thikr_next" }]]),
    });
    return;
  }
  if (data === "dua_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("duas.json"));
    await doEdit(formatDua(item), {
      reply_markup: buildKeyboardWithCustom([[{ text: "دعاء آخر", callback_data: "dua_next" }]]),
    });
    return;
  }
  if (data === "ayah_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("ayat.json"));
    await doEdit(formatAyah(item), {
      reply_markup: buildKeyboardWithCustom([[{ text: "آية أخرى", callback_data: "ayah_next" }]]),
    });
    return;
  }
  if (data === "hadith_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("ahadith.json"));
    await doEdit(formatHadith(item), {
      reply_markup: buildKeyboardWithCustom([[{ text: "حديث آخر", callback_data: "hadith_next" }]]),
    });
    return;
  }

  await answerCallback(cq.id);
}

// =============================================
// معالجة إجابة المسابقة
// =============================================
async function handleQuizAnswer(cq, data, doEdit) {
  const parts  = data.split("_");
  const quizId = parseInt(parts[1]);
  const chosen = parseInt(parts[2]);

  const item = loadData("quiz.json").find((q) => q.id === quizId);
  if (!item) {
    await answerCallback(cq.id, "انتهت صلاحية السؤال", true);
    return;
  }

  const isCorrect = chosen === item.correct;
  await answerCallback(cq.id, isCorrect ? "إجابة صحيحة" : "إجابة خاطئة", true);

  await doEdit(formatQuizResult(item, chosen, cq.from), {
    reply_markup: makeInlineKeyboard([[{ text: "سؤال آخر", callback_data: "quiz_next" }]]),
  });
}

// =============================================
// Inline Queries
// =============================================
async function handleInlineQuery(iq) {
  const query = (iq.query || "").trim();
  const iqId  = iq.id;
  const ts    = Date.now();
  console.log(`[inline] from=${iq.from && iq.from.id} query="${query}"`);

  if (!query) {
    await serveDefaultInline(iqId, ts);
    return;
  }

  const q = query.toLowerCase();

  if (q.includes("هل تعلم") || q.includes("معلومة")) {
    await serveDidYouKnowInline(iqId, ts);
  } else if (q.includes("صباح")) {
    await serveAzkarInline(iqId, "azkar-morning.json", "أذكار الصباح", ts);
  } else if (q.includes("مساء")) {
    await serveAzkarInline(iqId, "azkar-evening.json", "أذكار المساء", ts);
  } else if (q.includes("نوم")) {
    await serveAzkarInline(iqId, "azkar-sleep.json", "أذكار النوم", ts);
  } else if (q.includes("ذكر") || q.includes("اذكار") || q.includes("أذكار")) {
    await serveGeneralThikrInline(iqId, ts);
  } else if (q.includes("دعاء") || q.includes("ادعية") || q.includes("أدعية")) {
    await serveDuasInline(iqId, ts);
  } else if (q.includes("آية") || q.includes("اية") || q.includes("قرآن") || q.includes("قران")) {
    await serveAyatInline(iqId, ts);
  } else if (q.includes("حديث") || q.includes("احاديث") || q.includes("أحاديث")) {
    await serveAhadithInline(iqId, ts);
  } else if (q.includes("مسابقة") || q.includes("سؤال")) {
    await serveQuizInline(iqId, ts);
  } else if (q.includes("تسبيح")) {
    await serveTasbihInline(iqId, ts, iq.from);
  } else {
    await serveSearchInline(iqId, query, ts);
  }
}

// =============================================
// Inline — القائمة الافتراضية (بدون كلمة بحث)
// =============================================
async function serveDefaultInline(iqId, ts) {
  const categories = [
    {
      id: `${ts}_0`,
      title: "هل تعلم",
      desc: "معلومة دينية عشوائية",
      text: formatDidYouKnow(getRandom(loadData("did-you-know.json"))),
    },
    {
      id: `${ts}_1`,
      title: "أذكار الصباح",
      desc: "ذكر من أذكار الصباح",
      text: formatThikr(getRandom(loadData("azkar-morning.json"))),
    },
    {
      id: `${ts}_2`,
      title: "أذكار المساء",
      desc: "ذكر من أذكار المساء",
      text: formatThikr(getRandom(loadData("azkar-evening.json"))),
    },
    {
      id: `${ts}_3`,
      title: "أذكار النوم",
      desc: "ذكر من أذكار النوم",
      text: formatThikr(getRandom(loadData("azkar-sleep.json"))),
    },
    {
      id: `${ts}_4`,
      title: "ذكر عشوائي",
      desc: "ذكر من الأذكار العامة",
      text: formatGeneralThikr(getRandom(loadData("azkar-general.json"))),
    },
    {
      id: `${ts}_5`,
      title: "دعاء",
      desc: "دعاء عشوائي",
      text: formatDua(getRandom(loadData("duas.json"))),
    },
    {
      id: `${ts}_6`,
      title: "آية قرآنية",
      desc: "آية عشوائية",
      text: formatAyah(getRandom(loadData("ayat.json"))),
    },
    {
      id: `${ts}_7`,
      title: "حديث نبوي",
      desc: "حديث عشوائي",
      text: formatHadith(getRandom(loadData("ahadith.json"))),
    },
  ];

  const quizItem = getRandom(loadData("quiz.json"));

  const results = categories.map((c) => ({
    type: "article",
    id: c.id,
    title: c.title,
    description: c.desc,
    input_message_content: { message_text: c.text, parse_mode: "HTML" },
  }));

  results.push({
    type: "article",
    id: `${ts}_8`,
    title: "مسابقة إسلامية",
    description: "سؤال عشوائي",
    input_message_content: { message_text: formatQuizQuestion(quizItem), parse_mode: "HTML" },
    reply_markup: buildQuizKeyboard(quizItem),
  });

  await answerInlineQuery(iqId, results, 0);
}

// =============================================
// Inline — نتائج البحث حسب التصنيف
// =============================================
async function serveDidYouKnowInline(iqId, ts) {
  const selected = getRandomN(loadData("did-you-know.json"), 10);
  const results  = selected.map((item, i) => ({
    type: "article",
    id: `${ts}_dyk_${i}`,
    title: item.category,
    description: item.text.substring(0, 70),
    input_message_content: { message_text: formatDidYouKnow(item), parse_mode: "HTML" },
  }));
  await answerInlineQuery(iqId, results, 0);
}

async function serveAzkarInline(iqId, filename, label, ts) {
  const selected = getRandomN(loadData(filename), 10);
  const results  = selected.map((item, i) => ({
    type: "article",
    id: `${ts}_az_${i}`,
    title: label,
    description: item.text.substring(0, 70),
    input_message_content: { message_text: formatThikr(item), parse_mode: "HTML" },
  }));
  await answerInlineQuery(iqId, results, 0);
}

async function serveGeneralThikrInline(iqId, ts) {
  const selected = getRandomN(loadData("azkar-general.json"), 10);
  const results  = selected.map((item, i) => ({
    type: "article",
    id: `${ts}_gaz_${i}`,
    title: item.occasion,
    description: item.text.substring(0, 70),
    input_message_content: { message_text: formatGeneralThikr(item), parse_mode: "HTML" },
  }));
  await answerInlineQuery(iqId, results, 0);
}

async function serveDuasInline(iqId, ts) {
  const selected = getRandomN(loadData("duas.json"), 10);
  const results  = selected.map((item, i) => ({
    type: "article",
    id: `${ts}_dua_${i}`,
    title: item.occasion,
    description: item.text.substring(0, 70),
    input_message_content: { message_text: formatDua(item), parse_mode: "HTML" },
  }));
  await answerInlineQuery(iqId, results, 0);
}

async function serveAyatInline(iqId, ts) {
  const selected = getRandomN(loadData("ayat.json"), 10);
  const results  = selected.map((item, i) => ({
    type: "article",
    id: `${ts}_ay_${i}`,
    title: item.surah + " — " + item.ayah_number,
    description: item.text.substring(0, 70),
    input_message_content: { message_text: formatAyah(item), parse_mode: "HTML" },
  }));
  await answerInlineQuery(iqId, results, 0);
}

async function serveAhadithInline(iqId, ts) {
  const selected = getRandomN(loadData("ahadith.json"), 10);
  const results  = selected.map((item, i) => ({
    type: "article",
    id: `${ts}_hd_${i}`,
    title: item.source,
    description: item.text.substring(0, 70),
    input_message_content: { message_text: formatHadith(item), parse_mode: "HTML" },
  }));
  await answerInlineQuery(iqId, results, 0);
}

async function serveQuizInline(iqId, ts) {
  const selected = getRandomN(loadData("quiz.json"), 10);
  const results  = selected.map((item, i) => ({
    type: "article",
    id: `${ts}_qz_${i}`,
    title: item.category,
    description: item.question.substring(0, 70),
    input_message_content: { message_text: formatQuizQuestion(item), parse_mode: "HTML" },
    reply_markup: buildQuizKeyboard(item),
  }));
  await answerInlineQuery(iqId, results, 0);
}

// =============================================
// Inline — بحث نصي في كل الملفات
// =============================================
async function serveSearchInline(iqId, query, ts) {
  const q       = query.toLowerCase();
  const results = [];

  const pushResult = (id, title, description, text, keyboard) => {
    const entry = {
      type: "article",
      id,
      title,
      description: description.substring(0, 70),
      input_message_content: { message_text: text, parse_mode: "HTML" },
    };
    if (keyboard) entry.reply_markup = keyboard;
    results.push(entry);
  };

  loadData("did-you-know.json")
    .filter((i) => i.text.includes(q) || i.category.includes(q))
    .slice(0, 3)
    .forEach((item, i) =>
      pushResult(`${ts}_sdyk_${i}`, item.category, item.text, formatDidYouKnow(item))
    );

  loadData("ayat.json")
    .filter((i) => i.text.includes(q) || i.surah.includes(q))
    .slice(0, 2)
    .forEach((item, i) =>
      pushResult(`${ts}_say_${i}`, item.surah + " — " + item.ayah_number, item.text, formatAyah(item))
    );

  loadData("ahadith.json")
    .filter((i) => i.text.includes(q))
    .slice(0, 2)
    .forEach((item, i) =>
      pushResult(`${ts}_shd_${i}`, item.source, item.text, formatHadith(item))
    );

  loadData("duas.json")
    .filter((i) => i.text.includes(q) || i.occasion.includes(q))
    .slice(0, 2)
    .forEach((item, i) =>
      pushResult(`${ts}_sdua_${i}`, item.occasion, item.text, formatDua(item))
    );

  loadData("azkar-general.json")
    .filter((i) => i.text.includes(q) || i.occasion.includes(q))
    .slice(0, 2)
    .forEach((item, i) =>
      pushResult(`${ts}_saz_${i}`, item.occasion, item.text, formatGeneralThikr(item))
    );

  loadData("quiz.json")
    .filter((i) => i.question.includes(q))
    .slice(0, 1)
    .forEach((item, i) =>
      pushResult(`${ts}_sqz_${i}`, item.category, item.question, formatQuizQuestion(item), buildQuizKeyboard(item))
    );

  if (results.length === 0) {
    await serveDefaultInline(iqId, ts);
    return;
  }

  await answerInlineQuery(iqId, results.slice(0, 10), 0);
}

// =============================================
// Handlers الأوامر
// =============================================

async function handleStart(chatId, chat) {
  await registerCommands();
  await addChatId(chatId, chat.type).catch(() => {});
  const isPrivate = chat && chat.type === "private";

  if (isPrivate) {
    const text = [
      "الأثر .",
      "",
      "بوت إسلامي جامع للأذكار والأدعية من الكتاب والسنة.",
      "",
      "استخدم الأزرار بالأسفل أو اكتب @AtharIslamBot بأي محادثة.",
      "",
      SEP,
      BRAND,
      ISTIGFAR,
    ].join("\n");
    await send(chatId, chat.type, text, { reply_markup: makeReplyKeyboard() });
  } else {
    const text = [
      "الأثر .",
      "",
      "بوت إسلامي جامع للأذكار والأدعية من الكتاب والسنة.",
      "",
      "اكتب /menu لعرض القائمة",
      "أو استخدم الأوامر:",
      "/ayah · /hadith · /dua · /thikr · /quiz · /morning · /evening · /sleep · /tasbih",
      "",
      SEP,
      BRAND,
      ISTIGFAR,
    ].join("\n");
    await send(chatId, chat.type, text);
  }
}

async function handleHelp(chatId, chat) {
  const isPrivate = chat && chat.type === "private";
  const text = [
    "<b>قائمة الأوامر</b>",
    "",
    "/menu — القائمة الرئيسية",
    "",
    "<b>الأذكار:</b>",
    "/morning · أذكار الصباح",
    "/evening · أذكار المساء",
    "/sleep · أذكار النوم",
    "/thikr · ذكر عشوائي",
    "",
    "<b>القرآن والحديث:</b>",
    "/ayah · آية قرآنية",
    "/hadith · حديث نبوي",
    "",
    "<b>الأدعية والمعلومات:</b>",
    "/dua · دعاء",
    "/didyouknow · هل تعلم",
    "",
    "<b>المسابقة:</b>",
    "/quiz · مسابقة إسلامية",
    "",
    "اكتب @AtharIslamBot في أي محادثة للاستخدام inline",
    "",
    SEP,
    BRAND,
    ISTIGFAR,
  ].join("\n");
  const extra = isPrivate ? { reply_markup: makeReplyKeyboard() } : {};
  await send(chatId, chat.type, text, extra);
}

async function handleMenu(chatId, chatType) {
  const text = [
    "<b>الأثر — القائمة الرئيسية</b>",
    "",
    "اختر ما تريد:",
    "",
    SEP,
    BRAND,
    ISTIGFAR,
  ].join("\n");
  const kb = makeInlineKeyboard([
    [{ text: "أذكار الصباح", callback_data: "menu_morning"    }, { text: "أذكار المساء",  callback_data: "menu_evening" }],
    [{ text: "أذكار النوم",  callback_data: "menu_sleep"      }, { text: "ذكر",            callback_data: "menu_thikr"   }],
    [{ text: "آية",          callback_data: "menu_ayah"       }, { text: "حديث",           callback_data: "menu_hadith"  }],
    [{ text: "دعاء",         callback_data: "menu_dua"        }, { text: "هل تعلم",        callback_data: "menu_didyouknow" }],
    [{ text: "مسابقة",       callback_data: "menu_quiz"       }, { text: "تسبيح",          callback_data: "menu_tasbih" }],
  ]);
  await send(chatId, chatType, text, { reply_markup: kb });
}

async function handleDidYouKnow(chatId, chatType) {
  const item = getRandom(loadData("did-you-know.json"));
  const kb   = buildKeyboardWithCustom([[{ text: "معلومة أخرى", callback_data: "didyouknow_next" }]]);
  await send(chatId, chatType, formatDidYouKnow(item), { reply_markup: kb });
}

// ---- أذكار الصباح ----
async function handleAzkarMorning(chatId, chatType) {
  const items = loadData("azkar-morning.json");
  await sendAzkarFull(chatId, chatType, items, "أذكار الصباح",
    "أتممت أذكار الصباح — تقبّل الله منك");
}

// ---- أذكار المساء ----
async function handleAzkarEvening(chatId, chatType) {
  const items = loadData("azkar-evening.json");
  await sendAzkarFull(chatId, chatType, items, "أذكار المساء",
    "أتممت أذكار المساء — تقبّل الله منك");
}

// ---- أذكار النوم ----
async function handleAzkarSleep(chatId, chatType) {
  const items = loadData("azkar-sleep.json");
  await sendAzkarFull(chatId, chatType, items, "أذكار النوم",
    "أتممت أذكار النوم — نوماً هنيئاً");
}

// ---- إرسال قائمة الأذكار كاملة ----
const NUM_EMOJIS = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

async function sendAzkarFull(chatId, chatType, items, title, completion) {
  const CHUNK  = 10;
  const chunks = [];
  for (let i = 0; i < items.length; i += CHUNK) chunks.push(items.slice(i, i + CHUNK));

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk   = chunks[ci];
    const isFirst = ci === 0;
    const isLast  = ci === chunks.length - 1;
    const lines   = [];

    if (isFirst) {
      lines.push(`<b>${title} .</b>`, "");
    } else {
      lines.push(`<b>${title} (${ci + 1})</b>`, "");
    }

    chunk.forEach((z, j) => {
      const num = j + 1 + ci * CHUNK;
      lines.push(`${num}. ${z.text}`);
      if (z.count)  lines.push(z.count === 1 ? "مرة واحدة" : z.count + " مرات");
      if (z.source) lines.push(z.source);
      if (j < chunk.length - 1) lines.push("", "ـــــــــــ", "");
    });

    if (isLast) {
      lines.push("", SEP, completion, "", BRAND, ISTIGFAR);
    }

    await send(chatId, chatType, lines.join("\n"));
    if (ci < chunks.length - 1) await delay(300);
  }
}

async function handleThikr(chatId, chatType) {
  const item = getRandom(loadData("azkar-general.json"));
  const kb   = buildKeyboardWithCustom([[{ text: "ذكر آخر", callback_data: "thikr_next" }]]);
  await send(chatId, chatType, formatGeneralThikr(item), { reply_markup: kb });
}

async function handleDua(chatId, chatType) {
  const item = getRandom(loadData("duas.json"));
  const kb   = buildKeyboardWithCustom([[{ text: "دعاء آخر", callback_data: "dua_next" }]]);
  await send(chatId, chatType, formatDua(item), { reply_markup: kb });
}

async function handleAyah(chatId, chatType) {
  const item = getRandom(loadData("ayat.json"));
  const kb   = buildKeyboardWithCustom([[{ text: "آية أخرى", callback_data: "ayah_next" }]]);
  await send(chatId, chatType, formatAyah(item), { reply_markup: kb });
}

async function handleHadith(chatId, chatType) {
  const item = getRandom(loadData("ahadith.json"));
  const kb   = buildKeyboardWithCustom([[{ text: "حديث آخر", callback_data: "hadith_next" }]]);
  await send(chatId, chatType, formatHadith(item), { reply_markup: kb });
}

async function handleQuiz(chatId, chatType) {
  const item = getRandom(loadData("quiz.json"));
  await send(chatId, chatType, formatQuizQuestion(item), { reply_markup: buildQuizKeyboard(item) });
}

// ---- تسبيح ----
async function handleTasbih(chatId, chatType, userId, displayName) {
  const counts = [0, 0, 0, 0, 0, 0];
  if (chatType === "private") {
    await send(chatId, chatType, buildSoloTasbihMessage(userId, displayName || "مستخدم", counts), {
      reply_markup: buildSoloTasbihKeyboard(userId, counts),
    });
  } else {
    const text = ["تسبيح .", "", "اختر نوع العدّاد:"].join("\n");
    const kb = makeInlineKeyboard([
      [{ text: "تسبيح جماعي", callback_data: "tasbih_choice_g" }],
      [{ text: "تسبيح فردي",  callback_data: "tasbih_choice_s" }],
    ]);
    await send(chatId, chatType, text, { reply_markup: kb });
  }
}

async function handleTasbihCallback(cq, data, doEdit) {
  const from = cq.from;

  if (data === "tasbih_choice_g") {
    await answerCallback(cq.id);
    const counts = [0, 0, 0, 0, 0, 0];
    await doEdit(buildGroupTasbihMessage(counts, []), {
      reply_markup: buildGroupTasbihKeyboard(counts),
    });
    return;
  }

  if (data === "tasbih_choice_s") {
    await answerCallback(cq.id);
    const counts = [0, 0, 0, 0, 0, 0];
    await doEdit(buildSoloTasbihMessage(from.id, getUserDisplayName(from), counts), {
      reply_markup: buildSoloTasbihKeyboard(from.id, counts),
    });
    return;
  }

  // --- تسبيح جماعي: tasbih_g_TYPEIDX_C0_C1_C2_C3_C4_C5 ---
  const groupMatch = data.match(/^tasbih_g_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)$/);
  if (groupMatch) {
    const typeIdx  = parseInt(groupMatch[1]);
    const counts   = [1,2,3,4,5,6].map((k) => parseInt(groupMatch[k + 1]));
    counts[typeIdx]++;

    const msgText    = cq.message && cq.message.text;
    const participants = parseParticipants(msgText);
    const name       = getUserDisplayName(from);
    if (name && name !== "مستخدم" && !participants.includes(name)) participants.push(name);

    const label = TASBIH_TYPES[typeIdx] ? TASBIH_TYPES[typeIdx].label : "تسبيح";
    await answerCallback(cq.id, label + " (" + counts[typeIdx] + ")", false);
    await doEdit(buildGroupTasbihMessage(counts, participants), {
      reply_markup: buildGroupTasbihKeyboard(counts),
    });
    return;
  }

  // --- إعادة ضبط التسبيح الفردي: tasbih_s_rst_USERID ---
  const rstMatch = data.match(/^tasbih_s_rst_(\d+)$/);
  if (rstMatch) {
    const ownerId = rstMatch[1];
    if (String(from.id) !== String(ownerId)) {
      await answerCallback(cq.id, "هذا العدّاد خاص بشخص آخر\nابعث /tasbih لتسوي عدّادك", true);
      return;
    }
    await answerCallback(cq.id, "تم التصفير");
    const counts = [0, 0, 0, 0, 0, 0];
    await doEdit(buildSoloTasbihMessage(from.id, getUserDisplayName(from), counts), {
      reply_markup: buildSoloTasbihKeyboard(from.id, counts),
    });
    return;
  }

  // --- تسبيح فردي: tasbih_s_TYPEIDX_USERID_C0_C1_C2_C3_C4_C5 ---
  const soloMatch = data.match(/^tasbih_s_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)$/);
  if (soloMatch) {
    const typeIdx  = parseInt(soloMatch[1]);
    const ownerId  = soloMatch[2];
    const counts   = [1,2,3,4,5,6].map((k) => parseInt(soloMatch[k + 2]));

    if (String(from.id) !== String(ownerId)) {
      await answerCallback(cq.id, "هذا العدّاد خاص بشخص آخر\nابعث /tasbih لتسوي عدّادك", true);
      return;
    }

    counts[typeIdx]++;
    const label = TASBIH_TYPES[typeIdx] ? TASBIH_TYPES[typeIdx].label : "تسبيح";
    await answerCallback(cq.id, label + " (" + counts[typeIdx] + ")", false);
    await doEdit(buildSoloTasbihMessage(from.id, getUserDisplayName(from), counts), {
      reply_markup: buildSoloTasbihKeyboard(from.id, counts),
    });
    return;
  }

  await answerCallback(cq.id);
}

async function serveTasbihInline(iqId, ts, from) {
  const userId = from && from.id;
  const name   = from ? getUserDisplayName(from) : "مستخدم";
  const counts = [0, 0, 0, 0, 0, 0];
  const results = [
    {
      type: "article",
      id:   `${ts}_tasbih_g`,
      title: "تسبيح جماعي",
      description: "أرسل عدّاد تسبيح جماعي للمحادثة",
      input_message_content: { message_text: buildGroupTasbihMessage(counts, []), parse_mode: "HTML" },
      reply_markup: buildGroupTasbihKeyboard(counts),
    },
    {
      type: "article",
      id:   `${ts}_tasbih_s`,
      title: "تسبيح فردي",
      description: "أرسل عدّادك الشخصي باسمك",
      input_message_content: { message_text: buildSoloTasbihMessage(userId, name, counts), parse_mode: "HTML" },
      reply_markup: buildSoloTasbihKeyboard(userId, counts),
    },
  ];
  await answerInlineQuery(iqId, results, 0);
}

function buildQuizKeyboard(item) {
  const rows = item.options.map((opt, i) => [
    { text: `${i + 1} · ${opt}`, callback_data: `quiz_${item.id}_${i}` },
  ]);
  return makeInlineKeyboard(rows);
}

async function handleMyChatMember(update) {
  const chat      = update.chat;
  const newStatus = update.new_chat_member && update.new_chat_member.status;
  if (chat.type === "group" || chat.type === "supergroup") {
    if (newStatus === "member" || newStatus === "administrator") {
      await addChatId(chat.id, chat.type).catch(() => {});
      const text = [
        "الأثر .",
        "",
        "بوت إسلامي جامع للأذكار والأدعية من الكتاب والسنة.",
        "",
        "اكتب /start للبدء",
        "",
        SEP,
        BRAND,
        ISTIGFAR,
      ].join("\n");
      await send(chat.id, chat.type, text);
      console.log(`Bot added to group: ${chat.id} — ${chat.title}`);
    } else if (newStatus === "kicked" || newStatus === "left") {
      await removeChatId(chat.id).catch(() => {});
      console.log(`Bot removed from group: ${chat.id} — ${chat.title}`);
    }
  }
}

// =============================================
// مساعدات داخلية
// =============================================
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
