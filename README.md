# ⚖️ Pakistan Legal AI Agent

A full-stack, AI-powered legal assistant SaaS for Pakistan — analyze FIRs, legal notices, plaints and judgments;
generate professional legal drafts; conduct legal research; and help law students prep for exams. Built with
Next.js, Node/Express, PostgreSQL, and Claude AI.

> ⚖️ **Disclaimer**: AI-generated content is for legal research, drafting assistance and educational purposes
> only. All drafts must be reviewed by a qualified advocate before legal use.

## Features

- **AI Legal Chat** — English, Urdu, Roman Urdu, with conversation memory
- **FIR Analyzer** — sections, allegations, timeline, bail possibility, defence suggestions, pre/post-arrest bail drafts
- **Legal Notice Analyzer** — summary, legal issues, demands, reply notice generation
- **Judgment Analyzer** — facts, issues, findings, decision, appeal grounds
- **Plaint / Objection Analyzer** — claims, evidence required, preliminary objections
- **Drafting Assistant** — bail applications, suits, notices, petitions, affidavits, contracts, appeals
- **Legal Research** — statute & case law research with history
- **Case Management** — track cases, documents, drafts, status, hearings
- **Law Student Mode** — MCQs, viva questions, study notes, case briefs
- **Admin Panel** — user management, platform analytics, audit logs
- **Security** — JWT auth, bcrypt hashing, RBAC, audit logs, document storage isolation
- **UI** — professional legal theme, light/dark mode, English/Urdu interface, responsive

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, Recharts
- **Backend**: Node.js, Express, PostgreSQL (pg), Redis, JWT, Multer, pdf-parse
- **AI**: Anthropic Claude (claude-sonnet-4-6) via `@anthropic-ai/sdk`
- **Deployment**: Docker, Docker Compose, Nginx

## Quick Start

```bash
# 1. Database
createdb pakistan_legal_ai
psql -d pakistan_legal_ai -f database/schema.sql

# 2. Backend
cd backend && npm install && cp .env.example .env   # edit .env
npm run dev

# 3. Frontend
cd ../frontend && npm install && cp .env.example .env.local
npm run dev
```

Or with Docker:

```bash
cp .env.example .env   # edit secrets
docker-compose up -d --build
```

Full guide: [`docs/INSTALLATION.md`](docs/INSTALLATION.md)
API reference: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

## Project Structure

```
pakistan-legal-ai/
├── frontend/          Next.js app — all pages, components, stores
│   └── src/
│       ├── app/            Pages (dashboard, chat, fir-analysis, drafting, admin, ...)
│       ├── components/   UI, layout, legal-specific components
│       └── lib/              API client, auth store, theme store
├── backend/            Express API
│   └── src/
│       ├── controllers/  Auth controller
│       ├── routes/         All REST routes
│       ├── services/      ai.service.js (Claude integration)
│       ├── middleware/  auth, rate limiting, error handling, validation
│       └── config/        Database & Redis config
├── database/            schema.sql — full PostgreSQL schema + seed data
├── docs/                  Installation guide + API docs
└── deployment/        Nginx config, Docker Compose
```

## Demo Accounts (seeded, password: `Admin@12345`)

| Email | Role |
|---|---|
| admin@legalpk.ai | admin |
| advocate@legalpk.ai | advocate |
| student@legalpk.ai | student |

> Change or remove these before production use.

## License

Proprietary — built for demonstration purposes. Review all generated legal content with a qualified advocate.
