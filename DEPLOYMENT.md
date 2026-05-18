# Deployment — live shared state (Neon + Vercel)

The app is now **multi-user and live**: all data lives in a Neon Postgres
database behind serverless API functions, and every browser polls for changes
every ~3 seconds, so an edit on one device shows up for everyone within a few
seconds. There is no per-user login — anyone with the link can view and edit
(the chosen access model).

## Architecture

- **DB:** Neon serverless Postgres. One table `app_state` holding a single
  JSONB document (`data`, `version`, `updated_at`).
- **API (`/api/*`, Vercel functions):**
  - `GET  /api/state`  → `{ data, version }` (data is `null` until seeded)
  - `POST /api/state`  → full replace (seed-init / import / reset)
  - `GET  /api/version`→ `{ version }` (cheap, polled)
  - `POST /api/mutate` → applies one mutation atomically (read → apply same
    pure reducer the browser used → compare-and-swap on `version`, retrying on
    conflict so concurrent edits never clobber each other)
- **Frontend:** unchanged UI. The Zustand store applies each change
  optimistically, ships it to `/api/mutate`, and a background poller pulls
  fresh state when the server `version` changes.

## One-time setup (you must do this)

### 1. Create the Neon database
1. Sign up at https://neon.tech and create a project (any region).
2. In the project: **Connection Details → Pooled connection**. Copy the
   string. It looks like:
   `postgresql://user:pass@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require`
   (use the **pooled** one — host contains `-pooler`).
   No schema/table creation needed — the API creates the table automatically.

### 2. Deploy to Vercel
1. Sign up at https://vercel.com and **Add New → Project**, importing this Git
   repository. Set the **Root Directory** to `nwa-tracker` if Vercel doesn't
   detect it automatically. Framework preset = **Vite** (auto-detected).
2. In **Project → Settings → Environment Variables**, add (Production +
   Preview + Development):
   - `DATABASE_URL` = the Neon **pooled** connection string from step 1.
3. **Deploy.** First load auto-seeds the database from `seed_data.json`.

That's it — share the Vercel URL with the team. Edits sync for everyone.

> The old GitHub Pages workflow was removed: GitHub Pages is static-only and
> can't run the API, so the app must be served from Vercel (frontend + API
> together, same origin).

## Local development

The plain `npm run dev` (Vite, port 5173) does **not** serve `/api`. Two ways:

- **Recommended — run the real functions locally:**
  ```
  npm i -g vercel
  vercel link            # once, link to the Vercel project
  vercel env pull .env   # pulls DATABASE_URL into nwa-tracker/.env
  vercel dev             # serves frontend + /api together
  ```
- **Quick — point the dev server at the deployed API:** create
  `nwa-tracker/.env` with `VITE_API_BASE=https://<your-app>.vercel.app`, then
  `npm run dev`. (Writes will hit the live database.)

See `.env.example` for the variables.

## Data admin

- **Export JSON** (Admin → Settings) still downloads a snapshot of current
  state.
- **Import JSON** / **Reset to seed** now write to the shared database (they
  replace state for *everyone*), not just the local browser.
