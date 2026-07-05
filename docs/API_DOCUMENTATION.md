# Pakistan Legal AI Agent — API Documentation

Base URL: `http://localhost:5000/api/v1`

All authenticated routes require either:
- `Authorization: Bearer <accessToken>` header, OR
- `accessToken` httpOnly cookie (set automatically on login)

All responses follow: `{ success: boolean, message?: string, data?: any, errors?: [] }`

---

## Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login | No |
| POST | `/auth/refresh` | Refresh access token | No (refresh token in body) |
| POST | `/auth/logout` | Logout | Yes |
| GET | `/auth/me` | Get current user profile | Yes |

**POST /auth/register**
```json
{ "name": "Ali Khan", "email": "ali@example.com", "password": "Secret123", "role": "advocate" }
```

**POST /auth/login**
```json
{ "email": "ali@example.com", "password": "Secret123" }
```

---

## Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/profile` | Get profile |
| PUT | `/users/profile` | Update profile |
| PUT | `/users/password` | Change password |
| GET | `/users/dashboard-stats` | Dashboard summary stats |
| GET | `/users/usage` | API/token usage by feature |

---

## Chat (AI Legal Chat)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat/message` | Send a chat message, get AI reply |
| GET | `/chat/sessions` | List chat sessions |
| GET | `/chat/sessions/:sessionId` | Get session messages |
| DELETE | `/chat/sessions/:sessionId` | Delete a session |

**POST /chat/message**
```json
{ "message": "What is bail under section 497?", "sessionId": "optional-uuid", "language": "english" }
```

---

## Documents

| Method | Endpoint | Description |
|---|---|---|
| POST | `/documents/upload` | Upload + OCR a document (multipart/form-data) |
| GET | `/documents` | List documents (filters: caseId, type, page, limit) |
| GET | `/documents/:id` | Get document metadata |
| GET | `/documents/:id/text` | Get extracted OCR text |
| DELETE | `/documents/:id` | Delete document |

Upload form fields: `document` (file), `caseId`, `documentType`, `description`.

---

## Analysis

| Method | Endpoint | Description |
|---|---|---|
| POST | `/analysis/fir` | Analyze an FIR (`text` or `documentId`) |
| POST | `/analysis/fir/:analysisId/bail` | Generate bail application from FIR analysis |
| GET | `/analysis/fir` | List FIR analyses |
| POST | `/analysis/notice` | Analyze a legal notice |
| POST | `/analysis/notice/:analysisId/reply` | Generate reply notice |
| POST | `/analysis/judgment` | Analyze a court judgment |
| POST | `/analysis/plaint` | Analyze a plaint/written statement/objection |

**POST /analysis/fir**
```json
{ "text": "FIR full text...", "documentId": "optional-uuid", "caseId": "optional-uuid" }
```

**POST /analysis/fir/:analysisId/bail**
```json
{ "bailType": "pre_arrest", "additionalInfo": "optional context" }
```

---

## Drafts

| Method | Endpoint | Description |
|---|---|---|
| POST | `/drafts/generate` | Generate a legal draft |
| GET | `/drafts` | List drafts |
| GET | `/drafts/:id` | Get a draft |
| PUT | `/drafts/:id` | Update draft content |
| DELETE | `/drafts/:id` | Delete draft |

**POST /drafts/generate**
```json
{
  "draftType": "bail_application",
  "language": "english",
  "title": "Bail Application - Ali Khan",
  "details": { "partyA": "Ali Khan", "partyB": "State", "court": "Sessions Court Lahore", "caseDetails": "..." }
}
```

Valid `draftType` values: `bail_application`, `civil_suit`, `legal_notice`, `reply_notice`,
`written_statement`, `petition`, `affidavit`, `contract`, `appeal`, `pre_arrest_bail`,
`post_arrest_bail`, `objection_reply`, `preliminary_objections`, `appeal_grounds`.

---

## Research

| Method | Endpoint | Description |
|---|---|---|
| POST | `/research` | Run legal research query |
| GET | `/research/history` | Research history |

```json
{ "query": "Grounds for divorce under Pakistani family law", "jurisdiction": "Pakistan" }
```

---

## Student Mode

| Method | Endpoint | Description |
|---|---|---|
| POST | `/student/mcq` | Generate MCQs |
| POST | `/student/viva` | Generate viva questions |
| POST | `/student/notes` | Generate study notes |
| POST | `/student/case-brief` | Generate case brief |
| GET | `/student/resources` | List saved resources |

```json
{ "topic": "Anticipatory Bail", "subject": "Criminal Procedure Code", "count": 10, "difficulty": "intermediate" }
```

---

## Cases

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cases` | List cases |
| POST | `/cases` | Create case |
| GET | `/cases/:id` | Get case + related docs/drafts |
| PUT | `/cases/:id` | Update case |
| DELETE | `/cases/:id` | Delete case |

---

## Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | List notifications |
| GET | `/notifications/unread-count` | Unread count |
| PUT | `/notifications/:id/read` | Mark one as read |
| PUT | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/:id` | Delete notification |

---

## Admin (role: admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Platform-wide statistics |
| GET | `/admin/users` | List/search users |
| PUT | `/admin/users/:id/status` | Activate/suspend user |
| PUT | `/admin/users/:id/role` | Change user role |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/audit-logs` | View audit logs |
| GET | `/admin/subscriptions` | List subscriptions |
| PUT | `/admin/subscriptions/:userId` | Update a user's plan/limits |

---

## Rate Limits

- General API: 100 requests / 15 min per IP
- Auth endpoints (`/auth/login`, `/auth/register`): 10 requests / 15 min per IP
- AI endpoints (chat, analysis, drafts, research, student): 10 requests / minute per IP

## Error Format

```json
{ "success": false, "message": "Human readable error", "errors": [{ "field": "email", "message": "Valid email required" }] }
```

## Disclaimer

All AI-generated content returned by analysis/draft/research endpoints includes the mandatory legal disclaimer
appended to the response text: *"AI-generated content is for legal research, drafting assistance and educational
purposes only. All drafts must be reviewed by a qualified advocate before legal use."*
