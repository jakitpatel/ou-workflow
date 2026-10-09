# AGENTS.md

Guidance for coding agents working in `ncrc-app`.

Last reviewed: 2026-10-09. This file defines working rules; the dated findings and
prioritized backlog live in [ARCHITECTURE_ACTION_PLAN.md](ARCHITECTURE_ACTION_PLAN.md).
Verify mutable facts against source and the lockfile rather than treating this snapshot
as a permanent baseline.

## Project Snapshot

`ncrc-app` is an internal React 19 + TypeScript workflow app built with Vite, TanStack
Router file routes, TanStack Query, Tailwind CSS 4, Radix primitives, Sonner, and AWS
Cognito OAuth/PKCE. It intentionally preserves a localhost development-login path for the
mock server at `http://localhost:3001`.

Primary authenticated routes:

- Home: `/`
- Application Dashboard: `/ou-workflow/ncrc-dashboard`
- Application Intake: `/ou-workflow/prelim-dashboard`
- Tasks & Notifications: `/ou-workflow/tasks-dashboard`
- Profile: `/profile`
- Restricted RFR application detail: `/ou-workflow/rfr-dashboard/$applicationId`

Development serves at `/` on port 3000. Vite builds use `/dashboard/`, including
development-mode builds. Preserve the explicit browser targets in `vite.config.ts`.
Staging and production authentication use Cognito with the configured Okta provider;
RFR route/session restrictions are UI policy, not a substitute for backend authorization.

Read `README.md`, `docs/api-contracts.md`, and `ARCHITECTURE_ACTION_PLAN.md` before broad
changes.

## Current Toolchain (reviewed 2026-10-09)

- React / React DOM `19.3.0`
- TypeScript `5.9.3`
- Vite `8.3.4`, React plugin `6.1.2`
- TanStack Router `1.170.41`, router plugin `1.168.42`
- TanStack Query `5.104.1`
- Tailwind CSS `4.2.1`, Tailwind Vite plugin `4.3.3` (declared versions differ)
- Vitest `5.0.3`, Testing Library React `16.3.3`, jsdom `30.1.2`
- ESLint `10.12.0`, typescript-eslint `8.71.1`
- Lucide React `1.54.0`

These are declared dependency baselines, not a registry upgrade wishlist. Vite 8,
React plugin 6, ESLint 10, Vitest 5, jsdom 30, and Lucide 1 are already adopted.
`package-lock.json` determines resolved versions. Do not upgrade majors incidentally.
Node `24.18.1` was used for the latest checks; the repository does not yet pin a runtime.

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

- Checks on 2026-10-09: typecheck and production build pass; 53 files / 311 tests pass.
- Lint: 9 errors and 608 warnings; do not claim lint passes or lower rule severity
  to hide debt. Report existing failures separately from regressions.
- Production audit: 4 affected packages (1 high, 3 moderate). Re-audit before dependency
  work; do not describe the full install audit as the production audit.
- Build scripts currently run Vite before `tsc`; run explicit typecheck first when validating.

For documentation-only changes, verify source references and check formatting on the
changed documents; do not rerun the app suite unless executable behavior also changed.
For behavioral UI changes, test the changed workflow, loading/error/empty states, and
keyboard behavior when applicable. Browser checks supplement automated tests.

## Ownership

- `src/main.tsx`: render entry only.
- `src/app/providers`: providers.
- `src/app/router`: router creation and route context.
- `src/app/providers/EventsProvider.tsx`: authenticated SSE connection and subscribers.
- `src/routes`: thin route declarations, search validation, loaders, redirects, error UI,
  and feature screen mounting.
- `src/features/<feature>/api`: endpoint wrappers and DTOs.
- `src/features/<feature>/hooks`: queries, mutations, and workflow hooks.
- `src/features/<feature>/model`: query keys and feature model types.
- `src/features/<feature>/cache`: feature-specific event handling and cache reconciliation.
- `src/features/<feature>/lib`: pure parsers, adapters, and payload builders.
- `src/features/<feature>/components`: feature UI.
- `src/features/<feature>/screens`: route-facing composition.
- `src/components/ui`: generic primitives.
- `src/components/layout`: navigation and `PageShell`.
- `src/components/feedback`: cross-feature feedback.
- `src/shared/api`: transport, errors, query defaults, and query helpers.
- `src/shared/email`: common address, attachment, and email-formatting utilities.
- `src/hooks`: truly cross-feature hooks only.

Do not recreate `src/components/ou-workflow`. Do not add imports from compatibility barrel
`@/api`; import from the owning feature. `src/types/application.ts` remains a legacy shared
type module; new domain types belong to their feature. Do not move unrelated types there.

Prefer dependencies flowing from routes/screens to feature components/hooks, then APIs
and models, then shared infrastructure. Shared modules must not import feature or route
modules. Do not import another feature's screen or drawer merely to reuse a helper.
Use explicit feature API/model entry points for necessary cross-feature collaboration;
avoid cycles and broad barrel exports. Extract to shared only when responsibilities and
semantics are truly common. Existing `utils` directories may be maintained; use the
documented ownership when adding new modules instead of moving files for naming alone.

## Route And Layout Rules

- Keep route files declarative. Home already mounts `features/applications/screens/HomePage`;
  Profile still contains substantial UI and should move into a profile screen when touched.
- Never hand-edit `src/routeTree.gen.ts`.
- Normalize URL values in `validateSearch`.
- Preserve complete required search objects when linking between dashboards.
- Authenticated menu pages use `src/components/layout/PageShell.tsx`.
- Sticky headers use `top-0` with left navigation and `top-16` with top navigation.
- Preserve RFR detail access, callback redirects, and the deployed base path. Keep
  diagnostic routes such as the current SSE test page out of normal navigation; decide
  their production exposure explicitly before release.

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
- Reuse existing feature cache reconciliation helpers for paged and infinite lists.
  Preserve `meta`, page order, and `pageParams`; do not append a refresh result to a
  filtered list without establishing that it belongs there. Use targeted invalidation
  when safe patching is uncertain or a targeted refresh fails.
- Keep draft edits separate from refetched data; do not overwrite unsaved user changes.
- Pass transport options through typed interfaces. Centralize auth refresh/error behavior;
  do not duplicate token handling or raw authenticated fetches in components.

The authenticated layout owns one SSE connection through `EventsProvider` and
`shared/api/useSSEConnection.ts`; `hooks/useSSE.tsx` subscribes locally. Feature event
handlers validate event type, application type, and ID before fetching/patching caches.
Preserve unsubscribe, reconnect, abort, and session-switch cleanup. The local backend
currently emits `refresh_messages` only; other frontend event handlers need synthetic
tests or a backend that emits those events.

Known quirks:

- Mixed task casing (`TaskInstanceId`/`taskInstanceId`, `TaskCategory`/`taskCategory`).
- The string `"NULL"` may represent empty backend values.
- Resolution tasks carry nested company/plant application and match payloads.
- `/assignRole` may return JSON encoded inside `result`.
- KASH detail endpoints return arrays directly; search endpoints use `{ data }`.
- Resolution endpoints return string fragments with trailing commas in `data`.
- Local mock filters and mutations are incomplete and in-memory; mock success does not
  prove production authorization or persistence. Check [API contracts](docs/api-contracts.md)
  and `../ncrc-server-app/src/routes` before changing a request.

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
3. Preserve props and behavior, including role gates, result payloads, and invalidation.
4. Add characterization tests before moving high-risk logic; extend existing tests where useful.
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
- Test observable behavior and business invariants rather than implementation details.
  For transport changes include malformed responses and failures; for cache changes
  include paged/infinite data and event isolation; for mutations verify payloads and
  error recovery. Avoid snapshot-only coverage of workflow logic.
- Keep tests isolated with a test QueryClient and controlled timers/network responses.
  No live production calls, real emails, uploads, or credentials in automated tests.

## Dependency Policy

- Group only low-risk patch/minor updates.
- Handle majors separately with release-note review and full verification.
- Keep build-only packages such as `@tailwindcss/vite` and
  `@tanstack/router-plugin` in `devDependencies`.
- `react-hook-form` still has no source import: adopt it consistently or remove it after
  confirming no planned use.
- Never run blind `npm audit fix --force`.
- Review the lockfile for unexpected unrelated updates. Record install/audit warnings
  separately from compiler or test failures; verify fixes rather than assuming success.
- Keep supported Node, package engines, and CI aligned when runtime pinning is introduced.

## Production And Maintenance Rules

- Never place secrets in `VITE_*` values: they are embedded into browser assets.
  Do not log tokens, contact details, or complete business payloads. Keep useful errors
  with redacted context and a clear recovery path.
- Preserve intentional localhost login; changes to auth gates require focused tests.
  Client role controls cannot enforce server permissions.
- Handle loading, empty, failure, and retry states at the owning UI boundary. Prevent
  accidental duplicate submissions while mutations are pending.
- Use accessible primitives, visible labels, and focus/keyboard behavior for dialogs
  and inline editors. Maintain both top and left navigation layouts.
- Prefer small changes with one cohesive responsibility. Add dependencies, global state,
  generalized frameworks, or speculative abstractions only for a demonstrated need.
- Record significant boundary/auth/cache decisions in a short dated architecture decision
  document with context, alternatives, outcome, and follow-up. Update API contracts when
  request/response semantics change and the action plan when a milestone is verified.
- Documentation describes verified current behavior separately from proposals. Include
  command/date/scope for measured baselines; remove stale upgrade lists and completed tasks.
- `docs/` is currently Git-ignored. Check whether new or updated docs are tracked; include
  intended documentation in version control deliberately instead of assuming it will ship.

## Working Tree Safety

- Preserve unrelated changes.
- Avoid broad formatting-only edits during architecture work.
- `dist` and `src/build-info.json` are generated and ignored.
- Git may need a one-off `safe.directory` option on Windows.
- Never use destructive Git commands to clean user work.
