# Customer Feedback System (Multi-tenant) — Template

This is a **starter template** for a multi-tenant Customer Feedback / Customer Intelligence platform.
- **Platform**: SYSTEM_ADMIN manages organizations (shops/clinics/schools/etc).
- **Tenant**: ORG_ADMIN/STAFF operate inside an organization.
- **Public QR**: customers submit feedback with **no login** via a QR token.

## Quick start

### 1) Server
```bash
cd server
cp .env.example .env
npm i
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

Seed prints a demo QR token in logs. Use it like:
- GET `/api/public/q/<TOKEN>`
- POST `/api/public/q/<TOKEN>/submit`

### 2) Client
The client folder is a **UI scaffold** (React + Vite + TanStack Query) ready for:
- Public QR form page
- Admin dashboard shell

You can wire it to your existing SMS UI kit (shadcn + routing) fast.

## Tenant selection (Multi-tenant)
- SYSTEM_ADMIN selects tenant by sending `X-Org-Id: <orgId|orgCode>` header.
- ORG users must be members; they can also send `X-Org-Id` if they belong to multiple orgs.

---
Author: Ehud Mwai Nyamu (GlimmerInk Creations)
