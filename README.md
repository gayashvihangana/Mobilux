# Mobilux — Fix. Track. Trust.

Smart phone repair management & e-commerce platform for a Colombo repair shop.
Customers submit repair requests, track live status, pay in LKR by bank
transfer, earn loyalty discounts, and shop accessories & pre-owned phones.
The owner runs everything from an admin panel.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Prisma · PostgreSQL · Auth.js v5 · Vercel Blob

## Local development

```bash
# 1. Start the database (Docker)
docker run -d --name mobilux-db -e POSTGRES_PASSWORD=mobilux_dev \
  -e POSTGRES_USER=mobilux -e POSTGRES_DB=mobilux -p 5432:5432 \
  -v mobilux-pgdata:/var/lib/postgresql/data postgres:17-alpine

# 2. Install & set up
npm install
cp .env.example .env        # defaults already match the Docker DB
npx prisma migrate dev
npm run db:seed

# 3. Run
npm run dev
```

Seed logins:

| Role     | Email               | Password      |
| -------- | ------------------- | ------------- |
| Admin    | admin@mobilux.lk    | Admin@123     |
| Customer | kasun@example.com   | Customer@123  |

## Deploying to Vercel

1. Push this repo to GitHub and **import it at [vercel.com/new](https://vercel.com/new)**.
2. In the Vercel project → **Storage**:
   - Add a **Neon Postgres** database (Marketplace) — this auto-sets `DATABASE_URL`.
   - Add a **Blob** store — this auto-sets `BLOB_READ_WRITE_TOKEN` (file uploads).
3. In **Settings → Environment Variables** add:
   - `AUTH_SECRET` — generate with `npx auth secret` or `openssl rand -base64 32`
   - `AUTH_TRUST_HOST` = `true`
4. Deploy. The `vercel-build` script runs `prisma migrate deploy` automatically,
   so the schema is created on first deploy.
5. Seed the production admin user once (from your machine, using the Neon URL):
   ```bash
   DATABASE_URL="<neon-url>" npm run db:seed
   ```

Before going live, update the real bank account details in
[`src/lib/config.ts`](src/lib/config.ts).
