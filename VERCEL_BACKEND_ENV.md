# 🚀 VERCEL BACKEND - COPY PASTE ENVIRONMENT VARIABLES
# تمام variables یہاں ہیں - بس copy کریں اور Vercel میں paste کریں!

# ============================================================
# SERVER CONFIGURATION
# ============================================================
NODE_ENV=production
PORT=5000
API_VERSION=v1

# ============================================================
# DATABASE - SUPABASE سے لیں
# ============================================================
# Supabase > Settings > Database > Connection String میں جاؤ
# اور یہ values وہاں سے copy کریں:

DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres?sslmode=require
DB_HOST=[YOUR_HOST]
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR_PASSWORD]
DB_SSL=true
DB_POOL_MIN=1
DB_POOL_MAX=3

# ============================================================
# JWT SECRETS - یہ random ہیں (تبدیل نہ کریں)
# ============================================================
JWT_SECRET=aB3fH7kL9mN2pQ5sT8vW1xZ4cD6eG0jKrUsYaBcDeFgHiJkLmNoPqRsTuVwXyZ1a2b3c4d5e6f7g8h9
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=zY9wX8vU7tS6rQ5pO4nM3lK2jI1hG0fE9dC8bA7aZ6yY5xW4vU3tS2rQ1pO0nM9lK8jI7hG6fE5dC4bA3
JWT_REFRESH_EXPIRES_IN=30d

# ============================================================
# AI SERVICES
# ============================================================
# GOOGLE GEMINI - https://aistudio.google.com/apikey سے copy کریں
GEMINI_API_KEY=[آپ کی GEMINI KEY]
GEMINI_MODEL=gemini-2.0-flash

# OpenAI - https://platform.openai.com/api-keys سے copy کریں
OPENAI_API_KEY=[آپ کی OPENAI KEY]
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Anthropic Claude (اختیاری)
ANTHROPIC_API_KEY=[آپ کی ANTHROPIC KEY]
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4096

# ============================================================
# SUPABASE STORAGE
# ============================================================
# Supabase > Settings > API سے copy کریں
SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
SUPABASE_STORAGE_BUCKET=legal-documents

# ============================================================
# FILE UPLOAD
# ============================================================
UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=50mb
ALLOWED_FILE_TYPES=pdf,png,jpg,jpeg,tiff,docx,doc
ENCRYPTION_KEY=aBcDeFgHiJkLmNoPqRsStUvWxYzAbCdEfGhIjKlMnOp

# ============================================================
# OCR CONFIGURATION
# ============================================================
OCR_PROVIDER=tesseract
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANG=eng+urd

# ============================================================
# EMAIL (اختیاری)
# ============================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[آپ کی EMAIL]
SMTP_PASS=[آپ کا APP PASSWORD]
EMAIL_FROM=Pakistan Legal AI <noreply@legalpk.ai>

# ============================================================
# REDIS (اختیاری)
# ============================================================
REDIS_URL=[آپ کا REDIS URL]
REDIS_PASSWORD=[اگر ہے تو password]

# ============================================================
# RATE LIMITING
# ============================================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================================
# CORS - FRONTEND URL
# ============================================================
CORS_ORIGIN=https://pakistan-legal-ai.vercel.app
CORS_CREDENTIALS=true

# ============================================================
# URLs
# ============================================================
FRONTEND_URL=https://pakistan-legal-ai.vercel.app
BACKEND_URL=https://pakistan-legal-ai-backend.vercel.app

# ============================================================
# LOGGING
# ============================================================
LOG_LEVEL=info
LOG_FILE=/tmp/app.log

# ============================================================
# SECURITY
# ============================================================
BCRYPT_ROUNDS=12
SESSION_SECRET=sEcReT_kEy_FoR_sEsSiOn_MaNaGeMeNt_1234567890
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=strict

# ============================================================
# ADMIN
# ============================================================
ADMIN_EMAIL=admin@legalpk.ai
ADMIN_SECRET_KEY=AdMiN_sEcReT_kEy_1234567890_XyZ_AbC_DeF_GhI
