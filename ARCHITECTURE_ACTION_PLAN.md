# NCRC App Architecture Action Plan

This plan reflects the codebase as analyzed on April 9, 2026. It is a forward-looking refactor plan grounded in the current repository, not a generic React checklist.

## Executive Summary

The app is already past the "legacy app with no architecture" stage.

What is already working well:

- TanStack Router file-based routes are in place under `src/routes`
- authenticated and public route groups exist
- large dashboard entry routes are lazy-loaded
- shared API transport lives in `src/shared/api`
- feature API modules and query keys exist for applications, tasks, prelim, and profile
- TanStack Query is the primary server-state layer
- auth/session behavior is largely centralized under `src/features/auth/model`

What still needs architectural work:

- feature ownership is incomplete because Application Management detail sections still live under `src/components/ou-workflow`
- shared workflow-era modals/navigation and compatibility hook re-exports still live under `src/components/ou-workflow`
- route-level error boundaries exist for the root and key loader-backed routes, but are not yet uniform everywhere
- app bootstrap/provider files now exist under `src/app`, but more route context/provider cleanup may still be useful
- query/mutation patterns are inconsistent across features
- production-path debug logging and local-dev auth behavior still need hardening
- automated coverage is still too thin for the amount of workflow logic in the app

The next phase should focus less on inventing architecture and more on finishing the migration to the architecture the codebase has already started.

---

## Current State Assessment

### What is strong today

### Routing

- `src/routes/__root.tsx` is minimal and clean
- `src/routes/_public.tsx` and `src/routes/_authed.tsx` provide a good route-group foundation
- detail routes already use loaders plus `ensureQueryData`
- dashboard entry routes are lazy-loaded

### Data layer

- `src/shared/api/httpClient.ts` centralizes authenticated transport
- `src/shared/api/queryClient.ts` and `src/shared/api/queryOptions.ts` centralize query defaults
- feature-owned API modules exist:
  - `src/features/applications/api`
  - `src/features/tasks/api`
  - `src/features/prelim/api`
  - `src/features/profile/api`
- query keys are feature-owned and consistently named

### Auth and session

- token/session logic is mostly centered in `src/features/auth/model`
- Cognito callback handling is cleaner than a typical route-level implementation
- authenticated route access is gated in `_authed`

### State extraction progress

- NCRC dashboard state moved into `src/features/applications/hooks/useNcrcDashboardState.ts`
- task dashboard state moved into `src/features/tasks/hooks/useTaskDashboardState.ts`
- prelim dashboard state moved into `src/features/prelim/hooks/usePrelimDashboardState.ts`
- shared notes orchestration moved into `src/features/tasks/notes/useTaskNotesDrawerState.ts`
- Prelim dashboard UI ownership now lives under `src/features/prelim/components`

## Highest-priority gaps

### 1. Feature ownership is still split across old and new boundaries

The remaining major workflow-owned detail surface is:

- `src/components/ou-workflow/ApplicationManagement`

Prelim, NCRC dashboard, and Task Dashboard screen composition have moved into feature folders. Application detail UI still imports many Application Management sections from the workflow folder.

### 2. Workflow-era compatibility surfaces still exist

Remaining compatibility surfaces include:

- `src/components/ou-workflow/hooks/*` re-export files for applications, prelim, and task query hooks
- `src/components/ou-workflow/modal/*` shared task/action modals
- `src/components/ou-workflow/Navigation.tsx`

The riskiest hooks, `useDebounce` and `useTaskActions`, have already been retired from the workflow folder.

### 3. Route boundaries are improved but not uniform everywhere

The app uses loaders, lazy routes, root error handling, and route-level error components in the key loader-backed paths. Remaining hardening opportunities:

- a consistent route context strategy beyond the query client
- optional error components for additional non-loader routes
- continued cleanup of route-local auth guard wiring into feature-owned helpers

### 4. Query patterns are good, but not yet uniform

Good:

- list/detail query key ownership is clear
- query defaults exist
- mutations invalidate related lists

Still weak:

- some orchestration still happens in screen components instead of feature hooks
- query invalidation is broad rather than purpose-built
- optimistic update patterns are limited
- some modal flows still depend on workflow-era component contracts

### 5. Production hardening is incomplete

Notable issues still in the codebase:

- hardcoded local-dev tokens in `src/routes/_public/login.tsx`
- debug logging in `src/shared/api/httpClient.ts`
- mixed UI-level `console.error` / `console.warn` usage without a logging policy

### 6. Historical hook design smell has been resolved

The old workflow `useTaskActions` nested-hook contract has been replaced by the feature-owned `src/features/tasks/hooks/useTaskActions.ts` implementation. Keep new task-action work on that feature-owned hook.

### 7. Testing is still far behind the architecture

Visible test coverage exists for:

- `src/features/tasks/notes/useTaskNotesDrawerState.test.tsx`
- `src/features/tasks/notes/TaskNotesDrawer.test.tsx`
- `src/test/renderWithProviders.example.test.tsx`

That is not enough coverage for auth, loaders, route guards, dashboard filtering, task actions, or prelim resolution flow.

---

## Recommended Target Architecture

The repo does not need a massive rewrite. It needs a cleaner expression of the architecture it is already moving toward.

### Proposed folder structure

```text
src/
|- app/
|  |- router/
|  |  |- createAppRouter.ts
|  |  |- routeContext.ts
|  |- providers/
|  |  |- AppProviders.tsx
|  |  |- QueryProvider.tsx
|  |  |- AuthProvider.tsx
|  |  |- PreferencesProvider.tsx
|  |- errors/
|  |  |- AppErrorBoundary.tsx
|  |  |- RouteErrorView.tsx
|- routes/
|  |- __root.tsx
|  |- _public.tsx
|  |- _authed.tsx
|  |- _public/
|  |- _authed/
|- features/
|  |- applications/
|  |  |- api/
|  |  |- components/
|  |  |- hooks/
|  |  |- model/
|  |  |- routes/
|  |  |- screens/
|  |- tasks/
|  |  |- api/
|  |  |- components/
|  |  |- hooks/
|  |  |- model/
|  |  |- notes/
|  |  |- screens/
|  |- prelim/
|  |  |- api/
|  |  |- components/
|  |  |- hooks/
|  |  |- model/
|  |  |- screens/
|  |- auth/
|  |  |- model/
|  |  |- guards/
|  |  |- components/
|  |- profile/
|  |  |- api/
|  |  |- hooks/
|  |  |- model/
|  |  |- screens/
|- components/
|  |- ui/
|  |- feedback/
|  |- layout/
|- hooks/
|  |- useDebounce.ts
|  |- useDisclosure.ts
|- shared/
|  |- api/
|  |- query/
|  |- utils/
|  |- config/
|- lib/
|- context/
|- types/
|- test/
```

### Why each folder exists

- `app/`: app-wide bootstrap concerns that should not live in `main.tsx`
- `routes/`: TanStack Router file-based route declarations only
- `features/`: domain ownership for UI, data hooks, business logic, and screen composition
- `components/ui/`: reusable presentational primitives with no workflow knowledge
- `components/feedback/`: reusable error, empty, loading, and toast-oriented UI
- `components/layout/`: reusable shells like page headers, filter bars, and app shell elements
- `hooks/`: cross-feature hooks only; if a hook belongs to one domain, it stays in that feature
- `shared/api/`: transport, errors, query defaults, params, and cross-feature request infrastructure
- `shared/query/`: optional future home if query helpers outgrow `shared/api`
- `types/`: true cross-feature types only; feature-specific types should move into feature folders over time

### Important note for this repo

Do not move everything at once just to match the tree. The immediate need is to move current workflow-owned screens and hooks into the right feature areas gradually, while keeping route paths stable.

---

## Architecture Principles For This Codebase

### 1. Keep route files thin

Route files should own:

- route declaration
- search-param validation
- auth/redirect behavior
- loader wiring
- route-level error boundaries
- mounting a screen component

Route files should not own:

- fetch calls
- large UI branches
- modal orchestration
- business rules

### 2. Feature modules own business workflows

Each feature should own:

- endpoint functions
- query options / query hooks
- mutations
- model types and query keys
- screen-level orchestration hooks
- feature-specific presentational components

### 3. Shared UI stays dumb

Reusable UI in `components/ui` should not import:

- feature APIs
- auth helpers
- query hooks
- workflow constants

### 4. TanStack Query owns server state

Use TanStack Query for:

- lists
- details
- reference data
- server mutations
- invalidation
- optimistic updates when user intent must feel immediate

Use React state for:

- modal visibility
- local filter inputs before debounce
- row expansion
- tab state
- temporary form state

Use context only for:

- authenticated user identity/session view
- app preferences
- app-wide provider setup

Avoid adding new global state beyond that.

---

## Target Routing Direction

### Current status

Already good:

- file-based routes
- route groups
- lazy dashboards
- detail loaders

Missing:

- route-level `errorComponent`
- root error shell
- stronger route context usage
- consistent screen ownership by feature

### Target route patterns

#### Root route

`__root.tsx` should eventually render:

- app-level error boundary
- suspense fallback shell
- outlet

#### Authenticated layout route

`_authed.tsx` should keep:

- auth guard
- nav shell
- outlet

But auth guard logic should eventually come from a feature-owned auth guard utility instead of route-local direct service access.

#### Detail routes with loaders

Keep the current pattern of:

- `loaderDeps` for search normalization
- `ensureQueryData` for route-prefetchable detail data
- route component as a thin screen mount

#### Route error boundaries

Every route that uses a loader should have an `errorComponent` with consistent UI, especially:

- Cognito callback
- application detail
- task detail
- future prelim detail routes

### Protected-route pattern recommendation

Keep route-group-based protection as the primary pattern:

- `_public` for login/callback/logout
- `_authed` for everything requiring a session

Do not add a second, component-only auth guard system on top of this.

---

## Target Data Layer Direction

### What to keep

- feature API modules
- feature query keys
- centralized transport
- shared query defaults

### What to improve

#### Standardize query-option exports

Prefer each feature query to expose:

- a `get...QueryOptions()` factory
- a `use...()` hook wrapping it

This pattern already exists in places like:

- `src/features/tasks/hooks/useTaskQueries.ts`
- `src/features/applications/hooks/useApplicationDetail.ts`

Extend it consistently to list/detail/reference queries across features.

#### Move invalidation from broad to intentional

Current task mutations invalidate:

- task lists
- application lists
- prelim lists

That is pragmatic, but broad. Over time, move toward invalidating only the slices actually affected by the mutation.

#### Introduce optimistic updates only where UX benefits are clear

Best candidates:

- task assignment
- task confirmation status
- note creation/reply

Do not force optimistic updates into flows where backend-derived payloads are too complex or risky.

---

## Component Design Direction

### Current pattern

The app is in a mixed state:

- some screens already compose extracted hooks and subcomponents
- some orchestration still lives in workflow containers
- many reusable primitives are already isolated in `src/components/ui`
- prelim dashboard composition now follows the feature-owned screen/components/hooks pattern

### Target pattern

For each feature:

- `screens/` own page-level composition
- `hooks/` own coordination and derived state
- `components/` own feature-specific presentational pieces
- `components/ui/` owns generic primitives

### Recommended split for existing workflow areas

- move NCRC dashboard screen ownership under `src/features/applications/screens`
- task dashboard screen ownership now lives under `src/features/tasks/screens`
- prelim dashboard screen ownership and component ownership now live under `src/features/prelim`
- move application detail screen ownership under `src/features/applications/screens`

Keep route imports pointing to screens, not to workflow folders.

---

## Before vs After

### Before

- architecture exists but is expressed inconsistently
- routes are cleaner than screens
- data layer is more modern than component ownership
- Application Management detail UI still sits under `components/ou-workflow`
- compatibility re-export hooks and shared workflow modals still bridge new code back to old folders

### After

- route files mount feature screens only
- each workflow has a real feature-owned screen and hook surface
- shared hooks move out of workflow folders or become clearly intentional shared feature APIs
- route-level error handling is consistent
- app bootstrap moves into `app/providers` and `app/router`
- `src/api.ts` becomes removable

---

## Concrete Migration Plan

## Phase 0: Stabilize The Refactor Base

Status: In progress

### Goals

- align the plan with current reality
- remove low-signal runtime hazards before larger moves

### Actions

1. Remove production-path debug logs and `console.log` usage that are not intentional diagnostics.
2. Keep the localhost login/testing path intact for now; the hardcoded local-dev tokens in `src/routes/_public/login.tsx` remain intentionally preserved for current testing workflow.
3. Fix the `useTaskActions` hook contract so it no longer exposes hook behavior through a nested function.

### Why first

These are low-risk cleanup tasks that reduce noise and technical risk before broader refactors.

### Progress in this slice

- removed the `console.log` calls from `src/components/ou-workflow/ApplicationManagement/QuoteInfo.tsx`
- replaced the old `useTaskActions` nested-hook contract with a feature-owned implementation in `src/features/tasks/hooks/useTaskActions.ts`
- left `src/routes/_public/login.tsx` unchanged on purpose so localhost testing behavior is not disrupted

## Phase 1: Finish Retiring Transitional Workflow Hooks

Status: Completed for `useDebounce` and `useTaskActions`

### Goals

- stop new feature code from depending on `src/components/ou-workflow/hooks`

### Actions

1. Move `useDebounce` to `src/hooks/useDebounce.ts` or `src/shared/utils`.
2. Replace all imports of `useDebounce` from workflow hooks.
3. Move or rewrite `useTaskActions` into `src/features/tasks/hooks`.
4. Update NCRC and prelim consumers to use the feature-owned version.
5. Delete workflow hook re-export files once no callers remain.

### Done when

- no active feature hook imports from `components/ou-workflow/hooks`

### Completed in this slice

- added `src/hooks/useDebounce.ts`
- added `src/features/tasks/hooks/useTaskActions.ts`
- updated NCRC and prelim consumers to use the feature-owned `useTaskActions`
- updated feature hooks to import `useDebounce` from `src/hooks/useDebounce.ts`
- deleted `src/components/ou-workflow/hooks/useDebounce.ts`
- deleted `src/components/ou-workflow/hooks/useTaskActions.ts`
- verified there are no remaining active imports of those transitional workflow hooks
- `npm run -s typecheck` passes after the migration

## Phase 2: Make Screen Ownership Match Feature Ownership

Status: Completed for route-facing screen ownership, NCRC dashboard feature migration, Task Dashboard feature migration, and Prelim Dashboard feature migration

### Goals

- stop routing and feature hooks from mounting workflow-era component folders

### Actions

1. Move `NCRCDashboard` screen ownership to `src/features/applications/screens`.
2. Move `TaskDashboard` screen ownership to `src/features/tasks/screens`.
3. Move `PrelimDashboard` screen ownership to `src/features/prelim/screens`.
4. Move `ApplicationManagementInterface` ownership to `src/features/applications/screens`.
5. Leave internal presentational pieces in place temporarily if needed, but make screen entry points feature-owned.

### Done when

- route files import screens from `features/*/screens`

### Completed in this slice

- added `src/features/applications/screens/NcrcDashboardScreen.tsx`
- added `src/features/applications/screens/NcrcDashboardContent.tsx`
- added `src/features/applications/screens/ApplicationDetailScreen.tsx`
- added `src/features/tasks/screens/TaskDashboardScreen.tsx`
- added `src/features/tasks/components/TaskDashboardContent.tsx`
- added `src/features/tasks/components/TaskDashboardHeader.tsx`
- added `src/features/tasks/components/TaskDashboardTable.tsx`
- added `src/features/prelim/screens/PrelimDashboardScreen.tsx`
- updated the NCRC dashboard route to import `NcrcDashboardScreen`
- updated both task dashboard routes to import `TaskDashboardScreen`
- updated the prelim dashboard route to import `PrelimDashboardScreen`
- updated the NCRC application detail route to render `ApplicationDetailScreen`
- moved NCRC dashboard sections into `src/features/applications/components`
- moved Task Dashboard UI ownership fully into `src/features/tasks/components`, `src/features/tasks/lib`, and `src/features/tasks/model`
- moved Prelim Dashboard UI ownership fully into `src/features/prelim/components`, `src/features/prelim/lib`, and `src/features/prelim/model`
- moved the shared notes drawer into `src/features/tasks/notes`
- removed the old `src/components/ou-workflow/NCRCDashboard` folder after the feature migration completed
- removed the old `src/components/ou-workflow/TaskDashboard` folder after the feature migration completed
- removed the old `src/components/ou-workflow/PrelimDashboard` folder after dormant prelim surfaces were cleaned up
- `npm run -s typecheck` passes after the screen-ownership move

### Remaining follow-up

- application-management presentational sections still live under `src/components/ou-workflow`
- `src/features/applications/components/ApplicationDetailsContent.tsx` still imports many workflow-era detail sections
- shared workflow modals and navigation still live under `src/components/ou-workflow`
- this phase fully completed the NCRC dashboard, Task Dashboard, and Prelim Dashboard migrations while leaving Application Management and shared compatibility surfaces for later slices

## Phase 3: Harden Routing For Production

Status: Completed

### Goals

- make TanStack Router usage consistent and resilient

### Actions

1. Add a reusable route error component.
2. Add `errorComponent` to loader-backed routes.
3. Add a root app error boundary.
4. Move router creation into `src/app/router/createAppRouter.ts`.
5. Move provider composition into `src/app/providers/AppProviders.tsx`.

### Done when

- loader routes have consistent error handling
- `main.tsx` becomes a minimal render/bootstrap file

### Completed in this slice

- added reusable route error UI in `src/components/feedback/RouteErrorView.tsx`
- added a root route error boundary in `src/routes/__root.tsx`
- added `errorComponent` to the Cognito callback route
- added `errorComponent` to the NCRC application detail loader route
- added `errorComponent` to the task dashboard application-detail loader route
- preserved existing route paths, redirects, and loader behavior
- added `src/app/router/createAppRouter.ts`
- added `src/app/providers/AppProviders.tsx`
- moved router creation out of `src/main.tsx`
- moved provider composition out of `src/main.tsx`
- `npm run -s typecheck` passes after the routing hardening slice

### Remaining follow-up

- optionally extend route-level error handling to additional non-loader routes if we want a more uniform shell

## Phase 4: Standardize Query And Mutation Patterns

Status: Important

### Goals

- make TanStack Query ownership uniform across features

### Actions

1. Standardize `get...QueryOptions()` plus `use...()` exports for all major list/detail queries.
2. Introduce more targeted invalidation helpers for tasks/applications/prelim.
3. Add optimistic updates for task assignment and note creation where behavior is reliable.
4. Keep fetch calls out of components entirely.

### Done when

- query wiring is predictable across applications, tasks, prelim, and profile

## Phase 5: Prelim Workflow Completion

Status: Completed

### Goals

- bring prelim up to the same architectural maturity as applications and tasks

### Actions

1. Remove dependence on workflow-era task-action helpers.
2. Push remaining prelim action branching into feature-owned helpers/hooks.
3. Consider whether prelim detail should become its own loader-backed route instead of only a modal-driven detail experience.
4. Move prelim-specific UI pieces toward `src/features/prelim/components`.

### Done when

- prelim no longer depends on workflow hook surfaces
- prelim screen composition looks like the task and applications architecture

### Completed in this slice

- moved active Prelim Dashboard composition into `src/features/prelim/components/PrelimDashboardContent.tsx`
- moved prelim card, stage-task, resolved-section, resolution drawer, JSON modal, filter, and list UI into `src/features/prelim/components`
- split the resolution drawer into smaller presentation components
- moved prelim resolution helpers into `src/features/prelim/lib/prelimResolution.ts`
- moved drawer-specific resolution types into `src/features/prelim/model/resolution.ts`
- removed dormant `VectorResultsTable.tsx` and the hidden stats-card surface
- removed commented vector-search/KASH preview code from `PrelimJsonModal.tsx`
- removed the unused `fetchVectorMatches` API export
- deleted the old `src/components/ou-workflow/PrelimDashboard` folder
- verified the cleanup with `npm run -s typecheck`

### Remaining follow-up

- decide whether prelim application details should become a loader-backed route instead of staying modal-driven
- migrate shared workflow modals out of `src/components/ou-workflow/modal` when their ownership is clarified

## Phase 6: App Shell And Shared UX Patterns

Status: After structural cleanup

### Goals

- reduce duplication in page chrome and state shells

### Actions

1. Standardize loading, empty, and error states.
2. Extract reusable page header/filter/stat-shell components where duplication is real.
3. Keep these extractions shared only if they are truly cross-feature.

### Done when

- dashboards feel structurally consistent without becoming over-abstracted

## Phase 7: Testing And Regression Coverage

Status: Must happen alongside phases 1 through 5

### Highest-value tests

1. Route/auth tests
   - `_authed` redirect behavior
   - Cognito callback success/failure
   - public vs authed group access
2. Query/mutation tests
   - task assignment mutation
   - task confirmation mutation
   - application detail query options
   - prelim detail query/options
3. Screen behavior tests
   - NCRC search/filter sync
   - task dashboard action branching
   - prelim task action flows
   - profile preference persistence

### Done when

- the next architectural slice can be changed with confidence

## Phase 8: Final Migration Cleanup

Status: Last

### Actions

1. Remove `src/api.ts` when the final runtime imports are gone.
2. Remove `components/ou-workflow` compatibility surfaces that no longer own active behavior.
3. Keep README aligned with the actual ownership model.

---

## Recommended Execution Order

1. Production hygiene cleanup: logs, local-dev login strategy, `useTaskActions` contract.
2. Retire transitional workflow hooks.
3. Move screen entry ownership under feature folders.
4. Add route-level error boundaries and app/provider bootstrap cleanup.
5. Standardize query/mutation patterns.
6. Finish Application Management and shared workflow compatibility cleanup.
7. Expand regression coverage around the new structure.
8. Remove `src/api.ts` and final compatibility seams.

---

## Best Next Task Set

If the goal is the highest architectural payoff with the lowest migration risk, the next batch should be:

1. Retire `useDebounce` and `useTaskActions` from `components/ou-workflow/hooks`.
2. Move Application Management detail sections out of `src/components/ou-workflow/ApplicationManagement`.
3. Decide final ownership for shared workflow modals and navigation.

That sequence finishes the remaining visible migration seams without forcing a disruptive rewrite.

---

## Final Guidance

This app does not need Redux, a new state library, or a full rewrite.

It already has the right architectural direction:

- TanStack Router for route ownership
- TanStack Query for server state
- feature-based APIs and query keys
- shared transport utilities

The real work now is finishing consistency:

- put ownership where it belongs
- keep route files thin
- keep server state in Query
- keep UI state local
- delete transitional seams as soon as they are no longer needed

That is the fastest path to a scalable, senior-friendly codebase without overengineering.
