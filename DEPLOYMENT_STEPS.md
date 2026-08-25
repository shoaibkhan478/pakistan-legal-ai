# 🚀 Complete Vercel Deployment Guide - Backend & Frontend

## Quick Summary

You'll deploy:
1. **Backend API** → Vercel (Serverless Functions)
2. **Frontend** → Vercel (Next.js)
3. **Database** → Supabase (PostgreSQL)

**Total time: ~15-20 minutes**

---

## STEP 1: Prepare Supabase Database (5 minutes)

### 1.1 Create Supabase Project

1. Go to **https://app.supabase.com**
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `pakistan-legal-ai`
   - **Database password**: Create a STRONG password (copy it!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
4. Click **"Create New Project"** (Wait 2-3 minutes)

### 1.2 Get Database Connection String

1. After project creates, click **Settings → Database**
2. Find **"Connection string"** section
3. Copy the **PostgreSQL URI**:
   ```
   postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres?sslmode=require
   ```
4. **Save this - you'll need it for Vercel!**

### 1.3 Create Database Tables

1. Go to **SQL Editor** in Supabase
2. Click **"New Query"**
3. Copy ALL content from your repo's `database/schema.sql`
4. Paste into Supabase SQL editor
5. Click **"Run"** button
6. ✅ Tables should be created

### 1.4 Create Storage Bucket

1. Go to **Storage** (left sidebar)
2. Click **"Create New Bucket"**
3. Name: `legal-documents`
4. Make it **Public** ✓
5. Click **Create**

### 1.5 Get Supabase API Keys

1. Go to **Settings → API**
2. Copy these THREE values and save them:
   - **Project URL**: `https://[PROJECT_ID].supabase.co`
   - **anon public key**: `SUPABASE_ANON_KEY`
   - **service_role secret**: `SUPABASE_SERVICE_ROLE_KEY`

---

## STEP 2: Deploy Backend to Vercel (5 minutes)

### 2.1 Go to Vercel

1. Open **https://vercel.com**
2. Sign in with GitHub
3. Click **"Add New..." → "Project"**

### 2.2 Import Repository

1. Click **"Import Project"**
2. Select your repo: `shoaibkhan478/pakistan-legal-ai`
3. Click **Import**

### 2.3 Configure Backend

1. **Project Name**: `pakistan-legal-ai-backend`
2. **Framework Preset**: Node.js
3. **Root Directory**: Select `backend/` ⭐ IMPORTANT
4. **Build Command**: `npm install`
5. **Output Directory**: (leave blank)

### 2.4 Add Environment Variables (CRITICAL!)

Click **"Environment Variables"** and add EACH of these:

| Variable Name | Value | Get From |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres?sslmode=require` | Supabase |
| `DB_HOST` | `YOUR_HOST` (from connection string) | Supabase |
| `DB_PORT` | `5432` | Constant |
| `DB_NAME` | `postgres` | Constant |
| `DB_USER` | `postgres` | Constant |
| `DB_PASSWORD` | Your Supabase password | Supabase |
| `DB_SSL` | `true` | Constant |
| `DB_POOL_MIN` | `1` | Constant |
| `DB_POOL_MAX` | `3` | Constant |
| `JWT_SECRET` | Generate random string* | Generate |
| `JWT_REFRESH_SECRET` | Generate random string* | Generate |
| `GEMINI_API_KEY` | Your Gemini key | https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | Your OpenAI key | https://platform.openai.com/api-keys |
| `SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` | Supabase |
| `SUPABASE_ANON_KEY` | Your anon key | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Supabase |
| `SUPABASE_STORAGE_BUCKET` | `legal-documents` | Constant |
| `NODE_ENV` | `production` | Constant |
| `CORS_ORIGIN` | `https://pakistan-legal-ai.vercel.app` | Will update later |
| `FRONTEND_URL` | `https://pakistan-legal-ai.vercel.app` | Will update later |

**Generate random secrets:**
```bash
# On Mac/Linux terminal:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.5 Deploy Backend

1. Click **"Deploy"** button
2. ⏳ Wait 2-3 minutes for build to complete
3. You'll see: **"Congratulations! Your project has been deployed"**
4. Copy your backend URL (looks like: `https://pakistan-legal-ai-backend.vercel.app`)
5. **Save this URL!**

---

## STEP 3: Deploy Frontend to Vercel (5 minutes)

### 3.1 Create New Vercel Project

1. Go to **https://vercel.com/new**
2. Click **"Add New..." → "Project"**
3. Select your repo again: `shoaibkhan478/pakistan-legal-ai`

### 3.2 Configure Frontend

1. **Project Name**: `pakistan-legal-ai-frontend` (or `pakistan-legal-ai`)
2. **Framework Preset**: Next.js
3. **Root Directory**: Select `frontend/` ⭐ IMPORTANT
4. **Build Command**: `npm run build`
5. **Install Command**: `npm install`
6. **Output Directory**: `.next`

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add:

| Variable Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_BACKEND_URL/api/v1` (use backend URL from Step 2.5) |
| `NEXT_PUBLIC_APP_NAME` | `Pakistan Legal AI Agent` |
| `NEXT_PUBLIC_APP_URL` | `https://pakistan-legal-ai.vercel.app` |

**Example:**
```
NEXT_PUBLIC_API_URL=https://pakistan-legal-ai-backend.vercel.app/api/v1
```

### 3.4 Deploy Frontend

1. Click **"Deploy"** button
2. ⏳ Wait 2-3 minutes for build
3. You'll get: **"Congratulations! Your project has been deployed"**
4. Copy your frontend URL
5. **This is your live app URL!**

---

## STEP 4: Update Backend CORS (2 minutes)

Now that frontend is deployed, update backend's CORS setting:

### 4.1 Update Backend Environment Variable

1. Go to your **backend Vercel project**
2. Click **Settings → Environment Variables**
3. Find `CORS_ORIGIN`
4. Update to: `https://YOUR_FRONTEND_URL.vercel.app`
5. Example: `https://pakistan-legal-ai.vercel.app`
6. Click **Save**
7. **Redeploy**: Click **Deployments → Latest → ... → Redeploy**

---

## STEP 5: Test Your Deployment (2 minutes)

### 5.1 Test Backend

Open in browser:
```
https://YOUR_BACKEND_URL/api/v1/health
```

Should return: `{"status":"ok"}`

### 5.2 Test Frontend

1. Open your frontend URL: `https://pakistan-legal-ai.vercel.app`
2. You should see the **login page** ✅
3. Try logging in with demo account:
   - **Email**: `admin@legalpk.ai`
   - **Password**: `Admin@12345`

### 5.3 Test API Connection

After login, test features:
- ✅ Chat
- ✅ FIR Analysis
- ✅ Legal Drafting
- ✅ Document Upload

---

## STEP 6: Database Initialization (Optional)

If you need to seed demo data:

### Option A: Via Supabase SQL Editor
```sql
-- Run this in Supabase SQL Editor
INSERT INTO users (email, name, role, password_hash, created_at)
VALUES 
  ('admin@legalpk.ai', 'Admin User', 'admin', 'hashed_password', NOW()),
  ('advocate@legalpk.ai', 'Advocate User', 'advocate', 'hashed_password', NOW()),
  ('student@legalpk.ai', 'Student User', 'student', 'hashed_password', NOW());
```

### Option B: Via Backend Script

If backend has seed script:
```bash
cd backend
npm run db:seed
```

---

## 📋 Deployment Checklist

- [ ] **Supabase Setup**
  - [ ] Created project
  - [ ] Got connection string
  - [ ] Ran schema.sql
  - [ ] Created storage bucket
  - [ ] Copied API keys

- [ ] **Backend Deployment**
  - [ ] Created Vercel project (root: `backend/`)
  - [ ] Added all environment variables
  - [ ] Deployment successful
  - [ ] Backend URL obtained

- [ ] **Frontend Deployment**
  - [ ] Created Vercel project (root: `frontend/`)
  - [ ] Added environment variables with correct backend URL
  - [ ] Deployment successful
  - [ ] Frontend URL obtained

- [ ] **Post-Deployment**
  - [ ] Updated backend CORS_ORIGIN
  - [ ] Redeployed backend
  - [ ] Tested backend health endpoint
  - [ ] Tested frontend login page
  - [ ] Tested API connection (chat, analysis, etc.)

---

## Troubleshooting

### Error: "Cannot GET /api/v1"
**Problem**: Backend URL incorrect or backend not deployed
**Solution**:
- Check `NEXT_PUBLIC_API_URL` in frontend environment
- Ensure backend deployment is complete
- Test backend directly: `https://backend-url/api/v1/health`

### Error: "Network error. Is the server running?"
**Problem**: Frontend can't connect to backend (CORS issue)
**Solution**:
- Check backend `CORS_ORIGIN` includes frontend URL
- Make sure backend is redeployed after updating CORS
- Check environment variables in both projects

### Error: "relation 'users' does not exist"
**Problem**: Database schema not created
**Solution**:
- Go to Supabase SQL Editor
- Run the entire `database/schema.sql` file again
- Make sure all queries execute successfully

### Login fails but page loads
**Problem**: Backend connection works, but auth issue
**Solution**:
- Check database tables were created
- Verify JWT_SECRET is same on backend
- Check password hash algorithm matches database

### 502 Bad Gateway or timeout
**Problem**: Backend serverless function timeout or error
**Solution**:
- Check Vercel backend logs: Settings → Deployments → View Build Logs
- Increase function timeout in `backend/vercel.json`
- Check database connection string is correct

---

## Your Live URLs

Once deployed:

| Service | URL |
|---------|-----|
| **Frontend** | `https://pakistan-legal-ai.vercel.app` |
| **Backend API** | `https://pakistan-legal-ai-backend.vercel.app` |
| **Database** | Supabase Dashboard |
| **Admin Panel** | `https://pakistan-legal-ai.vercel.app/admin` |

---

## Next Steps

1. ✅ **Monitor Performance**
   - Check Vercel Analytics
   - Monitor Supabase database usage
   - Review error logs weekly

2. ✅ **Set Up Custom Domain** (Optional)
   - Add domain in Vercel Settings → Domains
   - Update DNS records
   - HTTPS enabled automatically

3. ✅ **Enable Monitoring** (Optional)
   - Set up Vercel Error Tracking
   - Add Sentry for advanced error tracking
   - Monitor logs with ELK or similar

4. ✅ **Scale Database** (When needed)
   - Upgrade Supabase plan
   - Implement caching (Redis)
   - Optimize queries

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **GitHub Issues**: Create issue in your repo

---

**Happy Deploying! 🚀**

*Last Updated: August 2026*
*For: shoaibkhan478/pakistan-legal-ai*
