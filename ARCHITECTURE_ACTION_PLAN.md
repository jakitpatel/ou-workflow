# NCRC App Architecture Action Plan

This document converts the audit into a concrete implementation sequence. The order is intentional: each step reduces risk for the next one.

Use this as the working backlog for architectural cleanup, performance hardening, and team-scale maintainability.

## How To Use This Plan

- Complete one phase at a time.
- Do not start large UI rewrites before finishing the shared foundations.
- Keep each phase mergeable.
- Prefer adding tests during the same phase as the refactor, not afterward.

---

## Phase 1: Stabilize The Foundations

Goal: make the app safer to change before deeper refactors.

### 1. Add project standards and guardrails

Actions:
- Add ESLint with TypeScript, React, hooks, and import-order rules.
- Add a no-`console.log` rule for production code, allowing explicit exceptions for debugging utilities.
- Add Prettier and consistent formatting scripts.
- Add `typecheck`, `lint`, and `test` scripts to `package.json`.

Target files:
- `package.json`
- `eslint.config.*` or equivalent
- `.prettierrc`
- `.prettierignore`

Done when:
- `npm run lint`
- `npm run typecheck`
- `npm test`

### 2. Document architectural conventions

Actions:
- Add a short section to `README.md` explaining:
  - route files must stay thin
  - feature modules own business logic
  - server state belongs in TanStack Query
  - shared API transport must not live in feature UI files
- Add naming conventions for hooks, queries, mutations, and route search params.

Target files:
- `README.md`

Done when:
- New contributors can see the expected structure before editing code.

### 3. Add a real test bootstrap

Actions:
- Add a shared test setup file for Vitest and Testing Library.
- Add helper utilities for rendering with providers.
- Add network mocking strategy for API tests.

Target files:
- `vitest.config.ts`
- `src/test/setup.ts`
- `src/test/renderWithProviders.tsx`

Done when:
- Feature tests can mount router, query client, and auth context without copy-paste setup.

---

## Phase 2: Split The Monolithic API Layer

Goal: remove `src/api.ts` as the central bottleneck.

### 4. Create a shared HTTP client

Actions:
- Move generic fetch logic from `src/api.ts` into a shared module.
- Centralize:
  - base URL resolution
  - auth header injection
  - JSON parsing
  - timeout handling
  - normalized error handling
- Define a single `AppError` shape.

Target files to create:
- `src/shared/api/httpClient.ts`
- `src/shared/api/errors.ts`
- `src/shared/api/types.ts`

Current source:
- `src/api.ts`

Done when:
- No feature endpoint directly owns low-level `fetch` concerns.

### 5. Create feature-owned API modules

Actions:
- Break `src/api.ts` into domain modules:
  - applications
  - tasks
  - prelim
  - profile
  - auth/session helpers where needed
- Move endpoint-specific request builders and response mappers into those modules.

Suggested structure:
- `src/features/applications/api/*`
- `src/features/tasks/api/*`
- `src/features/prelim/api/*`
- `src/features/profile/api/*`

Done when:
- `src/api.ts` is either removed or replaced with a temporary compatibility re-export layer.

### 6. Normalize request and response typing

Actions:
- Replace broad `any` usage in API functions with typed request/response contracts.
- Add mapper functions for backend-to-frontend shape cleanup instead of inline transforms inside components.

Examples to address:
- `fetchApplicants`
- `fetchApplicationDetail`
- `fetchApplicationTasks`
- `fetchPrelimApplications`

Done when:
- API modules return predictable frontend-friendly types.

---

## Phase 3: Rebuild Query Architecture

Goal: make TanStack Query predictable and scalable.

### 7. Introduce query key factories

Actions:
- Add query key factories per feature.
- Stop using ad hoc string keys across hooks.
- Stop putting raw `token` into query keys.

Suggested files:
- `src/features/applications/model/queryKeys.ts`
- `src/features/tasks/model/queryKeys.ts`
- `src/features/prelim/model/queryKeys.ts`
- `src/features/profile/model/queryKeys.ts`

Done when:
- All queries and invalidations use centralized key builders.

### 8. Standardize query option defaults

Actions:
- Define feature-specific defaults for:
  - `staleTime`
  - `gcTime`
  - `retry`
  - `refetchOnWindowFocus`
- Put shared defaults in one place instead of repeating them in every hook.

Suggested files:
- `src/shared/api/queryClient.ts`
- `src/shared/api/queryOptions.ts`

Done when:
- Query behavior is intentional and not repeated across hooks.

### 9. Refactor list/detail hooks by feature

Actions:
- Rewrite hooks so they call feature APIs and query key factories.
- Merge overlapping list hooks where possible.
- Remove duplicated logic between paged and infinite hooks except the pagination strategy itself.

Current candidates:
- `src/components/ou-workflow/hooks/useApplications.ts`
- `src/components/ou-workflow/hooks/usePagedApplications.ts`
- `src/components/ou-workflow/hooks/useInfiniteApplications.ts`
- `src/components/ou-workflow/hooks/useApplicationDetail.ts`
- `src/components/ou-workflow/hooks/usePrelimApplications.ts`
- `src/components/ou-workflow/hooks/useTaskDashboardHooks.ts`

Done when:
- Hook responsibilities are clear and consistent.

### 10. Fix mutation invalidation strategy

Actions:
- Replace broad invalidation like `['applications']` with targeted invalidation.
- Patch cache directly when mutation results are deterministic.
- Separate assignment, confirmation, upload, and profile-save mutations into focused hooks.

Current candidates:
- `src/components/ou-workflow/hooks/useTaskActions.ts`
- `src/components/ou-workflow/TaskDashboard/index.tsx`
- `src/routes/profile.tsx`

Done when:
- Mutations refresh only what actually changed.

---

## Phase 4: Refactor Auth And Session Management

Goal: make Cognito flow robust and easier to reason about.

### 11. Create a dedicated session manager

Actions:
- Extract token storage and refresh behavior from `authService.ts`.
- Centralize:
  - access token retrieval
  - refresh token retrieval
  - expiry checks
  - refresh locking to prevent parallel refresh calls
  - session clearing

Suggested files:
- `src/features/auth/model/sessionManager.ts`
- `src/features/auth/model/tokenStorage.ts`

Done when:
- Auth state is managed in one place instead of across route files, context, and API utilities.

### 12. Simplify OAuth callback flow

Actions:
- Remove duplicated callback flags where possible.
- Keep route loader responsible for auth exchange.
- Keep component responsibility limited to rendering and minimal post-login transition.

Current files:
- `src/routes/cognito-directcallback.tsx`
- `src/auth/authService.ts`

Done when:
- Callback flow can be followed end-to-end without storage-flag guessing.

### 13. Split auth state from user preferences

Actions:
- Reduce `UserContext` scope.
- Move preferences like `stageLayout`, `paginationMode`, and possibly `apiBaseUrl` into separate providers or feature state modules.
- Keep auth provider focused on identity/session only.

Current file:
- `src/context/UserContext.tsx`

Done when:
- Auth state changes do not force unrelated preference re-renders.

---

## Phase 5: Rework The Route Architecture

Goal: use TanStack Router as an actual application composition layer.

### 14. Introduce public and authenticated route layouts

Actions:
- Replace root-level pathname suffix checks with layout-based route protection.
- Create separate route groups for:
  - public auth routes
  - authenticated app routes

Suggested route shape:
- `src/routes/__root.tsx`
- `src/routes/_public/*`
- `src/routes/_authed/*`

Done when:
- Route protection no longer depends on string matching like `endsWith('/login')`.

### 15. Move route-level data orchestration into loaders where it helps

Actions:
- Prefetch critical detail data in route loaders.
- Keep search param validation in route files.
- Pass route context cleanly into feature screens.

Current candidates:
- `src/routes/ou-workflow/ncrc-dashboard/index.tsx`
- `src/routes/ou-workflow/ncrc-dashboard/$applicationId/index.tsx`
- `src/routes/ou-workflow/tasks-dashboard/$applicationId.tsx`
- `src/routes/profile.tsx`

Done when:
- Route files compose data entry, feature screen, and navigation concerns without owning heavy UI logic.

### 16. Add route-level lazy loading

Actions:
- Split large dashboards and detail views with lazy imports.
- Keep initial bundle focused on login, auth bootstrap, and shell layout.

Heavy files to target:
- `src/components/ou-workflow/NCRCDashboard/index.tsx`
- `src/components/ou-workflow/TaskDashboard/index.tsx`
- `src/components/ou-workflow/PrelimDashboard/index.tsx`
- `src/components/ou-workflow/ApplicationManagement/index.tsx`

Done when:
- Dashboard code is not all loaded on first app boot.

---

## Phase 6: Break Large Screens Into Feature Containers

Goal: make screens maintainable for multiple developers.

### 17. Refactor NCRC dashboard into container + presentational pieces

Actions:
- Split:
  - filter/search state
  - query orchestration
  - stats derivation
  - pagination/infinite-scroll logic
  - modal state
  - applicant list rendering
- Keep screen component focused on composition.

Current file:
- `src/components/ou-workflow/NCRCDashboard/index.tsx`

Suggested feature structure:
- `src/features/applications/screens/NcrcDashboardScreen.tsx`
- `src/features/applications/components/ApplicationFilters.tsx`
- `src/features/applications/components/ApplicationList.tsx`
- `src/features/applications/components/ApplicationStats.tsx`
- `src/features/applications/hooks/useApplicationDashboardState.ts`

Done when:
- The main screen file is significantly smaller and easier to review.

### 18. Refactor task dashboard the same way

Actions:
- Remove duplicated mutation logic already similar to `useTaskActions`.
- Separate task filtering, row rendering, modal orchestration, and stats derivation.

Current file:
- `src/components/ou-workflow/TaskDashboard/index.tsx`

Done when:
- Task actions are handled by focused hooks, not by a single large component.

### 19. Refactor prelim dashboard into a real feature module

Actions:
- Separate:
  - intake list query
  - selected application detail query
  - stats calculation
  - action handling
  - modal orchestration
- Remove debug logs from render paths.

Current file:
- `src/components/ou-workflow/PrelimDashboard/index.tsx`

Done when:
- Prelim workflow logic is isolated and testable.

### 20. Refactor application management interface into domain panels

Actions:
- Split `ApplicationManagement/index.tsx` by tab or panel domain.
- Remove placeholder or local-only workflow state if it should be server-backed.
- Keep each panel self-contained and typed.

Current files:
- `src/components/ou-workflow/ApplicationManagement/index.tsx`
- `src/components/ou-workflow/ApplicationManagement/*`

Done when:
- Team members can work on files/messages/products/ingredients independently with minimal merge conflict risk.

---

## Phase 7: Improve Rendering Performance

Goal: reduce rerenders and make large datasets practical.

### 21. Add virtualization for large lists and tables

Actions:
- Virtualize applicant lists and task tables where row counts can grow large.
- Keep sticky headers and filters outside the virtualized region.

Targets:
- NCRC dashboard applicant list
- task dashboard table
- any large product or ingredient tables

Done when:
- Large result sets remain responsive.

### 22. Tighten rerender boundaries

Actions:
- Memoize expensive derived values only after component splitting.
- Use stable props for row items and cards.
- Avoid top-level screen state that causes every row to rerender.

Done when:
- Modal toggles, filter typing, and local state changes do not rerender the entire dashboard tree.

### 23. Remove repeated API calls and over-fetching

Actions:
- Audit detail screens for repeated query calls on mount.
- Prefetch where navigation patterns are known.
- Ensure list stats are not causing separate redundant requests if they can be derived from fetched data.

Done when:
- The same route transition does not trigger multiple equivalent requests.

---

## Phase 8: Define UI System Boundaries

Goal: stop dashboard UI from becoming copy-paste driven.

### 24. Create reusable app-shell components

Actions:
- Extract reusable patterns for:
  - page headers
  - filter bars
  - stats cards
  - empty states
  - loading blocks
  - error panels

Suggested location:
- `src/shared/ui/app-shell/*`

Done when:
- Workflow screens use a common layout language without duplicating markup.

### 25. Separate container and presentational components

Actions:
- Presentational components should receive typed props and avoid direct data-fetching.
- Container components should own hooks and server interactions.

Done when:
- UI components can be reused and tested without router/query setup.

---

## Phase 9: Expand Test Coverage Around Risky Paths

Goal: protect business workflows during refactors.

### 26. Add tests for query and mutation hooks

Actions:
- Test successful and failing states for:
  - application list hooks
  - application detail hooks
  - task list hooks
  - assignment/confirmation mutations

Done when:
- Core workflow hooks have regression coverage.

### 27. Add route/auth integration tests

Actions:
- Test:
  - unauthenticated redirect behavior
  - callback success path
  - callback failure path
  - session restoration on reload

Done when:
- Auth regressions are caught before release.

### 28. Add critical workflow screen tests

Actions:
- Cover:
  - NCRC dashboard filters
  - prelim detail modal loading
  - task action flows
  - profile preference save behavior

Done when:
- Highest-risk user flows are exercised by tests.

---

## Phase 10: Final Cleanup And Compatibility Removal

Goal: finish the migration cleanly.

### 29. Remove temporary compatibility layers

Actions:
- Delete transitional re-exports and unused hooks after all call sites are migrated.
- Remove dead components and unused utility functions.

Done when:
- The codebase reflects the new structure without old-path leftovers.

### 30. Update README and contributor docs

Actions:
- Document:
  - final folder structure
  - how to add a new feature module
  - how to add a query/mutation
  - how to protect a route
  - how to write a test with providers

Done when:
- The repository explains the architecture it expects.

---

## Recommended Implementation Order Summary

1. Add linting, formatting, scripts, and test bootstrap.
2. Split `src/api.ts` into shared transport plus feature API modules.
3. Add query key factories and standardized query defaults.
4. Refactor query hooks and mutation invalidation.
5. Rebuild auth/session management and reduce `UserContext` scope.
6. Introduce authenticated/public route layouts and route-level lazy loading.
7. Refactor NCRC dashboard.
8. Refactor task dashboard.
9. Refactor prelim dashboard.
10. Refactor application management into panel modules.
11. Add virtualization and rerender optimizations.
12. Expand tests around auth, queries, mutations, and workflows.
13. Remove compatibility code and update docs.

---

## Highest-Value Files To Tackle First

- `src/api.ts`
- `src/context/UserContext.tsx`
- `src/auth/authService.ts`
- `src/routes/__root.tsx`
- `src/routes/cognito-directcallback.tsx`
- `src/components/ou-workflow/NCRCDashboard/index.tsx`
- `src/components/ou-workflow/TaskDashboard/index.tsx`
- `src/components/ou-workflow/PrelimDashboard/index.tsx`
- `src/components/ou-workflow/ApplicationManagement/index.tsx`

---

## Suggested Working Method

For each phase:
- make the structural change
- migrate one feature at a time
- add or update tests
- remove dead code before moving on

Do not try to do all dashboards at once. Finish one vertical slice completely, then move to the next.
