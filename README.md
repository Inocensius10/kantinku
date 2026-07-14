# KantinKu — Kantin Management System

Modern multi-role frontend for school cafeteria operations. It includes a polished demo mode, responsive dashboards, pre-order flow with WhatsApp handoff, browser-location attendance, reports, forms validated with Zod, and Supabase-ready data access.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Requires Node.js 16 or newer.

Without environment values, the application starts in a local demo state. To use production data, add your Supabase project URL and anon key to `.env`, then run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.

## Roles in demo

The login screen offers Student, Employee, Admin, and Superadmin previews. In production, replace the demo role switch with `supabase.auth.signInWithPassword` and load `profiles.role` into the session context.

## Deployment

Vercel detects Vite automatically: use `npm run build` as the build command and `dist` as the output directory. Add the two `VITE_SUPABASE_*` environment variables in Vercel.
