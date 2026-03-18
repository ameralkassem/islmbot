// =============================================
// بوت أثر | Athar — الـ Webhook الرئيسي
// Netlify Function تستقبل كل تحديثات تيليغرام
// =============================================

"use strict";

const fs   = require("fs");
const path = require("path");

const {
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
  formatQuizResult,
  makeInlineKeyboard,
  makeReplyKeyboard,
} = require("../../helpers/utils");

const dataDir = path.resolve(__dirname, "../../data");

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
// Handler الرئيسي
// =============================================
const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "Bot is running ✅" };
  }
  try {
    const update = JSON.parse(event.body || "{}");
    await handleUpdate(update);
  } catch (err) {
    console.error("Handler error:", err);
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

// =============================================
// توزيع التحديثات
// =============================================
async function handleUpdate(update) {
  if (update.message)        { await handleMessage(update.message);              return; }
  if (update.callback_query) { await handleCallbackQuery(update.callback_query); return; }
  if (update.inline_query)   { await handleInlineQuery(update.inline_query);     return; }
  if (update.my_chat_member) { await handleMyChatMember(update.my_chat_member);  return; }
}

// =============================================
// معالجة الرسائل
// =============================================
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text   = (msg.text || "").trim();

  if (text === "/start" || text.startsWith("/start ")) { await handleStart(chatId);      return; }
  if (text === "/help")                                 { await handleHelp(chatId);       return; }

  if (text === "/هل_تعلم"      || text === "/didyouknow"  || text === "🧠 هل تعلم")        { await handleDidYouKnow(chatId);   return; }
  if (text === "/اذكار_الصباح" || text === "/morning"     || text === "📿 أذكار الصباح")   { await handleAzkarMorning(chatId); return; }
  if (text === "/اذكار_المساء" || text === "/evening"     || text === "📿 أذكار المساء")   { await handleAzkarEvening(chatId); return; }
  if (text === "/اذكار_النوم"  || text === "/sleep"       || text === "🌙 أذكار النوم")    { await handleAzkarSleep(chatId);   return; }
  if (text === "/ذكر"           || text === "/thikr"       || text === "📿 ذكر")            { await handleThikr(chatId);        return; }
  if (text === "/دعاء"          || text === "/dua"         || text === "🤲 دعاء")           { await handleDua(chatId);          return; }
  if (text === "/آية"           || text === "/ayah"        || text === "📖 آية")            { await handleAyah(chatId);         return; }
  if (text === "/حديث"          || text === "/hadith"      || text === "🕌 حديث")           { await handleHadith(chatId);       return; }
  if (text === "/مسابقة"        || text === "/quiz"        || text === "🏆 مسابقة")         { await handleQuiz(chatId);         return; }
}

// =============================================
// معالجة Callback Queries
// =============================================
async function handleCallbackQuery(cq) {
  const chatId = cq.message && cq.message.chat.id;
  const msgId  = cq.message && cq.message.message_id;
  const data   = cq.data || "";

  if (data === "didyouknow_next") {
    const item = getRandom(loadData("did-you-know.json"));
    await answerCallback(cq.id);
    await editMessage(chatId, msgId, formatDidYouKnow(item), {
      reply_markup: makeInlineKeyboard([[{ text: "معلومة أخرى 🔄", callback_data: "didyouknow_next" }]]),
    });
    return;
  }

  // سؤال آخر — قبل startsWith("quiz_")
  if (data === "quiz_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("quiz.json"));
    await editMessage(chatId, msgId, formatQuizQuestion(item), { reply_markup: buildQuizKeyboard(item) });
    return;
  }

  if (data.startsWith("quiz_")) {
    await handleQuizAnswer(cq, data);
    return;
  }

  if (data === "thikr_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("azkar-general.json"));
    await editMessage(chatId, msgId, formatGeneralThikr(item), {
      reply_markup: makeInlineKeyboard([[{ text: "ذكر آخر 🔄", callback_data: "thikr_next" }]]),
    });
    return;
  }
  if (data === "dua_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("duas.json"));
    await editMessage(chatId, msgId, formatDua(item), {
      reply_markup: makeInlineKeyboard([[{ text: "دعاء آخر 🔄", callback_data: "dua_next" }]]),
    });
    return;
  }
  if (data === "ayah_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("ayat.json"));
    await editMessage(chatId, msgId, formatAyah(item), {
      reply_markup: makeInlineKeyboard([[{ text: "آية أخرى 🔄", callback_data: "ayah_next" }]]),
    });
    return;
  }
  if (data === "hadith_next") {
    await answerCallback(cq.id);
    const item = getRandom(loadData("ahadith.json"));
    await editMessage(chatId, msgId, formatHadith(item), {
      reply_markup: makeInlineKeyboard([[{ text: "حديث آخر 🔄", callback_data: "hadith_next" }]]),
    });
    return;
  }

  await answerCallback(cq.id);
}

// =============================================
// معالجة إجابة المسابقة
// =============================================
async function handleQuizAnswer(cq, data) {
  const parts  = data.split("_");
  const quizId = parseInt(parts[1]);
  const chosen = parseInt(parts[2]);

  const item = loadData("quiz.json").find((q) => q.id === quizId);
  if (!item) {
    await answerCallback(cq.id, "انتهت صلاحية السؤال", true);
    return;
  }

  await answerCallback(cq.id);

  const chatId = cq.message && cq.message.chat.id;
  const msgId  = cq.message && cq.message.message_id;
  if (chatId && msgId) {
    await editMessage(chatId, msgId, formatQuizResult(item, chosen), {
      reply_markup: makeInlineKeyboard([[{ text: "سؤال آخر 🔄", callback_data: "quiz_next" }]]),
    });
  }
}

// =============================================
// Inline Queries
// =============================================
async function handleInlineQuery(iq) {
  const query = (iq.query || "").trim();
  const iqId  = iq.id;
  const ts    = Date.now();

  if (!query) {
    await serveDefaultInline(iqId, ts);
    return;
  }

  const q = query.toLowerCase();

  if (q.includes("هل تعلم") || q.includes("معلومة")) {
    await serveDidYouKnowInline(iqId, ts);
  } else if (q.includes("صباح")) {
    await serveAzkarInline(iqId, "azkar-morning.json", "📿 أذكار الصباح", ts);
  } else if (q.includes("مساء")) {
    await serveAzkarInline(iqId, "azkar-evening.json", "📿 أذكار المساء", ts);
  } else if (q.includes("نوم")) {
    await serveAzkarInline(iqId, "azkar-sleep.json", "🌙 أذكار النوم", ts);
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
      title: "🧠 هل تعلم",
      desc: "اضغط لإرسال معلومة دينية عشوائية",
      text: formatDidYouKnow(getRandom(loadData("did-you-know.json"))),
    },
    {
      id: `${ts}_1`,
      title: "📿 أذكار الصباح",
      desc: "اضغط لإرسال ذكر من أذكار الصباح",
      text: formatThikr(getRandom(loadData("azkar-morning.json"))),
    },
    {
      id: `${ts}_2`,
      title: "📿 أذكار المساء",
      desc: "اضغط لإرسال ذكر من أذكار المساء",
      text: formatThikr(getRandom(loadData("azkar-evening.json"))),
    },
    {
      id: `${ts}_3`,
      title: "🌙 أذكار النوم",
      desc: "اضغط لإرسال ذكر من أذكار النوم",
      text: formatThikr(getRandom(loadData("azkar-sleep.json"))),
    },
    {
      id: `${ts}_4`,
      title: "📿 ذكر عشوائي",
      desc: "اضغط لإرسال ذكر من الأذكار العامة",
      text: formatGeneralThikr(getRandom(loadData("azkar-general.json"))),
    },
    {
      id: `${ts}_5`,
      title: "🤲 دعاء",
      desc: "اضغط لإرسال دعاء عشوائي",
      text: formatDua(getRandom(loadData("duas.json"))),
    },
    {
      id: `${ts}_6`,
      title: "📖 آية قرآنية",
      desc: "اضغط لإرسال آية عشوائية",
      text: formatAyah(getRandom(loadData("ayat.json"))),
    },
    {
      id: `${ts}_7`,
      title: "🕌 حديث نبوي",
      desc: "اضغط لإرسال حديث عشوائي",
      text: formatHadith(getRandom(loadData("ahadith.json"))),
    },
  ];

  // المسابقة — تحتاج reply_markup خاص
  const quizItem = getRandom(loadData("quiz.json"));

  const results = categories.map((c) => ({
    type: "article",
    id: c.id,
    title: c.title,
    description: c.desc,
    input_message_content: { message_text: c.text, parse_mode: "HTML" },
  }));

  // إضافة المسابقة كآخر عنصر مع keyboard
  results.push({
    type: "article",
    id: `${ts}_8`,
    title: "🏆 مسابقة إسلامية",
    description: "اضغط لإرسال سؤال عشوائي",
    input_message_content: { message_text: formatQuizQuestion(quizItem), parse_mode: "HTML" },
    reply_markup: buildQuizKeyboard(quizItem),
  });

  await answerInlineQuery(iqId, results, 0);
}

// =============================================
// Inline — نتائج البحث حسب التصنيف (10 نتائج)
// =============================================
async function serveDidYouKnowInline(iqId, ts) {
  const selected = getRandomN(loadData("did-you-know.json"), 10);
  const results  = selected.map((item, i) => ({
    type: "article",
    id: `${ts}_dyk_${i}`,
    title: `🧠 ${item.category}`,
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
    title: `📿 ${item.occasion}`,
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
    title: `🤲 ${item.occasion}`,
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
    title: `📖 ${item.surah} — الآية ${item.ayah_number}`,
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
    title: `🕌 ${item.source}`,
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
    title: `🏆 ${item.category}`,
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

  // did-you-know
  loadData("did-you-know.json")
    .filter((i) => i.text.includes(q) || i.category.includes(q))
    .slice(0, 3)
    .forEach((item, i) =>
      pushResult(`${ts}_sdyk_${i}`, `🧠 ${item.category}`, item.text, formatDidYouKnow(item))
    );

  // آيات
  loadData("ayat.json")
    .filter((i) => i.text.includes(q) || i.surah.includes(q))
    .slice(0, 2)
    .forEach((item, i) =>
      pushResult(`${ts}_say_${i}`, `📖 ${item.surah} — الآية ${item.ayah_number}`, item.text, formatAyah(item))
    );

  // أحاديث
  loadData("ahadith.json")
    .filter((i) => i.text.includes(q))
    .slice(0, 2)
    .forEach((item, i) =>
      pushResult(`${ts}_shd_${i}`, `🕌 ${item.source}`, item.text, formatHadith(item))
    );

  // أدعية
  loadData("duas.json")
    .filter((i) => i.text.includes(q) || i.occasion.includes(q))
    .slice(0, 2)
    .forEach((item, i) =>
      pushResult(`${ts}_sdua_${i}`, `🤲 ${item.occasion}`, item.text, formatDua(item))
    );

  // أذكار عامة
  loadData("azkar-general.json")
    .filter((i) => i.text.includes(q) || i.occasion.includes(q))
    .slice(0, 2)
    .forEach((item, i) =>
      pushResult(`${ts}_saz_${i}`, `📿 ${item.occasion}`, item.text, formatGeneralThikr(item))
    );

  // مسابقات
  loadData("quiz.json")
    .filter((i) => i.question.includes(q))
    .slice(0, 1)
    .forEach((item, i) =>
      pushResult(`${ts}_sqz_${i}`, `🏆 ${item.category}`, item.question, formatQuizQuestion(item), buildQuizKeyboard(item))
    );

  // إذا ما في نتائج → اعرض القائمة الافتراضية
  if (results.length === 0) {
    await serveDefaultInline(iqId, ts);
    return;
  }

  await answerInlineQuery(iqId, results.slice(0, 10), 0);
}

// =============================================
// Handlers الأوامر
// =============================================

async function handleStart(chatId) {
  const text = [
    "╭──────── ✨ أثر ────────╮",
    "",
    "   بسم الله الرحمن الرحيم",
    "",
    "   ❝ وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ",
    "     تَنفَعُ الْمُؤْمِنِينَ ❞",
    "",
    "   أهلاً بك في <b>أثر</b>",
    "   رفيقك الإيماني اليومي 🌙",
    "",
    "   📿  الأذكـار — صباح · مساء · نوم",
    "   📖  آيـات — من كلام الله",
    "   🕌  أحاديـث — من سنة النبي ﷺ",
    "   🤲  أدعيـة — لكل وقت وحال",
    "   🧠  هل تعلم — فوائد دينية",
    "   🏆  مسابقة — اختبر نفسك",
    "",
    "   اكتب <b>@AtharIslamBot</b> في أي محادثة",
    "   لمشاركة المحتوى مباشرةً ✨",
    "",
    "╰──────── 🌙 ────────╯",
  ].join("\n");
  await sendMessage(chatId, text, { reply_markup: makeReplyKeyboard() });
}

async function handleHelp(chatId) {
  const text = [
    "╭──────── 📋 المساعدة ────────╮",
    "",
    "   <b>الأذكار:</b>",
    "   /اذكار_الصباح · /morning",
    "   /اذكار_المساء · /evening",
    "   /اذكار_النوم · /sleep",
    "   /ذكر · /thikr",
    "",
    "   <b>القرآن والحديث:</b>",
    "   /آية · /ayah",
    "   /حديث · /hadith",
    "",
    "   <b>الأدعية والمعلومات:</b>",
    "   /دعاء · /dua",
    "   /هل_تعلم · /didyouknow",
    "",
    "   <b>المسابقة:</b>",
    "   /مسابقة · /quiz",
    "",
    "   💡 اكتب @AtharIslamBot في أي",
    "   محادثة للاستخدام inline",
    "",
    "╰──────── 🌙 ────────╯",
  ].join("\n");
  await sendMessage(chatId, text, { reply_markup: makeReplyKeyboard() });
}

async function handleDidYouKnow(chatId) {
  const item = getRandom(loadData("did-you-know.json"));
  const kb   = makeInlineKeyboard([[{ text: "معلومة أخرى 🔄", callback_data: "didyouknow_next" }]]);
  await sendMessage(chatId, formatDidYouKnow(item), { reply_markup: kb });
}

// ---- أذكار الصباح ----
async function handleAzkarMorning(chatId) {
  const items = loadData("azkar-morning.json");
  await sendAzkarFull(chatId, items, "☀️", "أذكار الصباح", "اللهم بك أصبحنا وبك أمسينا", "☀️ أتممت أذكار الصباح\nتقبّل الله منك ✨");
}

// ---- أذكار المساء ----
async function handleAzkarEvening(chatId) {
  const items = loadData("azkar-evening.json");
  await sendAzkarFull(chatId, items, "🌆", "أذكار المساء", "اللهم بك أمسينا وبك أصبحنا", "🌆 أتممت أذكار المساء\nتقبّل الله منك ✨");
}

// ---- أذكار النوم ----
async function handleAzkarSleep(chatId) {
  const items = loadData("azkar-sleep.json");
  await sendAzkarFull(chatId, items, "🌙", "أذكار النوم", "بسمك اللهم أموت وأحيا", "🌙 أتممت أذكار النوم\nنوماً هنيئاً وراحة مباركة ✨");
}

// ---- إرسال قائمة الأذكار كاملة ----
const NUM_EMOJIS = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

async function sendAzkarFull(chatId, items, icon, title, intro, footer) {
  const CHUNK = 10;
  const chunks = [];
  for (let i = 0; i < items.length; i += CHUNK) chunks.push(items.slice(i, i + CHUNK));

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const isFirst = ci === 0;
    const isLast  = ci === chunks.length - 1;

    const lines = [];

    if (isFirst) {
      lines.push(`╭──────── ${icon} ${title} ────────╮`);
      lines.push("");
      lines.push(`   ${intro}`);
      lines.push("");
    } else {
      lines.push(`╭──────── ${icon} ${title} (${ci + 1}) ────────╮`);
      lines.push("");
    }

    chunk.forEach((z, j) => {
      const num = NUM_EMOJIS[j] || `${ci * CHUNK + j + 1}.`;
      lines.push(`   ${num}  ${z.text}`);
      if (z.count) {
        lines.push("   " + (z.count === 1 ? "🔢 مرة واحدة" : `🔢 ${z.count} مرات`));
      }
      if (z.source) lines.push(`   📖 ${z.source}`);
      if (j < chunk.length - 1) lines.push("   ━━━━━━━━━━━━━━");
    });

    lines.push("");
    if (isLast) {
      lines.push(`   ${footer}`);
      lines.push("");
    }
    lines.push("╰──────── 🌙 ────────╯");

    await sendMessage(chatId, lines.join("\n"));
    if (ci < chunks.length - 1) await delay(300);
  }
}

async function handleThikr(chatId) {
  const item = getRandom(loadData("azkar-general.json"));
  const kb   = makeInlineKeyboard([[{ text: "ذكر آخر 🔄", callback_data: "thikr_next" }]]);
  await sendMessage(chatId, formatGeneralThikr(item), { reply_markup: kb });
}

async function handleDua(chatId) {
  const item = getRandom(loadData("duas.json"));
  const kb   = makeInlineKeyboard([[{ text: "دعاء آخر 🔄", callback_data: "dua_next" }]]);
  await sendMessage(chatId, formatDua(item), { reply_markup: kb });
}

async function handleAyah(chatId) {
  const item = getRandom(loadData("ayat.json"));
  const kb   = makeInlineKeyboard([[{ text: "آية أخرى 🔄", callback_data: "ayah_next" }]]);
  await sendMessage(chatId, formatAyah(item), { reply_markup: kb });
}

async function handleHadith(chatId) {
  const item = getRandom(loadData("ahadith.json"));
  const kb   = makeInlineKeyboard([[{ text: "حديث آخر 🔄", callback_data: "hadith_next" }]]);
  await sendMessage(chatId, formatHadith(item), { reply_markup: kb });
}

async function handleQuiz(chatId) {
  const item = getRandom(loadData("quiz.json"));
  await sendMessage(chatId, formatQuizQuestion(item), { reply_markup: buildQuizKeyboard(item) });
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
      const text = [
        "╭──────── ✨ أثر ────────╮",
        "",
        "   السلام عليكم ورحمة الله 🌙",
        "",
        "   أنا <b>أثر</b> — رفيقكم الإيماني!",
        "   سأشارككم كل يوم:",
        "",
        "   📿  الأذكار والأدعية",
        "   📖  الآيات القرآنية",
        "   🕌  الأحاديث النبوية",
        "   🧠  المعلومات الإسلامية",
        "   🏆  مسابقات دينية",
        "",
        "   اكتب /start للبدء ✨",
        "",
        "╰──────── 🌙 ────────╯",
      ].join("\n");
      await sendMessage(chat.id, text);
      console.log(`Bot added to group: ${chat.id} — ${chat.title}`);
    } else if (newStatus === "kicked" || newStatus === "left") {
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

module.exports = { handler };
