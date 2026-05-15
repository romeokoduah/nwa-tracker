# NWA Tracker

A production-grade React dashboard for **IWMI** to track the
**National Water Accounting** programme across 43 Sub-Saharan African
countries. Three workstreams are tracked per country: 8 standardised figures,
1 National Water Accounting Report, and 5 reviewer sign-offs.

The app has a **public dashboard** anyone on the team can view, and an
**administrator** surface behind a sign-in that handles every write
(assignments, status changes, team CRUD, deadlines).

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + vite production build
npm run preview  # serve the build locally
```

Node ≥ 18 is required.

## Admin sign-in (v1 — local-only)

| field    | value     |
| -------- | --------- |
| URL      | `/admin/login` |
| Username | `admin`   |
| Password | `nwa2026` |

These credentials are compiled into the bundle and validated client-side. They
live in `src/lib/constants.ts`. **Replace this before any production
deployment** — there is no real authentication.

The `AdminGate` component shows a permanent warning banner across every admin
page to reinforce this.

## Data, persistence, export

All state lives in the browser via Zustand `persist` middleware (key:
`nwa-tracker-store`). Refreshing the page preserves all edits. The seed data
in `seed_data.json` is loaded the first time the app boots — after that, the
local state takes over.

- `Admin → Settings → Export JSON` — downloads a timestamped snapshot.
- `Admin → Settings → Import JSON` — replaces the current state with a
  previously exported file (with confirmation).
- `Admin → Settings → Reset to seed data` — destroys local state and rehydrates
  from the bundled seed.

There is **no backend**. Multi-user sync is done manually via Export / Import.

## Routes

```
Public:
  /                          Overview (Africa map, KPIs, workstreams, heatmap)
  /countries                 All 43 countries (grid + table)
  /countries/:id             Country detail (figures, report, reviews tabs)
  /figures                   Figures workstream (8 tabs, per-figure tables)
  /reports                   Reports workstream
  /reviews                   Reviewer × country heatmap
  /team                      Team grid
  /team/:id                  Member workload

Admin (gated):
  /admin                     Action centre
  /admin/assignments         Assignment matrix (the main admin tool)
  /admin/countries           Country CRUD
  /admin/team                Team CRUD
  /admin/deadlines           Calendar view of every deadline
  /admin/activity            Full activity log
  /admin/settings            Data export/import, theme, credentials notice
```

Press **⌘K / Ctrl+K** anywhere to open the command palette and jump to any
country, team member or admin action.

## Tech stack

- Vite + React 18 + TypeScript (strict)
- Tailwind CSS with custom water-programme palette
- Radix UI primitives wrapped in shadcn-style components
- Recharts (donut, stacked bars) + custom SVG (heatmap, ring)
- `react-simple-maps` + a bundled world TopoJSON for the choropleth
- Zustand + persist for state
- React Router v6
- framer-motion for page transitions
- date-fns for date math
- lucide-react for iconography

## Deploying to Vercel

1. `npm run build` succeeds locally.
2. Push to a Git host.
3. Import the repo on Vercel; framework preset = **Vite**.
4. Build command: `npm run build` · output: `dist`.
5. (Optional) Add a rewrite to send unknown paths to `/index.html`:

   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

   This enables SPA deep-linking (`/admin/assignments`, etc).

No environment variables are required.

## Project layout

```
src/
  main.tsx, App.tsx, router.tsx, index.css
  assets/        Bundled world TopoJSON for the map
  components/
    layout/      AppShell, Sidebar, Topbar, AdminGate
    ui/          shadcn-style primitives
    common/      StatCard, ProgressRing, StatusBadge, CommandPalette, …
    map/         AfricaMap, MapLegend, MapTooltip
    charts/      WorkstreamPanel, ReviewerHeatmap, WorkloadBar, DeadlineTimeline
    country/     CountryCard, CountryTable
    team/        TeamMemberCard
    admin/       AssignmentMatrix, FigureCellEditor, BulkAssignDialog, AddCountryDialog, AddMemberDialog
  pages/
    public/      Overview, Countries, CountryDetail, Figures, Reports, Reviews, Team, TeamMemberDetail
    admin/       AdminLogin, AdminDashboard, AdminAssignments, AdminCountries, AdminTeam, AdminDeadlines, AdminActivity, AdminSettings
  store/         useNwaStore (data), useAuthStore (admin flag), selectors
  lib/           types, seed, derive (completion/overdue), format, export, constants, countryCodes, cn
  hooks/         useDebounce, useDarkMode
```

See `DESIGN_NOTES.md` for the data model, computation strategy and
back-end-readiness notes.
