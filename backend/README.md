# Backend (NestJS + Prisma + PostgreSQL)

## 1) Install

```bash
npm install
cp .env.example .env
```

## 2) Start infra (db + redis)

```bash
docker compose up -d postgres redis
```

## 3) Prisma generate + migrate + seed

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

`prisma:seed` is non-destructive by default and ensures one manager account from:
`MANAGER_EMAIL`, `MANAGER_PASSWORD`, `MANAGER_NAME`, `MANAGER_DEPARTMENT`.

If you explicitly want a full reset before seeding, run:

```bash
SEED_RESET_ALL=true npm run prisma:seed
```

## 4) Run API on :3001

```bash
npm run start:dev
```

## 5) Optional full stack in compose (includes API)

```bash
docker compose up --build
```

## API docs

- Swagger: `http://localhost:3001/docs`

## Notes

- CORS origin is controlled by `CORS_ORIGIN` in `.env` (defaults to Vite dev server `http://localhost:5173`).
