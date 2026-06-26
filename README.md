# admin-ui

Internal **operations console** for Platform V2 — `super_admin` only.

Separate app and ingress from customer `platform-ui`.

## API

Calls **compliance-engine** admin routes:

- `/v1/admin/tenants`
- `/v1/admin/users`
- `/v1/admin/scans` (debug, failed jobs, DLQ)
- `/v1/admin/queue`

## Auth

JWT — **`super_admin` only**. Other roles must use `platform-ui`.

## Related repos

| Repo | Role |
|------|------|
| **compliance-engine** | Backend API + admin routes |
| **admin-ui** | **This repo** |
| **platform-ui** | Customer dashboard |

## Planning

**infra-state-docs/new arch/docs/** — `PLATFORM_ARCHITECTURE.md` (separate ALB / ingress)

Reference patterns: legacy `compliance-admin-ui` (ideas only).

## Stack (TBD at implementation)

Likely: React + TypeScript + Vite (match platform-ui).

## Local dev (after scaffold)

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Status

Initial repo scaffold — Phase 4. Ops can use API/kubectl until then.
