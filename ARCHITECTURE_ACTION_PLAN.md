# NCRC App Architecture Action Plan

This plan reflects the current `ncrc-app` architecture after the server contract and route
refactor work. It is a practical step-by-step migration plan, not a historical changelog.

## Executive Summary

The app already has the right direction:

- TanStack Router file routes under `src/routes`
- route groups for public and authenticated areas
- lazy-loaded dashboard entry routes
- app bootstrap split into `src/app/router` and `src/app/providers`
- shared transport/query utilities under `src/shared/api`
- feature-owned APIs, hooks, query keys, screens, and components for applications, tasks,
  prelim, profile, and auth
- TanStack Query as the primary server-state layer
- root and key route error handling through `RouteErrorView`

The remaining work is not a rewrite. It is finishing consistency around the remaining
workflow-era seams:

- workflow modals and navigation still live under `src/components/ou-workflow`
- compatibility hook re-exports still exist under `src/components/ou-workflow/hooks`
- query and mutation patterns are good but not fully uniform
- production-path debug logging and local-dev auth behavior still need a policy
- test coverage is thin compared with the amount of business logic

## Current State Snapshot

### Strong Foundations

- `src/main.tsx` is a minimal render entry.
- `src/app/providers/AppProviders.tsx` owns provider composition.
- `src/app/router/createAppRouter.ts` owns router creation and context registration.
- `src/routes/__root.tsx` has a root error boundary.
- `_public` and `_authed` route groups are in place.
- Dashboard route files mount feature-owned screens.
- NCRC dashboard, Task Dashboard, Prelim Dashboard, and task notes are feature-owned.
- `useDebounce` lives in `src/hooks/useDebounce.ts`.
- task actions live in `src/features/tasks/hooks/useTaskActions.ts`.
- No active source imports from `@/api` were found during this review.
- `docs/api-contracts.md` is aligned with the current mock server route list.

### Known Remaining Seams

- `src/features/applications/components/ApplicationDetailsContent.tsx` now imports
  Application Management sections from
  `src/features/applications/components/application-management`:
  - `Overview`
  - `CompanySection`
  - `ContactsSection`
  - `PlantsSection`
  - `ProductsTable`
  - `ActivityLog`
  - `FilesList`
  - `IngredientMgmt`
  - `RawApplicationPanel`
  - `QuoteInfo`
  - `TaskEventsPanel`
- Feature screens still import workflow modals:
  - `ActionModal`
  - `ConditionalModal`
  - `UploadNdaModal`
  - `CancelApplicationDialog`
  - `DashboardAppDialog`
- `_authed.tsx` still imports `Navigation` from `src/components/ou-workflow`.
- `src/components/ou-workflow/hooks/*` still contains compatibility re-export files.
- `src/shared/api/httpClient.ts` still contains debug logging.
- `src/routes/_public/login.tsx` still embeds local-dev tokens for localhost testing.
- Tests currently cover only a few high-value hooks/components.

## Target Architecture

Use this as direction, not as a command to move everything at once.

```text
src/
|- app/
|  |- providers/
|  |- router/
|- routes/
|- features/
|  |- applications/
|  |  |- api/
|  |  |- cache/
|  |  |- components/
|  |  |- hooks/
|  |  |- model/
|  |  |- screens/
|  |  |- utils/
|  |- tasks/
|  |  |- api/
|  |  |- components/
|  |  |- hooks/
|  |  |- lib/
|  |  |- model/
|  |  |- notes/
|  |  |- screens/
|  |- prelim/
|  |- auth/
|  |- profile/
|- components/
|  |- ui/
|  |- feedback/
|  |- layout/
|- hooks/
|- shared/
|  |- api/
|- types/
|- test/
```

Rules:

- Route files stay thin and mount feature screens.
- Feature modules own business workflows.
- Shared UI stays workflow-agnostic.
- TanStack Query owns server state.
- React state owns local UI state.
- Context is limited to app/session/preferences/provider concerns.
- Transitional surfaces are deleted as soon as there are no runtime imports.

## Step-By-Step Plan

### Step 0: Keep The Baseline Stable

Status: Done, keep enforcing.

Goal:

- Preserve working routes, server contracts, and current local-dev behavior while cleanup
  continues.

Instructions:

1. Read `docs/api-contracts.md` before changing endpoint wrappers.
2. Keep route paths and search params stable.
3. Keep localhost login working until a replacement dev-auth flow is implemented.
4. Run `npm run typecheck` after structural changes.
5. Run focused tests for touched hooks/components.

Done when:

- No refactor step changes user-visible behavior unless explicitly requested.

### Step 1: Move Application Management Detail Sections

Status: Done.

Goal:

- Finish feature ownership for application detail UI.

Previous problem:

- `ApplicationDetailsContent.tsx` was feature-owned, but it imported many detail sections
  from `src/components/ou-workflow/ApplicationManagement`.

Completed instructions:

1. Move one section at a time from `src/components/ou-workflow/ApplicationManagement` to
   `src/features/applications/components/application-management` or another clearly named
   applications subfolder.
2. Start with low-dependency sections:
   - `RawApplicationPanel`
   - `ActivityLog`
   - `TaskEventsPanel`
   - `FilesList`
3. Then move domain-heavy sections:
   - `Overview`
   - `CompanySection`
   - `ContactsSection`
   - `PlantsSection`
   - `Ingredients`
   - `Products/ProductsTable`
   - `QuoteInfo`
4. Update imports in `ApplicationDetailsContent.tsx` after each move.
5. Keep component names and props stable during the move.
6. Run `npm run typecheck` after each meaningful batch.

Completed:

- Moved low-dependency sections into
  `src/features/applications/components/application-management`:
  - `RawApplicationPanel`
  - `ActivityLog`
  - `TaskEventsPanel`
  - `FilesList`
- Updated `ApplicationDetailsContent.tsx` to import those sections from the feature-owned
  folder.
- Moved domain-heavy sections into
  `src/features/applications/components/application-management`:
  - `Overview`
  - `CompanySection`
  - `ContactsSection`
  - `PlantsSection`
  - `Ingredients`
  - `Products/ProductsTable`
  - `QuoteInfo`
- Moved the remaining Application Management files:
  - `MessageLog`
  - `index`
- Removed the old `src/components/ou-workflow/ApplicationManagement` directory after it was
  emptied.

Done:

- `rg -n "components/ou-workflow/ApplicationManagement" src/features src/routes` returns no
  active imports.
- `src/components/ou-workflow/ApplicationManagement` was deleted after it was emptied.

### Step 2: Retire Workflow Modal Ownership

Status: Important follow-up after Step 1 starts.

Goal:

- Move shared task/action modals out of `src/components/ou-workflow/modal`.

Current consumers:

- applications dashboard/detail flows
- task dashboard flows
- prelim dashboard flows
- authenticated home dashboard dialog

Instructions:

1. Classify each modal:
   - task/action modal: move to `src/features/tasks/components` or `src/features/tasks/modals`
   - application cancellation: move to `src/features/applications/components`
   - dashboard create/delete app dialog: move to `src/features/applications/components` or a
     small `src/components/layout` surface if truly app-shell owned
   - NDA upload modal: move based on ownership after checking all consumers
2. Update imports by consumer feature.
3. Avoid changing modal behavior in the same commit as the move.
4. Add tests only when behavior changes, not for mechanical import moves.

Done when:

- `rg -n "@/components/ou-workflow/modal" src` returns no matches.
- `src/components/ou-workflow/modal` can be deleted.

### Step 3: Move Navigation Into App/Layout Ownership

Status: Medium priority.

Goal:

- Stop authenticated layout from depending on workflow-owned navigation.

Instructions:

1. Move `src/components/ou-workflow/Navigation.tsx` to `src/components/layout/Navigation.tsx`
   or `src/app/layout/Navigation.tsx`.
2. Keep route links and search-preserving behavior unchanged.
3. Update `_authed.tsx` to import from the new location.
4. If navigation contains workflow-specific logic, extract only generic shell first and leave
   workflow-specific helpers feature-owned.

Done when:

- `_authed.tsx` has no import from `src/components/ou-workflow`.

### Step 4: Remove Compatibility Hook Re-Exports

Status: Low risk after import cleanup.

Goal:

- Delete stale workflow hook compatibility files.

Instructions:

1. Check active imports:
   `rg -n "components/ou-workflow/hooks|@/components/ou-workflow/hooks" src`
2. For each re-export still used, switch imports to the feature-owned hook.
3. Delete unused files in `src/components/ou-workflow/hooks`.

Done when:

- The hooks folder is gone or empty.
- No source imports mention `components/ou-workflow/hooks`.

### Step 5: Standardize Query And Mutation Patterns

Status: In progress.

Goal:

- Make query and mutation code predictable across features.

Instructions:

1. For new or touched queries, expose a `get...QueryOptions()` factory plus a `use...()`
   wrapper.
2. Keep query keys in `src/features/<feature>/model/queryKeys.ts`.
3. Prefer feature-specific invalidation helpers over broad invalidation.
4. Keep fetch calls out of components.
5. Continue using `buildPaginationParams` for paged endpoints.
6. For infinite queries, derive next offsets from backend `meta`.
7. Keep optimistic updates only where behavior is reliable:
   - task assignment
   - task confirmation
   - note create/read/tag updates

Done when:

- Applications, tasks, prelim, and profile expose consistent query option/hook patterns.
- Mutation invalidation is documented and feature-owned.

### Step 6: Production Hygiene

Status: Needs focused cleanup.

Goal:

- Reduce noisy production diagnostics and clarify local-dev auth.

Instructions:

1. Replace debug-only `console.debug` calls in `src/shared/api/httpClient.ts` with a gated
   logger or remove them.
2. Keep meaningful error logging only where it helps recover a failed user workflow.
3. Do not remove localhost login tokens until an alternate dev-auth strategy exists.
4. Add a short note near local-dev auth explaining why it exists and when it may be removed.
5. Avoid changing Cognito production behavior while cleaning logs.

Done when:

- API base URL resolution and token refresh no longer emit routine debug logs in production.
- Local-dev auth behavior is documented and intentionally isolated.

### Step 7: Route Boundary Polish

Status: Mostly complete, optional hardening remains.

Goal:

- Keep route files consistent and resilient.

Instructions:

1. Add route-level `errorComponent` to additional routes only where it improves recovery.
2. Keep route files thin and avoid moving feature orchestration back into routes.
3. If auth guard logic grows, move helper logic into `src/features/auth/model` or
   `src/features/auth/guards`.
4. Keep `src/routeTree.gen.ts` generated.

Done when:

- Loader-backed routes have consistent error handling.
- Route files remain declarations plus mounting logic.

### Step 8: Expand Regression Tests

Status: Must happen alongside future slices.

Goal:

- Give future architecture moves enough safety rails.

Highest-value tests:

1. Application dashboard:
   - search/filter/page reset behavior
   - paged vs infinite pagination mode
   - application detail query options and mapper quirks
2. Tasks:
   - task assignment mutation cache update
   - task confirmation mutation cache update
   - task action branching in `useTaskActions`
   - task notes create/read/tag flows
3. Prelim:
   - prelim application list query params
   - resolution drawer action branching
   - prelim detail adapter
4. Auth/routes:
   - `_authed` redirect behavior
   - Cognito callback success/failure
   - local-dev login path stays working

Done when:

- Each new architecture slice adds or updates focused tests for the behavior it risks.

### Step 9: Final Compatibility Cleanup

Status: Last.

Goal:

- Remove the remaining old compatibility surfaces once no active runtime imports remain.

Instructions:

1. Delete `src/api.ts` only when `rg -n "@/api|src/api" src` is clean.
2. Delete `src/components/ou-workflow` only when all sections, modals, navigation, and hooks
   have moved.
3. Update `README.md`, `AGENTS.md`, and `docs/api-contracts.md` after final moves.
4. Run:
   - `npm run typecheck`
   - `npm run test`
   - `npm run lint` if the touched files are lint-sensitive

Done when:

- No active source imports from `src/components/ou-workflow`.
- No active source imports from `@/api`.
- The README and agent guidance match the actual ownership model.

## Recommended Immediate Execution Order

1. Move workflow modals to feature or layout ownership.
2. Move navigation to layout/app ownership.
3. Delete workflow hook re-exports and empty workflow folders.
4. Standardize touched query/mutation hooks while doing feature work.
5. Clean API debug logging and document local-dev auth.
6. Expand focused tests around each changed workflow.

## Definition Of Done For The Architecture Migration

- Route files are thin and route paths are stable.
- Feature workflows own their API, query hooks, mutations, screens, and components.
- `src/components/ou-workflow` is gone or contains no active runtime surface.
- `src/api.ts` is gone.
- Server contract quirks are documented in `docs/api-contracts.md`.
- Typecheck, tests, and targeted browser verification pass for touched workflows.

## Final Guidance

Do not introduce Redux, a new state library, or a broad rewrite. The app already has the
right architecture. The remaining work is to finish ownership, remove transitional seams,
and add enough tests that the next change feels boring in the best possible way.
