# NCRC App Architecture Action Plan

This plan reflects the codebase as of April 7, 2026. It is meant to be an execution guide for the next refactor and stabilization slices, not a historical audit.

The architecture has improved a lot already:

- route groups are in place
- shared API transport and feature-owned APIs are established
- query keys and feature hooks are active
- auth/session ownership has moved substantially into `src/features/auth/model`
- the three main workflow dashboards are route-lazy-loaded

The biggest remaining issues are no longer "missing architecture." They are concentrated in a smaller set of high-impact areas:

- compatibility imports that still shape runtime paths
- large workflow screen containers
- duplicated task-notes orchestration
- prelim flow cleanup
- very light automated test coverage

---

## Current Snapshot

### Architecture that is already in good shape

- App bootstrap is centralized in [src/main.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/main.tsx).
- Shared transport/query infrastructure lives in [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts), [src/shared/api/queryClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/queryClient.ts), and [src/shared/api/queryOptions.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/queryOptions.ts).
- Feature-owned API modules exist for:
  - [src/features/applications/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/applications/api/index.ts)
  - [src/features/tasks/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/tasks/api/index.ts)
  - [src/features/prelim/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim/api/index.ts)
  - [src/features/profile/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/profile/api/index.ts)
- Query hooks are feature-owned for applications, tasks, prelim, and profile.
- Auth/session internals are now centered in:
  - [src/features/auth/model/sessionManager.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/auth/model/sessionManager.ts)
  - [src/features/auth/model/tokenStorage.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/auth/model/tokenStorage.ts)
  - [src/features/auth/model/cognitoOAuth.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/auth/model/cognitoOAuth.ts)
- Routing is now layout-based rather than root-path-string-based:
  - [src/routes/__root.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/__root.tsx)
  - [src/routes/_public.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public.tsx)
  - [src/routes/_authed.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed.tsx)
- Large dashboard entry points are lazy-loaded:
  - [src/routes/_authed/ou-workflow/ncrc-dashboard/index.lazy.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/ou-workflow/ncrc-dashboard/index.lazy.tsx)
  - [src/routes/_authed/ou-workflow/tasks-dashboard/index.lazy.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/ou-workflow/tasks-dashboard/index.lazy.tsx)
  - [src/routes/_authed/ou-workflow/prelim-dashboard/index.lazy.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/ou-workflow/prelim-dashboard/index.lazy.tsx)
- Detail-route loader boundaries exist for the main NCRC application detail view and task-dashboard application task view.

### Runtime seams that still matter

- `src/api.ts` is now much smaller in live usage, but it still exists as a migration shim until commented or residual call sites are cleaned up fully.
- `src/components/ou-workflow/hooks/*` still contains compatibility hooks used by active screens.
- `AppPreferencesContext` now imports directly from feature/shared modules, and the main workflow runtime paths touched in Phase 1 no longer depend on `@/api`.
- Task notes are UI-rich but not yet extracted into a focused feature module.
- Prelim workflow no longer depends on `@/api` in its active dashboard/drawer paths, but it still carries broader screen-orchestration and logging cleanup work.

### Highest-risk files right now

- [src/components/ou-workflow/NCRCDashboard/index.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard/index.tsx)
- [src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx)
- [src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx)
- [src/components/ou-workflow/TaskDashboard/index.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/TaskDashboard/index.tsx)
- [src/components/ou-workflow/PrelimDashboard/index.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/index.tsx)
- [src/context/AppPreferencesContext.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/context/AppPreferencesContext.tsx)
- [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts)
- [src/routes/_public/login.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public/login.tsx)

### Size indicators

- `src/components/ou-workflow/NCRCDashboard/index.tsx`: about 600 lines
- `src/components/ou-workflow/TaskDashboard/index.tsx`: about 453 lines
- `src/components/ou-workflow/PrelimDashboard/index.tsx`: about 262 lines
- `src/context/UserContext.tsx`: about 122 lines
- `src/context/AppPreferencesContext.tsx`: about 112 lines

---

## What Has Changed Since The Previous Plan

The previous plan is now outdated in a few key ways:

- Root-level pathname auth checks are no longer the main routing problem. The app already uses `_public` and `_authed` route groups.
- `UserContext` is much smaller than before. It now mostly owns session identity rather than API base URL and display preferences.
- `AppPreferencesContext` exists and owns API base URL plus display preferences, and it now imports directly from profile/shared modules instead of `@/api`.
- Auth/session work is no longer primarily about callback chaos. It is mostly about finishing cleanup and reducing duplication between route-facing auth helpers and shared transport behavior.
- Route-level lazy loading is already implemented for the three large dashboard entry points.
- Loader-backed detail entry points have started, but the pattern is not fully extended across the app.
- Task notes have become a real mini-domain with mentions, public/private tabs, "To Me", and reply threads. That is now refactor-worthy on its own.

---

## Active Findings That Should Shape The Next Phases

### 1. Compatibility imports still affect runtime behavior

Current live `@/api` usage includes:

- no active runtime imports remain in the app providers, dashboard dialog, or prelim dashboard/resolution drawer paths

Residual note:

- [src/components/ou-workflow/PrelimDashboard/JsonModal.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/JsonModal.tsx) still contains a commented legacy `@/api` import that should be cleaned up with future prelim polish

This means `src/api.ts` is now mostly a residual migration shim rather than a dependency of the main Phase 1 runtime paths, but it should still be retired deliberately.

### 2. Notes orchestration is duplicated across the NCRC flow

The main duplication is between:

- [src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx)
- [src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx)

The shared UI exists in [src/components/ou-workflow/NCRCDashboard/TaskNotesDrawer.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard/TaskNotesDrawer.tsx), but the fetch/load/reply/create-note logic is still duplicated.

### 3. Prelim flow has the most obvious cleanup debt

Observed issues:

- legacy compatibility leftovers and broader screen-level cleanup
- render-path debug logging
- direct detail fetch from compatibility layer
- task action bridging through older workflow-level hooks

Key files:

- [src/components/ou-workflow/PrelimDashboard/index.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/index.tsx)
- [src/components/ou-workflow/PrelimDashboard/ResolutionDrawer.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/ResolutionDrawer.tsx)
- [src/features/prelim/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim/api/index.ts)

### 4. Test infrastructure exists, but coverage is effectively minimal

Current visible setup:

- [src/test/setup.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/test/setup.ts)
- [src/test/renderWithProviders.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/test/renderWithProviders.tsx)
- one example test only

This is enough to start, but not enough to protect refactors in auth, routing, notes, or dashboard flows.

### 5. There is still production-path debug logging and local-dev-only behavior to clean up

Notable examples include:

- `console.log` in [src/features/prelim/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim/api/index.ts)
- multiple debug logs in prelim UI files
- hardcoded local-dev tokens in [src/routes/_public/login.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public/login.tsx)
- API transport debug logging in [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts)

---

## Updated Phased Plan

## Phase 1: Finish Compatibility Cleanup Around Core Providers

Status: In progress

Goal: remove the remaining compatibility-layer dependencies that still shape shared runtime behavior.

### 1. Move `AppPreferencesContext` off `@/api`

Status: Completed

Why:

- this provider should not depend on the migration shim
- profile preference hydration belongs to feature and shared modules directly

Actions:

- replace `registerUserContext` import with direct shared API import
- replace `fetchProfileLayout` import with direct profile feature import
- verify no provider-level code imports `@/api`

Completed:

- [src/context/AppPreferencesContext.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/context/AppPreferencesContext.tsx) now imports `registerUserContext` from [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts)
- [src/context/AppPreferencesContext.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/context/AppPreferencesContext.tsx) now imports `fetchProfileLayout` from [src/features/profile/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/profile/api/index.ts)
- provider-level `@/api` usage has been removed
- `npm run typecheck` passes after the import cleanup

Primary files:

- [src/context/AppPreferencesContext.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/context/AppPreferencesContext.tsx)
- [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts)
- [src/features/profile/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/profile/api/index.ts)

Done when:

- both app providers are free of compatibility imports

### 2. Reduce live `src/api.ts` usage to workflow-only migration seams

Status: Completed for the current active runtime call sites

Actions:

- migrate `DashboardAppDialog`
- migrate prelim dashboard and prelim resolution flow
- keep `src/api.ts` as a thin temporary re-export only while final call sites remain

Completed:

- [src/components/ou-workflow/modal/DashboardAppDialog.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/modal/DashboardAppDialog.tsx) no longer imports from `@/api`
- intake create/delete actions now import directly from [src/features/prelim/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim/api/index.ts)
- generic create/delete dialog requests now import `fetchWithAuth` directly from [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts)
- [src/components/ou-workflow/PrelimDashboard/index.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/index.tsx) now imports `fetchPrelimApplicationDetails` directly from [src/features/prelim/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim/api/index.ts)
- [src/components/ou-workflow/PrelimDashboard/ResolutionDrawer.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/ResolutionDrawer.tsx) now imports prelim create/update helpers directly from [src/features/prelim/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim/api/index.ts)
- [src/components/ou-workflow/PrelimDashboard/ResolutionDrawer.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/ResolutionDrawer.tsx) now imports KASH lookup helpers directly from [src/features/applications/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/applications/api/index.ts)
- active prelim dashboard debug logs were removed as part of the compatibility cleanup
- `npm run typecheck` passes after the dialog and prelim cleanup

Done when:

- `@/api` usage no longer appears in active dashboard/provider paths

---

## Phase 2: Extract Task Notes Into A Real Feature Slice

Status: Not started

Goal: eliminate duplicated note orchestration and make notes/refetch/reply behavior testable.

### 3. Create a notes-state hook for application/task note drawers

Actions:

- centralize tab state
- centralize note fetch parameter construction
- centralize create-note and reply flows
- centralize refetch behavior for:
  - private notes
  - public notes
  - "To Me" notes

Suggested structure:

- `src/features/tasks/notes/useTaskNotesDrawerState.ts`
- `src/features/tasks/notes/mappers.ts`
- `src/features/tasks/components/TaskNotesDrawer.tsx`

### 4. Migrate both NCRC note entry points to the shared notes feature

Targets:

- [src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx)
- [src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx)

Done when:

- the two NCRC note entry points stop duplicating note orchestration

---

## Phase 3: Shrink The NCRC Dashboard Container

Status: In progress

Goal: move orchestration out of the 600-line dashboard entry and make the route/component boundary clearer.

### 5. Extract dashboard state and coordination from `NCRCDashboard/index.tsx`

Current responsibilities still mixed in the screen:

- route-search syncing
- filter/search state
- pagination/infinite mode logic
- scroll restore
- task note modal orchestration
- stats derivation

Actions:

- introduce a focused dashboard-state hook
- keep `index.tsx` as a composition shell
- separate list rendering from screen-state ownership

Suggested structure:

- `src/features/applications/screens/NcrcDashboardScreen.tsx`
- `src/features/applications/hooks/useNcrcDashboardState.ts`
- `src/features/applications/components/*`

Done when:

- the screen mainly composes child sections instead of coordinating all behavior itself

---

## Phase 4: Refactor The Task Dashboard Into A Feature Screen

Status: In progress

Goal: reduce branching and UI orchestration in the task dashboard.

### 6. Extract task-dashboard state and action coordination

Current issues:

- filter/sort/debounce state is screen-owned
- modal orchestration is screen-owned
- task action dispatch branching still sits close to rendering
- debug logs remain in active handlers

Actions:

- introduce `useTaskDashboardState`
- push action branching behind clearer feature command helpers
- keep table rendering and layout in UI components

Key files:

- [src/components/ou-workflow/TaskDashboard/index.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/TaskDashboard/index.tsx)
- [src/components/ou-workflow/hooks/useTaskActions.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/hooks/useTaskActions.ts)

Done when:

- the screen is mainly layout and composition

---

## Phase 5: Clean Up And Stabilize The Prelim Workflow

Status: Not started

Goal: make prelim match the applications/tasks feature architecture.

### 7. Remove compatibility imports and debug logging from the prelim flow

Actions:

- replace remaining `@/api` imports with direct feature/shared imports
- remove debug logs from render and action paths
- stop fetching prelim details through the compatibility layer

### 8. Extract prelim detail and action orchestration

Actions:

- move detail-fetch behavior behind a feature hook
- keep the screen focused on filter/list/modal composition
- isolate resolution drawer API orchestration into feature helpers if needed

Primary files:

- [src/components/ou-workflow/PrelimDashboard/index.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/index.tsx)
- [src/components/ou-workflow/PrelimDashboard/ResolutionDrawer.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard/ResolutionDrawer.tsx)
- [src/features/prelim/api/index.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim/api/index.ts)

Done when:

- prelim follows the same import and state-ownership conventions as the other major workflows

---

## Phase 6: Remove Transitional Workflow Hook Surfaces

Status: Not started

Goal: stop older compatibility hook paths from shaping new work.

### 9. Retire `src/components/ou-workflow/hooks/*` where replacements already exist

Known active usage still points to:

- `useDebounce`
- `useTaskActions`
- older hook re-export locations in prelim/NCRC screens

Actions:

- migrate imports to feature-owned or shared locations
- decide which utilities belong in `src/shared`, which belong in `src/features/*`
- delete transitional re-export files after migration

Done when:

- new feature code never imports data/state hooks from `components/ou-workflow/hooks`

---

## Phase 7: Strengthen Route Boundaries And Detail Entry Points

Status: In progress

Goal: keep routing thin, data-aware, and consistent across top-level and detail routes.

### 10. Extend loader-based entry points where they improve UX

Already done:

- NCRC application detail loader
- task-dashboard application task loader
- callback route loader

Next candidates:

- profile data hydration if route ownership becomes clearer
- any future prelim detail route once prelim detail logic is split more cleanly

### 11. Evaluate lazy-loading for detail-oriented route entries

Potential follow-up:

- NCRC detail route
- task-dashboard detail route

Done when:

- route files stay thin and feature screens do not pull more data orchestration back into render components

---

## Phase 8: Add High-Value Regression Tests

Status: Started, but minimal coverage today

Goal: protect refactors as we execute the next slices.

### 12. Add query/mutation tests for feature hooks

First targets:

- application detail query options
- task query options
- task note creation mutation
- profile layout save mutation
- prelim detail hook once extracted

### 13. Add routing/auth integration tests

Cover:

- redirect from `_authed` to `/login`
- callback success
- callback failure
- route-group behavior for public vs authed pages

### 14. Add workflow interaction tests

Highest-value targets:

- NCRC search/filter sync
- task-dashboard action flows
- notes drawer tabs and reply behavior
- prelim detail modal loading
- profile preference persistence

Done when:

- the next refactor slices can ship with meaningful regression protection

---

## Phase 9: Performance And UI-System Hardening

Status: Not started

Goal: optimize after the screen boundaries are cleaner.

### 15. Tighten rerender boundaries after state extraction

Targets:

- NCRC applicant cards
- task table rows
- modal state isolation

### 16. Add virtualization only where it earns its cost

Best candidates:

- NCRC application list
- task dashboard list/table
- large product or ingredient tables

### 17. Standardize repeated shell UI patterns

Possible extraction area:

- `src/shared/ui/app-shell/*`

Patterns worth standardizing:

- page headers
- filter bars
- stats cards
- loading/empty/error shells

---

## Phase 10: Final Cleanup

Status: Not started

### 18. Remove stale debug output and low-signal logs

Actions:

- remove remaining `console.log` calls from production paths
- keep warnings/errors only where they are intentional and actionable
- review local-dev-only login behavior and decide whether to gate or document it more explicitly

### 19. Retire `src/api.ts` when the last runtime imports are gone

Done when:

- feature code imports only from feature/shared modules

### 20. Keep documentation aligned with the code

Actions:

- update README whenever a phase changes the folder ownership story
- document any new feature conventions introduced during the notes/dashboard refactors

---

## Recommended Execution Order

1. Extract the task-notes feature slice and migrate both NCRC note entry points.
2. Shrink the NCRC dashboard container into a feature-state pattern.
3. Refactor the task dashboard container and related action orchestration.
4. Clean up the remaining prelim screen orchestration and polish.
5. Remove compatibility workflow hooks and remaining `src/api.ts` residuals.
6. Add route/auth/notes/dashboard tests around the new structure.
7. Do performance and app-shell work after the structural refactors settle.

---

## Best Next Task Set

If we want the next practical batch of work to be low-risk and high-payoff, it should be:

1. Task-notes feature extraction.
2. NCRC dashboard state extraction.
3. Task dashboard state extraction.

That sequence shifts us from compatibility cleanup into the highest-value duplication and large-screen refactors.

---

## Working Method

For each slice:

- make one structural move at a time
- migrate all local call sites in the same slice
- add or extend tests while the slice is fresh
- remove compatibility code immediately when the last caller is gone

Avoid doing auth cleanup, NCRC extraction, task-dashboard refactor, and prelim cleanup in one branch. The codebase is ready for staged refactors now, and staged refactors will be much safer.
