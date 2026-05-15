# Design notes — NWA Tracker

These are the non-obvious choices behind the codebase. Anyone adding a feature
or wiring a real backend later should read this first.

## 1. Data model

Three nested records per `Country`:

- `figures: FigureProgress[]` — **always length 8**, in the canonical order
  defined by `FIGURE_TYPES`. The seed loader guarantees this; the
  `AssignmentMatrix` and `CountryDetail.Figures` UIs depend on it.
- `report: ReportProgress` — single record per country.
- `reviews: ReviewProgress[]` — **always length 5**, one per reviewer, in
  `REVIEWERS` order. `reviewerName` is duplicated alongside `reviewerId` so
  the heatmap and review tables don't need to join the team table.

`TeamMember.roles` is a multi-valued enum: a person can be a `figure_lead` and
a `reviewer` simultaneously (Mohammed, Geethya, etc).

Figure metadata — short labels and master leads — lives in
`FIGURE_META` (a `Record<FigureType, …>`). Figures 2, 3 and 8 have
`lead: null` by design (the spec explicitly leaves them for admin assignment);
the UI surfaces this with a warning chip.

## 2. Completion arithmetic

Defined in `src/lib/derive.ts` and consumed via `src/store/selectors.ts`.

- A figure is "done" when `status === 'done'`.
- A report is "done" when `status === 'met'`.
- A review is "done" when `done === true`.

Per-country completion:

```
figuresCompletion = donefigures / 8
reportCompletion  = report.status === 'met' ? 1 : 0
reviewsCompletion = donereviews / 5
overallCompletion = 0.4·figures + 0.4·report + 0.2·reviews
```

A country is **fully complete** only when *every* sub-item is done.
`isCountryComplete` uses strict checks, not the weighted score, so a
country reading 99% can't be marked complete.

`countryCompletionBucket` returns `0..4` mapped to the five completion bands
defined in `COMPLETION_BUCKETS`. The Africa choropleth, completion filter and
country card stripes all use this same bucketing so the visual story stays
consistent across the app.

Overdue logic is on **the deadline being in the past** AND the item not yet
done. Both `isFigureOverdue` and `isReportOverdue` enforce this.

## 3. State management

Single Zustand store (`useNwaStore`) persisted to `localStorage` (key
`nwa-tracker-store`, version 1). The store contains all `AppState`
(`countries`, `team`, `activity`, `lastSyncedAt`) plus mutation methods.

**Every write mutation appends an `ActivityEntry`.** That's enforced inside
the store, not at the call site — there is no way to mutate without logging.
`activity` is bounded to 500 entries; older ones are dropped.

**Selectors** in `src/store/selectors.ts` are pure functions that take
`AppState` and return derived values. They're invoked with
`useNwaStore((s) => selectX({ countries, team, activity, lastSyncedAt }))`.

The auth store (`useAuthStore`) is intentionally separate — flipping admin
mode does not invalidate the data store.

## 4. Map implementation

The Africa choropleth uses `react-simple-maps` over `world-atlas`'s
`countries-110m.json` (bundled in `src/assets/`). The world TopoJSON uses
numeric M49 country codes in `id` and English country names in
`properties.name`.

We don't trust the M49 codes (they're not what the rest of our app uses).
Instead, `TOPO_NAME_TO_COUNTRY` in `AfricaMap.tsx` maps each TopoJSON name to
our internal country name. This insulates us from upstream id changes and
handles known aliases (`Dem. Rep. Congo` → `DR Congo`,
`S. Sudan` → `South Sudan`, `Cote d'Ivoire` → `Côte d'Ivoire`, etc).

North African countries (Algeria, Egypt, Libya, Morocco, Tunisia, Sudan,
W. Sahara) are explicitly listed as out-of-scope and rendered greyed-out.

## 5. Design tokens

The Tailwind theme adds a water-programme palette
(`abyss / deep / navy / ocean / teal / cyan / aqua / sand / dune`) plus
explicit status colours. `index.css` only defines:

- HSL variables for `--background / --foreground / --border` (so shadcn
  primitives can hook in if needed),
- body / scrollbar defaults,
- a subtle `bg-water-grid` dot pattern used on the hero and login screens.

Dark mode is the `class` strategy. The toggle lives in the topbar and is
persisted via `useDarkMode` (localStorage key `nwa-tracker-theme`).

## 6. Accessibility & motion

- Every interactive element is keyboard-focusable (Radix handles most of it).
- Status colours are paired with icons and text labels (`TaskStatusBadge`,
  `ReportStatusBadge`).
- Map cells include `<title>` for screen readers.
- Page transitions are short (`200ms`) and use a single `opacity + y` keyframe.
  Card hovers translate by 2px — institutional, not bouncy.

## 7. What would change to add a real backend

This list is the rough plan if/when the app moves off localStorage.

1. **Storage** — replace the `persist` middleware with a thin sync layer.
   Mutations would (a) update the local store immediately (already optimistic),
   (b) POST/PATCH to the API, (c) reconcile on response. Server-driven
   re-validation can live alongside via SWR / TanStack Query.
2. **Auth** — delete `useAuthStore` and gate `/admin` on a real session
   cookie. The hardcoded credentials and the `AdminGate` warning banner
   should be removed once that's done.
3. **Activity log** — currently capped client-side at 500 entries; move
   storage to the server and paginate `AdminActivity`.
4. **Concurrent edits** — admin mutations are last-write-wins. A backend
   should add row-level `updatedAt` / `version` to detect conflicts and surface
   them in toasts.
5. **Multi-tenancy** — `Country.id` and `TeamMember.id` are slugs derived from
   names. For a real backend, swap to ULIDs or DB-generated UUIDs and keep
   slugs only for URL aesthetics.
6. **Seed loader** — `src/lib/seed.ts` should remain as the bootstrap
   format. It's already idempotent: feed it the spreadsheet's
   `seed_data.json` and it builds a complete `AppState`. A server-side
   migration could replay it once.
7. **Schema validation** — `isAppStateLike` in `src/lib/export.ts` is a
   minimal type-check for imports. A real backend would replace this with
   a zod schema (`zod` is already a dependency) and reject malformed data.

## 8. Known limitations

- The Africa map uses a 110m-resolution dataset for size (~100KB). Country
  borders look chunky on large screens. A 50m dataset would look better at
  the cost of ~3× file size.
- The reviewer heatmap doesn't paginate. At 5×43 cells, it doesn't need to,
  but if the programme expands beyond ~60 countries it should switch to a
  virtualised table.
- The command palette searches countries, team and admin actions but does
  not fuzz-match — only substring. A 43-country list doesn't need
  fuzzy matching; expand if/when the scope grows.
- The deadline calendar shows the month grid but does not yet support
  drag-and-drop to reschedule. Editing happens via the assignment matrix.
- There is no in-app way to change the admin password; you must edit
  `src/lib/constants.ts` and rebuild. This is intentional for v1 — when real
  auth lands, the constants get removed.
