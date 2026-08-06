# Ethan's Tools

Personal tools app for todos, finances, and health. Built with Next.js, Tailwind, and Supabase.

## Setup

```bash
cd web
npm install
```

Create `web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Database migrations

Run these in the Supabase SQL editor (in order), or use the ones already applied via MCP:

1. [`web/supabase/migrations/001_phase1_todos_nullable.sql`](web/supabase/migrations/001_phase1_todos_nullable.sql) — undated backlog todos
2. [`web/supabase/migrations/002_phase2_finance_and_health.sql`](web/supabase/migrations/002_phase2_finance_and_health.sql) — finance + health tables + RLS (or skip finance if using 005)
3. [`web/supabase/migrations/005_finance_tables.sql`](web/supabase/migrations/005_finance_tables.sql) — finance tables + RLS
4. [`web/supabase/migrations/006_finance_migrate_legacy.sql`](web/supabase/migrations/006_finance_migrate_legacy.sql) — migrate `expenses` / `subscriptions` → new finance tables

## Develop

```bash
cd web
npm run dev
```

## Routes

- `/` — marketing homepage
- `/login`, `/signup` — auth
- `/app` — tool hub
- `/todo`, `/finances`, `/health` — trackers
