# 🚀 Vercel + Supabase Deployment Guide

## Overview

This guide covers deploying **Pakistan Legal AI** on Vercel (frontend) with Supabase as the database and storage backend.

**Architecture:**
- **Frontend**: Next.js 14 → Vercel
- **Backend**: Node.js/Express → Vercel Serverless Functions
- **Database**: PostgreSQL → Supabase
- **Storage**: Files → Supabase Storage (or AWS S3)
- **Redis**: Upstash Redis (optional, for rate limiting)

---

## Prerequisites

1. **GitHub Account** - Repository already linked
2. **Vercel Account** - https://vercel.com (free)
3. **Supabase Account** - https://supabase.com (free tier available)
4. **API Keys**:
   - Google Gemini (free) - https://aistudio.google.com/apikey
   - OpenAI (embeddings) - https://platform.openai.com/api-keys
   - (Optional) Anthropic Claude
   - (Optional) Upstash Redis - https://upstash.com

---

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `pakistan-legal-ai`
   - **Database password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **Create New Project** (wait 2-3 minutes)

### 1.2 Get Connection String

1. In your Supabase project, go to **Settings → Database**
2. Look for **Connection String** (URI)
3. Copy the PostgreSQL connection string:
   ```
   postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
   ```
4. Save for later

### 1.3 Create Database Schema

1. In Supabase, open **SQL Editor**
2. Click **New Query**
3. Copy contents from `database/schema.sql` (your repo)
4. Paste into the editor
5. Click **Run**
6. Tables should now be created ✅

### 1.4 Set Up Storage Bucket

1. In Supabase, go to **Storage**
2. Click **Create New Bucket**
3. Name: `legal-documents`
4. Check **Public bucket** (or adjust as needed)
5. Click **Create**

### 1.5 Get Supabase API Keys

1. Go to **Settings → API**
2. Copy:
   - **Project URL**: `https://[PROJECT_ID].supabase.co`
   - **anon public**: `SUPABASE_ANON_KEY`
   - **service_role secret**: `SUPABASE_SERVICE_ROLE_KEY`
3. Save all three for later

---

## Step 2: Deploy Backend to Vercel

### 2.1 Prepare Backend for Serverless

The backend is already configured for Vercel serverless functions.

Check files:
- ✅ `backend/vercel.json` - Vercel config
- ✅ `api/index.js` or handler - Entry point for serverless

If missing, we'll create them.

### 2.2 Deploy Backend

#### Option A: Deploy as Separate Vercel Project (Recommended)

```bash
# 1. Push code to GitHub (already done)
# 2. Go to https://vercel.com/new
# 3. Import your repository
# 4. Select "Root Directory": backend
# 5. Add Environment Variables (see Step 3)
# 6. Click Deploy
```

#### Option B: Deploy as Part of Monorepo

```bash
# Use root-level vercel.json configuration
# Vercel will auto-detect frontend & backend
```

---

## Step 3: Add Environment Variables to Vercel

### For Backend (if separate project):

1. In Vercel project settings → **Environment Variables**
2. Add each variable:

| Key | Value | Source |
|-----|-------|--------|
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres?sslmode=require` | Supabase |
| `DB_HOST` | `YOUR_HOST` | Supabase |
| `DB_PORT` | `5432` | Constant |
| `DB_USER` | `postgres` | Constant |
| `DB_PASSWORD` | Your Supabase password | Supabase |
| `DB_SSL` | `true` | Constant |
| `JWT_SECRET` | Generate random 32+ char string | Generate |
| `JWT_REFRESH_SECRET` | Generate random 32+ char string | Generate |
| `GEMINI_API_KEY` | Your Gemini API key | https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | Your OpenAI API key | https://platform.openai.com/api-keys |
| `SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` | Supabase |
| `SUPABASE_ANON_KEY` | Your anon key | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Supabase |
| `SUPABASE_STORAGE_BUCKET` | `legal-documents` | Created in Step 1.4 |
| `CORS_ORIGIN` | `https://YOUR_FRONTEND_URL.vercel.app` | Will be Vercel URL |
| `FRONTEND_URL` | `https://YOUR_FRONTEND_URL.vercel.app` | Will be Vercel URL |
| `NODE_ENV` | `production` | Constant |

### Generate Random Secrets

Use this in your terminal:
```bash
# Linux/Mac
openssl rand -base64 32

# Node.js alternative
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Deploy Frontend

1. Go to https://vercel.com/new
2. Import your repository
3. Select **Root Directory**: `frontend`
4. Add Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_BACKEND_VERCEL_URL/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | `Pakistan Legal AI Agent` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR_FRONTEND_VERCEL_URL` |

5. Click **Deploy**

### 4.2 Update Backend CORS

After frontend deploys, update backend environment variable:
- `CORS_ORIGIN` = Your frontend Vercel URL

---

## Step 5: Database Initialization

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel env pull

# Connect to Supabase and run migrations
npm run db:migrate
npm run db:seed
```

### Option B: Manual Setup in Supabase

1. In Supabase SQL Editor, run:

```sql
-- Run queries from database/schema.sql
-- Then seed demo data as needed
INSERT INTO users (email, name, role, password_hash)
VALUES 
  ('admin@legalpk.ai', 'Admin', 'admin', 'hashed_password'),
  ('advocate@legalpk.ai', 'Advocate', 'advocate', 'hashed_password'),
  ('student@legalpk.ai', 'Student', 'student', 'hashed_password');
```

---

## Step 6: Testing

### 6.1 Test Backend API

```bash
# Health check
curl https://YOUR_BACKEND_VERCEL_URL/api/v1/health

# Login endpoint
curl -X POST https://YOUR_BACKEND_VERCEL_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@legalpk.ai","password":"Admin@12345"}'
```

### 6.2 Test Frontend

1. Navigate to your frontend URL
2. Login with demo account:
   - Email: `admin@legalpk.ai`
   - Password: `Admin@12345`
3. Test features (chat, analysis, drafting)

---

## Step 7: Production Optimization

### 7.1 Enable Auto-scaling

In Vercel Project Settings:
- **Serverless Function Max Duration**: 60 seconds
- **Memory**: 1024 MB (default)

### 7.2 Add Custom Domain

1. In Vercel → **Settings → Domains**
2. Add your domain (e.g., `legalpk.ai`)
3. Update DNS records as instructed

### 7.3 Set Up Monitoring

1. **Vercel Analytics**: Auto-enabled
2. **Supabase Logs**: Check in Supabase dashboard
3. **Error Tracking**: Optional (Sentry, LogRocket)

---

## Troubleshooting

### Backend Connection Issues

**Error**: `Connection refused` or `ECONNREFUSED`

**Solution**:
- Check `DATABASE_URL` is correct (Supabase format with `?sslmode=require`)
- Verify Supabase project is running
- Check firewall allows Vercel IPs (Supabase should auto-allow)

### Frontend Can't Connect to Backend

**Error**: `CORS error` or `Cannot GET /api/v1`

**Solution**:
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend `CORS_ORIGIN` includes frontend URL
- Ensure backend is deployed and running

### Environment Variables Not Loading

**Error**: `undefined API key` or similar

**Solution**:
```bash
# Re-deploy with environment variables
vercel env pull
vercel deploy --prod
```

### Database Migrations Fail

**Error**: `relation "users" does not exist`

**Solution**:
1. Run schema.sql again in Supabase SQL Editor
2. Or use backend migration script:
   ```bash
   cd backend && npm run db:migrate
   ```

---

## Monitoring & Maintenance

### Weekly Checks

- [ ] Monitor Vercel deployment logs for errors
- [ ] Check Supabase database usage
- [ ] Review API rate limiting metrics
- [ ] Check error logs for exceptions

### Monthly Tasks

- [ ] Update dependencies: `npm update`
- [ ] Review security: Check for vulnerabilities
- [ ] Backup database: Supabase auto-backs up daily
- [ ] Monitor costs: Vercel & Supabase usage

---

## Cost Estimation (Monthly)

| Service | Free Tier | Estimated Cost |
|---------|-----------|-----------------|
| Vercel | 100GB bandwidth | $0-20 |
| Supabase | 500MB DB + 1GB storage | $0-25 |
| Gemini API | 15 RPM | $0 |
| OpenAI Embeddings | $0.02 per 1M tokens | $0-10 |
| **Total** | - | **~$0-50** |

---

## Next Steps

1. ✅ Set up Supabase database
2. ✅ Deploy backend to Vercel
3. ✅ Deploy frontend to Vercel
4. ✅ Test all features
5. ✅ Set up monitoring
6. ✅ Add custom domain
7. ✅ Enable backup/disaster recovery

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Project Issues**: Check GitHub issues

---

**Last Updated**: August 2026  
**Maintained By**: Shoaib Khan  
**Questions?** Open an issue on GitHub
