# 🚀 VERCEL میں 1 Click میں Deploy کریں!

## اردو میں سادہ ہدایات:

---

## 📝 **آپ کو یہ Keys چاہیے:**

### **1. Supabase سے (FREE!)**
- جاؤ: https://supabase.com
- اپنا project کھولیں
- Settings > Database جاؤ
- یہ copy کریں:
  ```
  Connection String (PostgreSQL)
  ```
- یہ نظر آئے گا:
  ```
  postgresql://postgres:PASSWORD@HOST:5432/postgres?sslmode=require
  ```

### **2. Google Gemini (FREE!)**
- جاؤ: https://aistudio.google.com/apikey
- "Create API Key" کلک کریں
- Copy کریں

### **3. OpenAI (کم cost)**
- جاؤ: https://platform.openai.com/api-keys
- "Create new secret key" کلک کریں
- Copy کریں

---

## ⚡ **اب Vercel میں Deploy کریں:**

### **STEP 1: Backend Deploy (5 منٹ)**

```
1. https://vercel.com جاؤ
2. "Add New" > "Project" کلک کریں
3. اپنا repo select کریں: shoaibkhan478/pakistan-legal-ai
4. "Import" کلک کر��ں
```

**Important:**
```
Root Directory میں: backend/ select کریں
```

### **STEP 2: Environment Variables ڈالیں**

Vercel میں جب Environment Variables screen آئے:

**یہ فائل کھولیں:**
```
https://github.com/shoaibkhan478/pakistan-legal-ai/blob/main/VERCEL_BACKEND_ENV.md
```

**اور یہ کریں:**
```
1. VERCEL_BACKEND_ENV.md کھولیں
2. تمام text copy کریں (Ctrl+A)
3. Vercel میں Environment Variables میں paste کریں
4. جہاں [YOUR_...] ہے وہاں اپنی key ڈالیں:
   - [YOUR_PASSWORD] = Supabase password
   - [YOUR_HOST] = Supabase host
   - [YOUR_GEMINI_KEY] = Google Gemini key
   - [YOUR_OPENAI_KEY] = OpenAI key
```

### **STEP 3: Deploy کریں**

```
1. نیچے "Deploy" بٹن دبائیں
2. ⏳ 3-5 منٹ انتظار کریں
3. ✅ "Congratulations" پیغام
4. اپنا Backend URL نوٹ کریں
   (لگتا ہے: https://pakistan-legal-ai-backend.vercel.app)
```

---

### **STEP 4: Frontend Deploy (5 منٹ)**

```
1. https://vercel.com جاؤ
2. دوبارہ "Add New" > "Project" کریں
3. اسی repo کو select کریں
4. "Import" کلک کریں
```

**Important:**
```
Root Directory میں: frontend/ select کریں
```

### **STEP 5: Frontend Environment Variables**

**یہ فائل کھولیں:**
```
https://github.com/shoaibkhan478/pakistan-legal-ai/blob/main/VERCEL_FRONTEND_ENV.md
```

**کریں:**
```
1. VERCEL_FRONTEND_ENV.md کھولیں
2. تمام text copy کریں
3. Vercel میں Environment Variables میں paste کریں
```

### **STEP 6: Deploy کریں**

```
1. "Deploy" بٹن دبائیں
2. ⏳ 3-5 منٹ انتظار کریں
3. ✅ ہوگیا!
```

---

## ✅ **Test کریں:**

```
1. اپنا Frontend URL کھولیں:
   https://pakistan-legal-ai.vercel.app
   
2. یہ پیج آنا چاہیے:
   - Registration/Login form
   - "Pakistan Legal AI" heading
   
3. اگر یہ ہے تو ✅ سب ٹھیک ہے!
```

---

## 🆘 **اگر غلطی ہو تو:**

### **Error: "Cannot GET /"**
```
✓ Backend URL غلط ہے
✓ FRONTEND_URL سیٹ نہیں ہے
→ دوبارہ Environment Variables check کریں
```

### **Error: Network Error**
```
✓ NEXT_PUBLIC_API_URL غلط ہے
✓ Backend deploy نہیں ہوا
→ Vercel > Deployments میں check کریں
```

### **Error: 404 on login**
```
✓ DATABASE_URL غلط ہے
✓ Supabase connect نہیں ہوا
→ Supabase > Settings > Database میں check کریں
```

---

## 📋 **مختصر ورژن (2 منٹ میں):**

```bash
# Supabase سے یہ 3 چیزیں نوٹ کریں:
1. DATABASE_URL
2. SUPABASE_ANON_KEY
3. SUPABASE_SERVICE_ROLE_KEY

# API Keys یہاں سے:
4. GEMINI_API_KEY → https://aistudio.google.com/apikey
5. OPENAI_API_KEY → https://platform.openai.com/api-keys

# پھر Vercel میں:
6. VERCEL_BACKEND_ENV.md copy > Backend deploy
7. VERCEL_FRONTEND_ENV.md copy > Frontend deploy
8. Done! ✅
```

---

**Questions?** پوچھ لو! 💪
