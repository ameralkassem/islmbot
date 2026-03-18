# بوت أثر | Athar — دليل الإعداد

## خطوات النشر على Netlify

### 1. إنشاء البوت على Telegram
1. تحدث مع @BotFather على تيليغرام
2. أرسل `/newbot` واتبع التعليمات
3. احتفظ بالـ Token

### 2. رفع المشروع على GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/islmBot.git
git push -u origin main
```

### 3. ربط المشروع بـ Netlify
1. سجّل دخول على netlify.com
2. اضغط "New site from Git"
3. اختر الـ repository
4. Build settings:
   - Build command: (اتركه فارغاً)
   - Publish directory: (اتركه فارغاً)
5. اضغط "Deploy site"

### 4. إعداد متغيرات البيئة
في Netlify: Site settings → Environment variables أضف:

| Variable | Value |
|----------|-------|
| `BOT_TOKEN` | التوكن من BotFather |
| `GROUP_CHAT_IDS` | IDs المجموعات مفصولة بفاصلة (اختياري) |

### 5. تفعيل الـ Webhook
بعد النشر، افتح المتصفح واذهب لهذا الرابط (استبدل القيم):
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-site>.netlify.app/.netlify/functions/bot
```

### 6. إعداد الأذكار التلقائية (اختياري)
لإرسال أذكار تلقائية للمجموعات:

1. أضف IDs المجموعات في متغير البيئة `GROUP_CHAT_IDS`:
   ```
   -100123456789,-100987654321
   ```
   (للحصول على ID المجموعة: أضف @userinfobot للمجموعة)

2. أنشئ Cron Job على cron-job.org:
   - URL: `https://<your-site>.netlify.app/.netlify/functions/scheduled-azkar`
   - Method: GET
   - Schedule: كل ساعة أو حسب رغبتك

### 7. التحقق من عمل البوت
- أرسل `/start` للبوت مباشرة
- تأكد من ظهور لوحة المفاتيح

---

## هيكل المشروع
```
islmBot/
├── netlify/functions/
│   ├── bot.js              ← Webhook الرئيسي
│   └── scheduled-azkar.js  ← الأذكار التلقائية
├── data/                   ← ملفات JSON بالبيانات
├── helpers/utils.js        ← دوال مساعدة
├── netlify.toml
└── package.json
```

## ملاحظات تقنية
- لا توجد قاعدة بيانات — كل البيانات في ملفات JSON
- لا توجد مكتبات خارجية — فقط Node.js native fetch
- Netlify Functions = serverless (لا تدعم كتابة الملفات في runtime)
- المجموعات تُدار عبر متغير البيئة GROUP_CHAT_IDS
