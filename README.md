# Platform Admin UI

Internal ops console for Platform V2. **Not** customer-facing — use [platform-ui](../platform-ui).

| Talks to | Port | Purpose |
|----------|------|---------|
| [compliance-engine](../compliance-engine) | 8090 | `/v1/admin/*` (super_admin only) |

Runs on **http://localhost:5174** (customer UI uses 5173).

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

### Auth

- **Supabase:** same project as platform-ui; membership must have `super_admin` role
- **Dev headers:** `VITE_AUTH_MODE=dev_headers` + `VITE_DEV_ROLE=super_admin`

### Promote a user to super_admin

```bash
cd compliance-engine
python scripts/promote_membership_role.py \
  --auth-subject YOUR_SUPABASE_USER_UID \
  --role super_admin
```

## Routes

| Route | Page |
|-------|------|
| `/login` | Sign in |
| `/` | Platform overview (queues, tenant count) |
| `/tenants` | Tenant list + create |
| `/tenants/:id` | Memberships + suspend |
| `/ops` | Failed / recent scans (cross-tenant) |
