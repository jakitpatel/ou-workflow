# NCRC App Architecture Action Plan

This document reflects the codebase as it exists now, including the completed foundation work, the newer task-notes changes, and the remaining refactors that will have the highest payoff.

The goal is not to preserve the older audit verbatim. The goal is to keep an accurate working plan the team can execute against today.

---

## Current Snapshot

### Completed or largely completed

- Project guardrails exist:
  - ESLint
  - Prettier
  - `typecheck`
  - Vitest bootstrap
- Shared API transport exists:
  - `src/shared/api/httpClient.ts`
  - `src/shared/api/errors.ts`
  - `src/shared/api/types.ts`
- Feature-owned API modules exist:
  - `src/features/applications/api`
  - `src/features/tasks/api`
  - `src/features/prelim/api`
  - `src/features/profile/api`
- Query key factories and shared query defaults exist and are in active use.
- Feature query/mutation hooks exist for applications, tasks, prelim, and profile.
- `src/api.ts` is now effectively a compatibility layer, not the main implementation point.
- The task notes flow has evolved beyond the original plan:
  - mention users support
  - threaded public replies
  - application/task note drawers
  - new `To Me` tab filtered by `ToUser`

### Partially completed

- Route files are thinner than before, but route protection is still root-level and path-string-based.
- Auth/session ownership is much cleaner now, with callback exchange and session creation centered in the session manager, but route gating and shell layout still live in `src/routes/__root.tsx`.
- Some legacy hook compatibility re-exports still exist under `src/components/ou-workflow/hooks`.
- `ApplicationManagement` is simplified at the entry point, but most detail complexity still lives in large feature UI files.
- The NCRC dashboard is decomposed more than before, but orchestration is still concentrated in a large screen plus heavy child containers.

### Still high risk

- `src/context/UserContext.tsx`
- `src/auth/authService.ts`
- `src/routes/__root.tsx`
- `src/components/ou-workflow/NCRCDashboard/index.tsx`
- `src/components/ou-workflow/TaskDashboard/index.tsx`
- `src/components/ou-workflow/PrelimDashboard/index.tsx`

Current size indicators:

- `src/components/ou-workflow/NCRCDashboard/index.tsx`: about 518 lines
- `src/components/ou-workflow/TaskDashboard/index.tsx`: about 453 lines
- `src/components/ou-workflow/PrelimDashboard/index.tsx`: about 259 lines
- `src/context/UserContext.tsx`: about 226 lines

---

## What Changed Since The Prior Plan

The older action plan correctly predicted the first wave of architecture work, but it now overstates completion in some areas and understates newer complexity in others.

The biggest differences today are:

- API and query architecture are in much better shape than the old bottlenecks suggested.
- Auth/session boundaries are much clearer now; the bigger remaining issue is route-level auth/layout composition in `src/routes/__root.tsx`.
- Route protection still depends on pathname checks in `src/routes/__root.tsx`.
- Screen-level orchestration remains heavy in the three major dashboard screens.
- Task notes are now a meaningful mini-domain and should be treated as one, not as incidental UI state spread across multiple components.

---

## Updated Phases

## Phase 1: Close The Remaining Foundation Gaps

Status: In progress

Goal: finish the cleanup that should happen before larger UI refactors.

### 1. Keep standards current and enforced

Status: Completed, maintain only

Keep:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- formatting rules and import ordering

Add next:

- tighten lint rules around stray `console.*` in app code
- add a small CI gate if one is not already enforcing lint, typecheck, and tests

### 2. Refresh architecture docs to match reality

Status: Completed

The README now reflects the current architecture, including the shared API transport, feature-owned API modules, the compatibility-layer role of `src/api.ts`, and the fact that auth/session and route-layout refactors are still active work.

Completed:

- updated `README.md` to describe the shared API transport plus feature-owned APIs
- documented the compatibility-layer status of `src/api.ts`
- documented that auth/session and route-layout work are still active refactor areas

Done:

- contributor docs now match the actual code path new changes should follow

---

## Phase 2: Finish Auth And Session Refactoring

Status: Completed for the current auth/session refactor slice

Goal: move from "working" auth to a clear, single-owner session model.

Why this is now the top priority:

- `UserContext` still owns both identity/session data and UI preferences
- `authService.ts` still owns token parsing, refresh, callback handling, storage mutation, redirect logic, and fetch retry behavior
- login screens duplicate most of their logic

### 3. Introduce a dedicated session manager

Status: Completed

Actions:

- create a session module under `src/features/auth/model`
- centralize:
  - token reads and writes
  - expiry checks
  - refresh-token flow
  - refresh deduping/locking
  - auth redirect persistence
  - callback flags and cleanup
- move token storage and refresh logic out of `authService.ts`

Progress so far:

- introduced `src/features/auth/model/tokenStorage.ts`
- introduced `src/features/auth/model/sessionManager.ts`
- moved token storage, callback flags, redirect persistence, and refresh handling behind the new session layer
- updated the callback route to use session-manager-owned callback/redirect state
- moved callback user loading and local-dev session creation into the session-manager layer

Likely files:

- `src/features/auth/model/sessionManager.ts`
- `src/features/auth/model/tokenStorage.ts`

Done:

- session behavior can now be explained primarily from `src/features/auth/model/sessionManager.ts` plus token storage helpers, without jumping between route files and context ownership

### 4. Shrink `UserContext` to app-session surface only

Status: Completed

Current issue:

- `UserContext` mixes:
  - username and roles
  - API base URL
  - stage layout
  - pagination mode
  - login/logout orchestration
  - profile-layout hydration

Actions:

- split auth/session state from user-preference state
- move layout preferences into either:
  - a dedicated preferences provider
  - a profile/preferences feature module
- keep `UserContext` or a renamed auth provider focused on identity/session only

Completed:

- introduced `src/context/AppPreferencesContext.tsx` for API base URL and display preferences
- moved `apiBaseUrl`, `stageLayout`, and `paginationMode` out of `UserContext`
- kept profile-layout hydration with the preferences provider instead of the auth/session provider
- updated login, profile, navigation, dashboard, and test wiring to consume app preferences separately

Target files:

- `src/context/UserContext.tsx`
- `src/routes/profile.tsx`

Done:

- preference changes no longer need the same provider surface as auth/session changes

### 5. Simplify login and callback flow

Status: Completed

Current issue:

- the app uses `/login` as the real login entry point, with localhost dev login behavior still handled inside that route
- callback state still relies on multiple storage flags
- logging and side effects are still spread across the route and service layers

Next step:

- move from the current split callback flags toward a smaller single-owner callback/session lifecycle inside the session manager

Actions:

- unify `/login` and `/loginDev` if both are still needed
- keep the callback route responsible for orchestration, but move low-level session mutation into the session manager
- remove redundant flags where possible:
  - `oauth_handled`
  - `cognito_callback_done`
  - ad hoc redirect state keys

Progress so far:

- `/login` remains the single active login route
- removed the duplicate `cognito_callback_done` flag and kept callback completion on a single session-manager-owned callback state path
- moved callback token exchange and callback-state handling further into `src/features/auth/model/sessionManager.ts`
- simplified `src/routes/cognito-directcallback.tsx` so it relies on the session manager instead of maintaining a second callback-complete lifecycle
- moved callback user-session mapping out of `src/routes/cognito-directcallback.tsx` and into the auth layer
- trimmed callback-route logging so the route stays focused on redirect/render orchestration
- moved callback user loading helpers into `src/features/auth/model/sessionManager.ts`
- moved local-dev login session setup out of `src/routes/login.tsx` and into `src/features/auth/model/sessionManager.ts`
- reduced the remaining duplication between `handleOAuthCallback()` and `loadAuthenticatedSessionUser()` in `src/auth/authService.ts` by routing both through one shared callback-loading helper
- moved the route-facing Cognito callback session loader out of `src/auth/authService.ts`, so `src/routes/cognito-directcallback.tsx` now loads callback sessions directly from the session-manager layer
- extracted shared Cognito callback/logout URL and authorization-code exchange helpers so `src/auth/authService.ts` stays focused on PKCE redirect initiation, logout wiring, and authenticated fetch behavior
- removed low-signal auth/session debug logging from the active SPA auth path, including callback URL/token payload logging and redirect-init logging
- retired the unsupported `src/auth/authInit.js` Cognito test bootstrap and removed the compatibility-only `handleOAuthCallback()` and `initAuth()` wrappers from `src/auth/authService.ts`

Next step:

- hand off the remaining auth-gating/layout work to Phase 3, since the callback/login flow is now centered on route loaders plus the session manager

Done when:

- the auth flow is understandable as:
  - login intent
  - callback exchange
  - session persistence
  - redirect restore

Done:

- the remaining auth concern is no longer session ownership; it is route/layout composition in `src/routes/__root.tsx`

---

## Phase 3: Replace Root-Level Pathname Auth Checks With Route Layouts

Status: In progress

Goal: use TanStack Router as the composition boundary instead of string-matching paths.

Current issue:

- `src/routes/__root.tsx` uses `endsWith('/login')`, `endsWith('/cognito-directcallback')`, and similar checks
- nav rendering and auth gating are coupled to pathname string checks

Why this is now the next priority:

- the auth/session internals are now mostly centered in `src/features/auth/model/sessionManager.ts`
- the main remaining auth-related architectural problem is that public vs authenticated behavior is still decided in the root route via pathname suffix checks
- `src/routes/__root.tsx` still mixes shell rendering, public-route exceptions, and auth redirect behavior

### 6. Introduce public and authenticated route groups

Status: Not started

Actions:

- create separate route layouts for:
  - public auth routes
  - authenticated application routes
- move nav rendering into the authenticated layout
- move auth redirects out of root pathname inspection

Suggested shape:

- `src/routes/__root.tsx`
- `src/routes/_public/*`
- `src/routes/_authed/*`

Done when:

- auth gating and shell layout are route-structure-driven, not string-driven

### 7. Move route-level orchestration into loaders where it helps

Status: Partially completed

Current state:

- callback route already uses a loader and now gets its session user from the session-manager layer
- dashboard routes are still mostly thin mount points without stronger data-entry boundaries

Actions:

- add or refine route loaders for critical detail screens where prefetching improves UX
- keep route files responsible for:
  - search param validation
  - redirects
  - data entry
  - mounting the feature screen

Likely candidates:

- `src/routes/ou-workflow/ncrc-dashboard/index.tsx`
- `src/routes/ou-workflow/ncrc-dashboard/$applicationId/index.tsx`
- `src/routes/ou-workflow/tasks-dashboard/$applicationId.tsx`
- `src/routes/profile.tsx`

Done when:

- route files remain thin without pushing all coordination back into giant screen components

### 8. Add route-level lazy loading

Status: Not started, except small local lazy usage in prelim JSON editor

Actions:

- lazy load large screen entry points
- keep boot path focused on login, callback, router shell, and shared providers

Targets:

- `src/components/ou-workflow/NCRCDashboard/index.tsx`
- `src/components/ou-workflow/TaskDashboard/index.tsx`
- `src/components/ou-workflow/PrelimDashboard/index.tsx`
- application detail screen entry points where bundle size matters

Done when:

- dashboard code is not part of the initial app boot bundle by default

---

## Phase 4: Refactor The Three Large Workflow Screens

Status: In progress

Goal: reduce screen-level orchestration density and make ownership clearer for multiple developers.

### 9. Refactor NCRC dashboard into a true feature screen

Status: Partially completed

Current state:

- the screen already composes smaller UI pieces
- query hooks are feature-owned
- but the top-level screen still owns too much:
  - search state
  - pagination mode logic
  - infinite-scroll orchestration
  - scroll restore
  - stats derivation
  - modal orchestration
  - route search syncing

Actions:

- move dashboard state/orchestration into a feature hook
- keep the screen component mainly responsible for composition
- isolate:
  - search/filter state
  - pagination/infinite mode behavior
  - stats derivation
  - modal orchestration

Suggested structure:

- `src/features/applications/screens/NcrcDashboardScreen.tsx`
- `src/features/applications/hooks/useApplicationDashboardState.ts`
- `src/features/applications/components/ApplicationFilters.tsx`
- `src/features/applications/components/ApplicationList.tsx`

Done when:

- the NCRC screen becomes much smaller and easier to review

### 10. Extract task notes into a small feature module

Status: Newly needed

Why this matters now:

- task/application notes are no longer a simple drawer with two arrays
- they now include:
  - private notes
  - public notes
  - `To Me` notes
  - mention lookups
  - threaded public replies
  - create-note and reply mutations
  - application-context notes and task-context notes

Current issue:

- note fetch/orchestration logic is duplicated between:
  - `src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx`
  - `src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx`

Actions:

- introduce a dedicated notes hook or feature service for drawer state
- centralize tab loading logic and note-fetch parameter construction
- separate presentational drawer UI from note orchestration
- define clearer types for note tab state and note thread mapping

Suggested structure:

- `src/features/tasks/notes/useTaskNotesDrawerState.ts`
- `src/features/tasks/notes/mappers.ts`
- `src/features/tasks/components/TaskNotesDrawer.tsx`

Done when:

- application notes and task notes reuse one orchestration path instead of copy-pasted loading logic

### 11. Refactor task dashboard the same way

Status: Partially completed

Current state:

- task queries and mutations are in feature hooks
- but the screen still owns:
  - debounce logic
  - filtering and sorting
  - modal orchestration
  - action dispatch branching
  - table rendering composition

Actions:

- extract a task-dashboard state hook
- move action dispatch branching behind focused command helpers
- keep the screen responsible for layout, not business branching

Done when:

- `src/components/ou-workflow/TaskDashboard/index.tsx` is mostly a composition shell

### 12. Refactor prelim dashboard into a feature-owned screen

Status: Partially completed

Current issue:

- it still mixes feature hooks with direct query usage and debug logging
- detail fetching still uses `fetchPrelimApplicationDetails` from the compatibility layer
- selected modal/detail orchestration is still local to the screen

Actions:

- move prelim detail fetching behind a feature-owned hook
- remove render-path debug logs
- split list state, detail-modal state, and action orchestration

Done when:

- the prelim screen follows the same architecture as applications/tasks

---

## Phase 5: Tighten Feature Boundaries And Remove Compatibility Layers

Status: Not completed

Goal: finish the migration so old import paths stop shaping new work.

### 13. Remove transitional hook re-exports

Status: Not started

Current examples:

- `src/components/ou-workflow/hooks/useApplications.ts`
- `src/components/ou-workflow/hooks/usePagedApplications.ts`
- `src/components/ou-workflow/hooks/useInfiniteApplications.ts`
- `src/components/ou-workflow/hooks/useTaskDashboardHooks.ts`

Actions:

- migrate remaining imports to feature-owned hook modules
- delete transitional re-export files once no call sites remain

Done when:

- new code never imports workflow hooks from compatibility locations

### 14. Reduce `src/api.ts` usage further

Status: Partially completed

Current issue:

- the compatibility layer still appears in real code paths, for example from `UserContext` and prelim detail fetches

Actions:

- replace remaining `@/api` imports with feature or shared-module imports
- keep `src/api.ts` only as a short-lived migration shim
- remove it completely once call sites are gone

Done when:

- feature code imports feature APIs directly

---

## Phase 6: Improve Rendering Performance After The Splits

Status: Not started

Goal: optimize once component boundaries are better.

### 15. Add virtualization where data volume justifies it

Targets:

- NCRC applicant list
- task dashboard table
- large product and ingredient tables

Done when:

- large result sets remain responsive without requiring broad memoization

### 16. Tighten rerender boundaries

Actions:

- optimize after state is extracted from giant screen components
- keep row/card props stable
- prevent modal state from rerendering entire screen trees

Done when:

- local UI interactions do not cascade through whole dashboards

### 17. Audit over-fetching and repeated requests

Actions:

- review detail fetches and repeated mount-time queries
- prefetch predictable navigations where helpful
- ensure stats are derived from fetched list data when possible

Done when:

- route transitions no longer issue obviously duplicate requests

---

## Phase 7: Strengthen The UI System Boundary

Status: Not started

Goal: prevent copy-paste dashboard UI from spreading further.

### 18. Extract reusable app-shell patterns

Actions:

- standardize:
  - page headers
  - filter bars
  - stats cards
  - empty states
  - loading panels
  - error panels

Suggested location:

- `src/shared/ui/app-shell/*`

Done when:

- workflow screens share a consistent shell without cloning markup

### 19. Keep container and presentational components separate

Actions:

- UI-only components should receive typed props
- data-fetching and mutation ownership should stay in feature containers/hooks

Done when:

- presentational pieces can be tested without router/query/auth setup

---

## Phase 8: Expand Test Coverage Around High-Risk Paths

Status: Started, but minimal coverage today

Current state:

- test bootstrap exists
- provider-based test render helper exists
- current visible coverage is still very light

### 20. Add hook tests for core data flows

Actions:

- cover:
  - applications list hooks
  - application detail hooks
  - tasks list hooks
  - key task mutations
  - prelim detail/query hooks once extracted

Done when:

- query and mutation behavior has regression coverage around success and failure paths

### 21. Add auth and route integration tests

Actions:

- cover:
  - unauthenticated redirect behavior
  - callback success
  - callback failure
  - session restore behavior
  - public vs authenticated layout routing

Done when:

- auth regressions are caught before release

### 22. Add workflow screen tests

Highest-value targets:

- NCRC dashboard filter/search behavior
- task dashboard action flows
- task notes drawer behavior, including `To Me`
- prelim detail modal loading
- profile preference save behavior

Done when:

- the riskiest workflow paths are protected during refactors

---

## Phase 9: Final Cleanup

Status: Not started

### 23. Remove dead code and stale debug output

Actions:

- remove leftover `console.log` and stale inline comments from production paths
- clean up obsolete auth comments and dead alternate implementations
- remove demo-only code where real feature code already replaced it

### 24. Finish documentation cleanup

Actions:

- update `README.md`
- document:
  - final folder structure
  - how to add a query
  - how to add a mutation
  - how route protection works
  - where preferences vs auth/session state live

Done when:

- the repository describes the architecture it actually expects

---

## Recommended Order From Here

1. Replace root pathname auth checks with route layouts.
2. Extract NCRC dashboard orchestration into a feature-state layer.
3. Extract task notes into a dedicated feature module.
4. Refactor task dashboard screen orchestration.
5. Refactor prelim dashboard screen orchestration.
6. Remove compatibility hook re-exports and remaining `src/api.ts` call sites.
7. Add route/auth/workflow tests around the new structure.
8. Do performance work after the screen and notes splits settle.
9. Finish docs and dead-code cleanup.

---

## Highest-Value Files To Tackle Next

- `src/context/UserContext.tsx`
- `src/auth/authService.ts`
- `src/routes/__root.tsx`
- `src/routes/login.tsx`
- `src/routes/cognito-directcallback.tsx`
- `src/components/ou-workflow/NCRCDashboard/index.tsx`
- `src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx`
- `src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx`
- `src/components/ou-workflow/NCRCDashboard/TaskNotesDrawer.tsx`
- `src/components/ou-workflow/TaskDashboard/index.tsx`
- `src/components/ou-workflow/PrelimDashboard/index.tsx`

---

## Working Method

For each refactor slice:

- make one structural change at a time
- migrate consuming code fully for that slice
- add tests in the same slice
- remove dead compatibility code before moving on where practical

Do not try to refactor auth, routing, and all dashboards at once. The best vertical sequence now is:

1. route layouts
2. NCRC dashboard plus notes
3. task dashboard
4. prelim dashboard
5. remaining compatibility cleanup and tests
