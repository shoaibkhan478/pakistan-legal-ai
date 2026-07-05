# Pakistan Legal AI Agent — Installation Guide

Full-stack AI legal assistant for Pakistan. Next.js frontend + Node/Express backend + PostgreSQL + Claude AI.

## 1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+ (optional but recommended for caching/rate limiting)
- An Anthropic API key (https://console.anthropic.com)
- (Optional) Docker + Docker Compose for containerized deployment
- (Optional) Tesseract OCR for scanned image text extraction

> ⚠️ **Next.js version note**: This project pins `next@14.2.35`, the final patched release on the 14.x line.
> **Next.js 14 reached end-of-life in October 2025 and several active advisories have no fix on 14.x**, including
> an Image Optimization DoS (GHSA-h64f-5h5j-jqjh), a WebSocket-upgrade SSRF (GHSA-c4j6-fc7j-m34r), RSC cache
> poisoning (GHSA-wfc6-r584-vfw7), and an i18n middleware bypass (GHSA-36qx-fr4f-26g5) — run `npm audit` in
> `frontend/` to see the current list. **Before any production deployment**, upgrade to a supported Next.js
> 15.x/16.x release: run `npx @next/codemod@canary upgrade latest` from the `frontend/` directory, re-test all
> pages (especially the App Router data-fetching and middleware behavior, which changed across majors), and
> confirm `npm audit` is clean before going live.


## 2. Local Development Setup (without Docker)

### 2.1 Clone & install

```bash
cd pakistan-legal-ai

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY etc.

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL
```

### 2.2 Database setup

Create the database and load the schema:

```bash
createdb pakistan_legal_ai
psql -d pakistan_legal_ai -f ../database/schema.sql
```

This also seeds 3 demo accounts (password `Admin@12345`):
- admin@legalpk.ai (admin role)
- advocate@legalpk.ai (advocate role)
- student@legalpk.ai (student role)

> ⚠️ Change these passwords / remove seed data before going to production.

### 2.3 Run the apps

```bash
# Terminal 1 - backend
cd backend
npm run dev      # starts on http://localhost:5000

# Terminal 2 - frontend
cd frontend
npm run dev       # starts on http://localhost:3000
```

Visit `http://localhost:3000`.

## 3. Docker Deployment (recommended for production)

```bash
cd pakistan-legal-ai
cp .env.example .env
# Edit .env with real secrets and your Anthropic API key

docker-compose up -d --build
```

This starts: PostgreSQL, Redis, Backend API, Frontend, and Nginx reverse proxy.

- Frontend: http://localhost (via Nginx) or http://localhost:3000 directly
- Backend API: http://localhost/api/v1 or http://localhost:5000/api/v1
- Health check: http://localhost/health

To view logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

To stop:
```bash
docker-compose down          # keep data volumes
docker-compose down -v       # remove data volumes too (destructive)
```

## 4. OCR Setup (Tesseract)

For scanned PDF / image OCR support, install Tesseract on the backend host (already included in the backend Dockerfile):

```bash
# Ubuntu/Debian
sudo apt install tesseract-ocr tesseract-ocr-urd tesseract-ocr-eng

# macOS
brew install tesseract tesseract-lang
```

The backend's `document.routes.js` uses `pdf-parse` for digital PDFs out of the box. Scanned image/PDF OCR is
stubbed (`extractText()` returns an empty result for image mimetypes) and needs to be wired up before going to
production with scanned documents. The `node-tesseract-ocr` npm wrapper was intentionally **not** included as a
dependency — it has an unpatched critical OS command-injection advisory (GHSA-8j44-735h-w4w2). Instead, shell out
directly to the `tesseract` CLI binary (installed via the backend Dockerfile / system package) using
`execFile` (not `exec`) with strictly validated, non-shell-interpolated arguments, or use a maintained
alternative such as `tesseract.js` (pure JS/WASM, no shell invocation).

## 5. Environment Variables Reference

See `backend/.env.example` and `frontend/.env.example` for the full list. Critical ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Random 32+ character secrets |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` (default) |
| `CORS_ORIGIN` | Frontend URL(s), comma separated |
| `NEXT_PUBLIC_API_URL` | Backend API base URL for frontend |

## 6. Production Checklist

- [ ] Change all default passwords and JWT secrets
- [ ] Remove or change seeded demo accounts
- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_SECURE=true` once served over HTTPS
- [ ] Configure SSL certificates (Let's Encrypt via certbot) and enable HTTPS block in `deployment/nginx.conf`
- [ ] Set up automated PostgreSQL backups
- [ ] Configure SMTP for email verification / password reset
- [ ] Set sensible rate limits for your expected traffic
- [ ] Review and tighten CORS origins
- [ ] Enable monitoring/log aggregation (e.g. via the `logs/` volume)

## 7. Project Structure

```
pakistan-legal-ai/
├── frontend/           Next.js 14 app (App Router) + Tailwind CSS
├── backend/             Node.js + Express REST API
├── database/             PostgreSQL schema.sql
├── docs/                  API documentation
├── deployment/        Nginx config, SSL certs folder
└── docker-compose.yml
```

See `docs/API_DOCUMENTATION.md` for the full API reference.
