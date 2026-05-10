# 🎓 English Master – AI-Powered English Learning App

אפליקציית לימוד אנגלית מבוססת AI עם 2000+ תרגולים, מותאמת אישית לכל רמה.

---

## ✨ פיצ'רים עיקריים

| פיצ'ר | תיאור |
|--------|--------|
| 🔑 הגדרת API חד-פעמית | מפתח Groq מוצפן במכשיר – פעם אחת לתמיד |
| 🎯 בדיקת רמה חכמה | 8 שאלות AI מותאמות אישית → רמה A1–C2 |
| ⚡ מרכז אימון | 20 סוגי תרגול × AI אינסופי = 2000+ תרגולים |
| 📖 שיעור יומי | מילים + דקדוק + תרגולים, חדש כל יום |
| 🔄 חזרה חכמה | Spaced Repetition + ניתוח שגיאות |
| 💬 שיחה עם AI | Max – מורה AI אישי לתרגול שיחה |
| ✍️ הערכת כתיבה | AI מעריך ומתקן כתיבה חופשית |
| 🔔 התראות | תזכורת יומית + אזהרת רצף |
| 📊 סטטיסטיקות | XP, רצף, מילים, שיעורים |
| 📈 רמה אדפטיבית | AI מעלה/מוריד קושי אוטומטית |

---

## 📋 20 סוגי תרגול

1. **אוצר מילים** – Multiple choice vocabulary
2. **מלא חסר** – Fill in the blank grammar  
3. **תרגום עברית → אנגלית** – Translation practice
4. **תרגום אנגלית → עברית** – Comprehension check
5. **בנה משפט** – Sentence construction
6. **תקן שגיאה** – Error correction
7. **הבנת הנקרא** – Reading passage + questions
8. **פעלים מורכבים** – Phrasal verbs
9. **ביטויים אנגליים** – Idioms & expressions
10. **זמנים** – Verb tenses drill
11. **צורות מילה** – Word forms (noun/adj/verb/adverb)
12. **מילות יחס** – Prepositions
13. **צירופי מילים** – Collocations
14. **הגייה** – Pronunciation patterns
15. **קריאה והבנה** – Long reading comprehension
16. **כתיבה חופשית** – AI-evaluated writing prompts
17. **משפטי תנאי** – Conditional sentences
18. **פסיבי / אקטיבי** – Passive voice
19. **a/an/the** – Articles
20. **השוואות** – Comparatives & superlatives

---

## 🚀 התקנה ובנייה

### דרישות מוקדמות

```bash
node --version   # >= 18
npm --version    # >= 9
```

### שלב 1 – Clone והתקנה

```bash
git clone <your-repo>
cd english-master
npm install
```

### שלב 2 – Expo CLI + EAS

```bash
npm install -g expo-cli eas-cli
expo login                   # or: eas login
```

### שלב 3 – הגדרת EAS (לבניית APK)

```bash
eas init                     # יוצר projectId ב-app.json
```

### שלב 4 – בנה APK (Android)

#### APK רגיל (לשיתוף/בדיקה):
```bash
eas build --platform android --profile preview
```

#### APK ייצור:
```bash
eas build --platform android --profile production
```

> ✅ הבנייה מתבצעת בענן – לא נדרש Android Studio

---

## 🔑 מפתח Groq API (חינמי)

1. כנס ל-**https://console.groq.com**
2. הירשם (פחות מדקה)
3. לחץ **API Keys** → **Create API Key**
4. העתק את המפתח שמתחיל ב-`gsk_`
5. הדבק באפליקציה בפתיחה ראשונה

### מודל בשימוש:
```
llama-3.3-70b-versatile
```
מהיר, חינמי, מדויק לשפות.

---

## 📱 הרצה מקומית (בדיקה)

```bash
npx expo start
```

סרוק QR עם **Expo Go** (Android/iOS).

---

## 🏗️ מבנה הפרויקט

```
english-master/
├── App.js                          # נקודת כניסה
├── app.json                        # הגדרות Expo
├── eas.json                        # הגדרות בנייה
├── src/
│   ├── screens/
│   │   ├── SetupScreen.js          # הגדרת API key ראשונית
│   │   ├── LevelTestScreen.js      # בדיקת רמה (8 שאלות AI)
│   │   ├── HomeScreen.js           # לוח בקרה ראשי
│   │   ├── LessonScreen.js         # שיעור יומי
│   │   ├── DrillScreen.js          # מרכז אימון (20 סוגים)
│   │   ├── ReviewScreen.js         # חזרה על שגיאות
│   │   ├── ChatScreen.js           # שיחה עם AI Tutor
│   │   └── SettingsScreen.js       # הגדרות + התראות
│   ├── services/
│   │   ├── storage.js              # שמירת נתונים מקומית
│   │   ├── groqService.js          # Groq AI API
│   │   ├── drillEngine.js          # מנוע 2000+ תרגולים
│   │   └── notificationService.js  # התראות יומיות
│   ├── components/
│   │   └── UIComponents.js         # רכיבי UI משותפים
│   ├── navigation/
│   │   └── AppNavigator.js         # ניווט
│   └── utils/
│       └── theme.js                # צבעים, גדלים, סגנון
```

---

## 🔔 מבנה התראות

| התראה | תיאור | תזמון |
|-------|--------|--------|
| תזכורת יומית | "זמן ללמוד אנגלית!" | כל יום בשעה שבחרת |
| אזהרת רצף | "הרצף שלך בסכנה!" | כל יום 22:00 |
| סיכום שבועי | "ראה את ההתקדמות שלך!" | ראשון 10:00 |

---

## 📊 מערכת XP ורמות

| רמה | XP נדרש | תיאור |
|-----|---------|--------|
| A1 🌱 | 0 | מתחיל |
| A2 🌿 | 500 | בסיסי |
| B1 🌳 | 1,500 | בינוני |
| B2 🏅 | 3,000 | מתקדם |
| C1 🏆 | 6,000 | מצטיין |
| C2 👑 | 10,000 | שליטה מלאה |

---

## 🧠 אלגוריתם Spaced Repetition (SM-2)

שגיאות נכנסות ל"בנק שגיאות" ומתוזמנות לחזרה לפי:
- תשובה נכונה → מרווח גדל (1 → 6 → n×EF ימים)
- תשובה שגויה → חוזר לאפס
- EaseFactor מותאם אישית לכל מילה/תרגיל

---

## 🔒 אבטחה ופרטיות

- ✅ מפתח API מוצפן ב-`expo-secure-store`
- ✅ כל הנתונים מקומיים בלבד
- ✅ לא נשלח מידע לשרתים שלנו
- ✅ Groq מקבל רק את שאלות הלמידה

---

## 🛠️ פתרון בעיות

**"Cannot connect to API"**
→ בדוק שיש אינטרנט + המפתח תקין ב-console.groq.com

**"Build failed on EAS"**
→ `eas build:cancel` ואז `eas build --platform android --profile preview --clear-cache`

**"Notifications not working on Android"**
→ הגדרות מכשיר → אפליקציות → English Master → התראות → אפשר הכל

---

## 📄 רישיון

MIT © English Master 2024
