# NPHI E-Learning LMS

A full-stack Learning Management System for professional training with strict role-based access control, course authoring, learner progress tracking, and reporting.

## Stack
- Frontend: `Vite`, `React`, `TypeScript`, `Tailwind CSS`
- Backend: `NestJS`, `Prisma`
- Data: `PostgreSQL`, `Redis`
- Auth: `JWT access + refresh token rotation`
- API docs: `Swagger` at `/docs`

## Core Features
- Secure auth: register, login, refresh, logout, forgot/reset password.
- RBAC with jurisdiction-based visibility.
- Course authoring with modules:
  - `video`, `pdf`, `ppt`, `word`, `assignment`, `quiz`
- Rich text editor with formatting controls, tables, figures, and image upload.
- Video support:
  - Upload local videos
  - YouTube embed playback inside course page
- Learner progress, assignment submissions, quizzes, certificates.
- Manager-level user administration.
- Scoped reporting and analytics.
- Course import from `.txt`, including quiz-question parsing for auto-marking.

## Role Model
- `manager`
- `admin` (shown as `Instructor` in UI)
- `learner`

## RBAC Summary
- Manager:
  - Can manage users and platform operations.
  - Can create and manage instructor accounts.
  - Can export/backup data.
- Instructor (`admin` role):
  - Cannot access Users management.
  - Can only view/manage courses in own jurisdiction.
  - Sees scoped reports only (no global cross-tenant data).
  - Cannot enroll as instructor in courses.
- Learner:
  - Can enroll, learn, submit assignments, take quizzes, earn certificates.
  - Cannot access users/reports management.

## Repository Structure
- `src/` Frontend application
- `backend/` NestJS API server
- `backend/prisma/` Prisma schema, migrations, and seed

## Prerequisites
- `Node.js` 18+
- `npm`
- `Docker` + `Docker Compose` (recommended for Postgres/Redis)

## Environment Configuration

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:3001
```

### Backend (`backend/.env`)
Use `backend/.env.example` as base.

Important variables:
- `PORT=3001`
- `DATABASE_URL=...`
- `REDIS_URL=redis://localhost:6379`
- `CORS_ORIGIN=http://localhost:5173`
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `MANAGER_EMAIL=...`
- `MANAGER_PASSWORD=...`
- `MANAGER_NAME=...`
- `MANAGER_DEPARTMENT=...`

## Quick Start

### 1) Start infrastructure
```bash
cd backend
docker compose up -d postgres redis
```

### 2) Install dependencies
```bash
# backend
cd backend
npm install

# frontend (root)
cd ..
npm install
```

### 3) Initialize backend
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Seed behavior:
- Non-destructive by default.
- Ensures one manager account from `MANAGER_*` env vars.
- No demo learner/instructor accounts.
- Optional full reset only when explicitly requested:
  - `SEED_RESET_ALL=true npm run prisma:seed`

### 4) Run backend
```bash
cd backend
npm run start:dev
```

Backend URLs:
- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`

### 5) Run frontend
```bash
npm run dev
```

Frontend URL:
- `http://localhost:5173` (or next free port if occupied)

## Build Commands

### Frontend
```bash
npm run build
```

### Backend
```bash
cd backend
npm run build
```

## Upload Support
- Thumbnail/image uploads:
  - `jpg`, `jpeg`, `png`, `svg`, `webp`
  - Up to 15MB
- Document uploads:
  - `pdf`, `ppt`, `pptx`, `doc`, `docx`
- Video uploads:
  - Browser-supported video file types (`video/*`)

## Course Import From `.txt`
Supports auto-creation of courses and modules.

### Required metadata fields
- `Title:`
- `Category:`
- `Instructor:`
- `Duration:`
- `CPD Points:`
- `Level:` (`Beginner`, `Intermediate`, `Advanced`)
- `Description:`

### Module line format
```txt
Module: <type> | <module title> | <module content>
```

Allowed `<type>`:
- `video`
- `pdf`
- `ppt`
- `word`
- `assignment`
- `quiz`

### Quiz auto-marking from `.txt`
The importer parses quiz questions and correct answers.

Supported options:
- Question block style (`Question`, options `A)`, `B)`, ..., `Answer:`)
- Single-line style (`Q: ... | opt1 | opt2 | opt3 | opt4 | answer:A`)
- JSON array of questions in module content

`correctAnswer` handling:
- Accepts letters (`A`, `B`, `C`, `D`) or numbers (`1`, `2`, ...)
- Internally normalized to zero-based index

Passing score:
- Include text like `passing score: 80` in quiz content.

## Troubleshooting

### Thumbnail upload still failing
1. Restart backend after validator changes:
   - `cd backend && npm run start:dev`
2. Restart frontend:
   - `npm run dev`
3. Hard refresh browser (`Ctrl+F5`).

### Port already in use
- Frontend auto-switches to next free port.
- Backend error `EADDRINUSE :3001`:
  - Stop previous backend process or change `PORT` in `backend/.env`.

### Login fails with valid credentials
- Ensure backend is running and reachable at `VITE_API_URL`.
- Ensure manager exists (run `prisma:seed` after setting `MANAGER_*` env vars).

## Additional Backend Docs
Detailed backend-only setup and commands:
- `backend/README.md`

## Deployment (Recommended)
- Frontend: Netlify
- Backend: Render
- Guide: `DEPLOY_NETLIFY_RENDER.md`
