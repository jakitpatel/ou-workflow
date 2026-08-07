# AGENTS.md

Guidance for coding agents working in `ncrc-app`.

## Project Snapshot

`ncrc-app` is an internal React 19.2 + TypeScript workflow app built with Vite, TanStack
Router file routes, TanStack Query, Tailwind CSS 4, Radix primitives, Sonner, and AWS
Cognito OAuth/PKCE. It intentionally preserves a localhost development-login path for the
mock server at `http://localhost:3001`.

Primary authenticated routes:

- Home: `/`
- Application Dashboard: `/ou-workflow/ncrc-dashboard`
- Application Intake: `/ou-workflow/prelim-dashboard`
- Tasks & Notifications: `/ou-workflow/tasks-dashboard`
- Profile: `/profile`

Read `README.md`, `docs/api-contracts.md`, and `ARCHITECTURE_ACTION_PLAN.md` before broad
changes.

## Current Toolchain (audited 2026-07-29)

- React / React DOM `19.2.8`
- TypeScript `5.9.3`
- Vite `7.3.6`, React plugin `5.2.0`
- TanStack Router `1.170.18`, router plugin `1.168.23`
- TanStack Query `5.101.4`
- Tailwind CSS / Vite plugin `4.3.2`
- Vitest `4.1.10`, Testing Library React `16.3.2`, jsdom `28.1.0`
- ESLint `9.39.4`, typescript-eslint `8.62.0`

Do not upgrade major versions incidentally. Current major upgrade lines include Vite 8,
plugin-react 6, ESLint 10, TypeScript 7, jsdom 29, Lucide 1, and web-vitals 6. Treat each as
a dedicated compatibility task.

## Commands And Required Checks

- Install: `npm install`
- Development: `npm run dev`
- Typecheck: `npm run typecheck`
- Tests: `npm test`
- Focused test: `npm test -- --run <test-file>`
- Lint: `npm run lint`
- Error-only lint: `npx eslint . --quiet`
- Build: `npm run build`
- Format check: `npm run format:check`
- Dependency drift: `npm outdated`
- Production audit: `npm audit --omit=dev`

Minimum verification:

- Type/API/mapper/query changes: typecheck plus focused tests.
- Route/build/config changes: typecheck plus build.
- Shared workflows: focused tests plus browser verification when practical.
- Dependencies: typecheck, all tests, lint, build, and lockfile inspection.

Known baseline:

- Tests: 5 files / 44 tests, all passing.
- Lint: 12 errors and 481 warnings; do not claim lint passes.
- Security audit: 4 fixable transitive findings (2 high, 2 low).

## Ownership

- `src/main.tsx`: render entry only.
- `src/app/providers`: providers.
- `src/app/router`: router creation and route context.
- `src/routes`: thin route declarations, search validation, loaders, redirects, error UI,
  and feature screen mounting.
- `src/features/<feature>/api`: endpoint wrappers and DTOs.
- `src/features/<feature>/hooks`: queries, mutations, and workflow hooks.
- `src/features/<feature>/model`: query keys and feature model types.
- `src/features/<feature>/components`: feature UI.
- `src/features/<feature>/screens`: route-facing composition.
- `src/components/ui`: generic primitives.
- `src/components/layout`: navigation and `PageShell`.
- `src/components/feedback`: cross-feature feedback.
- `src/shared/api`: transport, errors, query defaults, and query helpers.
- `src/hooks`: truly cross-feature hooks only.

Do not recreate `src/components/ou-workflow`. Do not add imports from compatibility barrel
`@/api`; import from the owning feature.

## Route And Layout Rules

- Keep route files declarative. Move substantial home/profile UI into feature screens when
  touching those routes.
- Never hand-edit `src/routeTree.gen.ts`.
- Normalize URL values in `validateSearch`.
- Preserve complete required search objects when linking between dashboards.
- Authenticated menu pages use `src/components/layout/PageShell.tsx`.
- Sticky headers use `top-0` with left navigation and `top-16` with top navigation.

## API, DTO, And Query Rules

- Use `fetchWithAuth`, `buildPaginationParams`, and preserve backend `meta`.
- Do not introduce new `Promise<any>` endpoint wrappers.
- Keep tolerant backend DTOs separate from canonical UI/domain models.
- Normalize mixed backend casing once at mapper boundaries.
- Preserve task-specific payloads when mapping heterogeneous tasks, then normalize common
  task fields explicitly.
- Prefer feature query keys and targeted invalidation.
- Expose reusable `get...QueryOptions()` when loaders and hooks share a query.
- TanStack Query owns server state; React state owns transient UI and explicit edit drafts.
- Do not mirror query data into state solely for display.

Known quirks:

- Mixed task casing (`TaskInstanceId`/`taskInstanceId`, `TaskCategory`/`taskCategory`).
- The string `"NULL"` may represent empty backend values.
- Resolution tasks carry nested company/plant application and match payloads.
- `/assignRole` may return JSON encoded inside `result`.

## React And Performance Rules

- Fix correctness and ownership before memoizing.
- Use memoization only for measured expensive work, stable memoized-child props, or stable
  hook dependencies.
- Avoid synchronous state synchronization in effects; prefer derived values, query `select`,
  event-driven resets, or remount keys.
- Never read or assign `ref.current` during render.
- Lazy-load large drawers/editors/previews not required for initial content. Declare lazy
  imports at module scope and provide Suspense fallbacks.
- Do not add a state library or React Compiler incidentally.

## Large-Module Policy

When changing a file over roughly 700 lines:

1. Do not rewrite it wholesale.
2. Extract one cohesive slice: types/constants, pure adapters, API orchestration, hook state,
   or a visual section.
3. Preserve props and behavior.
4. Add characterization tests before moving high-risk logic.
5. Move pure shared helpers to `lib`/`model`; do not import helpers from another large UI
   component.

Do not add responsibilities to `ContractStageDrawer.tsx`, `TaskNotesDrawer.tsx`, Schedule
A/B drawers/hooks, or aggregate API `index.ts` files.

## Type Safety And Testing

- Prefer `unknown` plus narrowing over `any`.
- Centralize note/task aliases in adapters.
- Put new domain types in feature models; do not grow `src/types/application.ts`.
- Adding runtime-schema dependencies requires an explicit decision.
- Prioritize mapper, pagination, task branching, mutation, resolution, notes, auth, and both
  navigation-layout tests.
- Use `src/test/renderWithProviders.tsx` when providers are required.

## Dependency Policy

- Group only low-risk patch/minor updates.
- Handle majors separately with release-note review and full verification.
- Keep build-only packages such as `@tailwindcss/vite` and
  `@tanstack/router-plugin` in `devDependencies`.
- `react-hook-form` currently has no source import: adopt it consistently or remove it after
  confirming no planned use.
- Never run blind `npm audit fix --force`.

## Working Tree Safety

- Preserve unrelated changes.
- Avoid broad formatting-only edits during architecture work.
- `dist` and `src/build-info.json` are generated and ignored.
- Git may need a one-off `safe.directory` option on Windows.
- Never use destructive Git commands to clean user work.
