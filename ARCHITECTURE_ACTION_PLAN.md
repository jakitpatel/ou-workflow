# NCRC App Architecture Action Plan

Audit date: 2026-07-29

This replaces the mostly completed compatibility-move plan with the next executable work.
The target is incremental improvement, not a rewrite.

## Executive Assessment

The project has a sound top-level structure: feature ownership, TanStack file routes,
automatic route splitting, TanStack Query server state, shared transport/query utilities,
strict TypeScript, and a reusable authenticated layout.

The next risks are below that structure:

1. Very large modules mix transport, domain rules, state machines, and rendering.
2. Backend variability leaks into UI code through repeated `any` casts and casing fallbacks.
3. Task execution and note normalization are duplicated.
4. Lint is not yet a reliable gate.
5. Tests are narrow relative to workflow risk.
6. Dependency/security maintenance needs a controlled cadence.

## Audit Evidence

- 160 non-generated TypeScript source files.
- 291 `any` / `as any` matches outside generated code and tests.
- 26 production-source console calls.
- 5 test files and 44 passing tests.
- ESLint: 12 errors and 481 warnings.
- Production build succeeds.
- Four fixable transitive audit findings: PostCSS and picomatch high; Babel and esbuild low.

Largest hotspots:

| Area                                 |   Lines | Concern                                        |
| ------------------------------------ | ------: | ---------------------------------------------- |
| `ContractStageDrawer.tsx`            |   4,329 | Templates, mapping, mutations, state, and UI   |
| `TaskNotesDrawer.tsx`                |   2,299 | Parsing, threading, filtering, compose, and UI |
| `ScheduleBProductsDrawer.tsx`        |   1,969 | UI and orchestration                           |
| `ScheduleAIngredientsDrawer.tsx`     |   1,538 | UI and orchestration                           |
| `useScheduleBProducts.ts`            |   1,325 | Parsing, matching, mutations, queries          |
| `useInspectionInvoiceDrawerState.ts` |   1,179 | State machine and APIs                         |
| `useScheduleAIngredients.ts`         |   1,143 | Parsing, matching, mutations, queries          |
| `types/application.ts`               |     998 | Unrelated DTOs and models coupled together     |
| `InspectionAssignmentDrawer.tsx`     |     957 | Adapters, workflow logic, and view             |
| Feature API `index.ts` files         | 607–926 | Unrelated endpoints and weak returns           |

## Package Review

The core stack is modern: React 19.2.8, Query 5.101.4, Router 1.170.18, Vite 7.3.6,
TypeScript 5.9.3, Tailwind 4.3.2, and Vitest 4.1.10.

Registry drift:

- Patch/minor candidates: Tailwind and its Vite plugin 4.3.3, typescript-eslint 8.65.0,
  ESLint and `@eslint/js` 9.39.5.
- Dedicated major migrations: Vite 8/plugin-react 6, ESLint 10, TypeScript 7, jsdom 29,
  Lucide 1, web-vitals 6, Node types 26.

Relevant official guidance:

- Router automatic splitting:
  https://tanstack.com/router/v1/docs/guide/automatic-code-splitting
- Query defaults and refetch policy:
  https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- React lazy/Suspense:
  https://react.dev/reference/react/lazy
- React memoization guidance:
  https://react.dev/reference/react/useMemo
- Vite performance measurement:
  https://vite.dev/guide/performance.html

## Target Direction

```text
src/features/<feature>/
|- api/
|  |- <endpoint-group>.ts
|  |- dto.ts
|  |- mappers.ts
|- components/<workflow>/
|  |- <Workflow>Drawer.tsx
|  |- sections/
|- hooks/
|- lib/       # pure adapters, parsers, calculations
|- model/     # canonical types, query keys, constants
|- screens/
```

External DTOs are tolerant; internal models are canonical. Mappers normalize casing once.
Hooks orchestrate. Pure transforms live in `lib`. Components render and handle events.

## Phase 0 — Restore A Trustworthy Quality Gate

Priority: P0

1. Fix the 12 ESLint errors:
   - ref mutation during render in `useSSE.tsx`;
   - redundant boolean casts;
   - Schedule A/B regex rules.
2. Auto-fix import/export ordering separately.
3. Track and burn down `any`, effect-sync, and Fast Refresh warnings; do not disable React
   hook rules globally.
4. Change build ordering so typecheck runs before Vite emits `dist`.
5. Add `npm run check` and CI jobs for typecheck, tests, lint, and build.
6. Pin the supported Node version.

Done when:

- Lint exits zero.
- Tests remain green.
- Type failures stop before bundling.

## Phase 1 — Dependency And Security Hygiene

Priority: P0

1. Move `@tailwindcss/vite` and `@tanstack/router-plugin` to `devDependencies`.
2. Apply low-risk patch/minor tool updates and regenerate the lockfile.
3. Re-run the production audit and verify PostCSS, picomatch, Babel, and esbuild fixes.
4. Confirm whether unused `react-hook-form` is planned; adopt consistently or remove.
5. Create separate issues for every major upgrade line.
6. Never combine major migrations or use `npm audit fix --force`.

Done when:

- No unexplained high production-audit findings.
- Runtime dependencies contain runtime packages only.
- Every direct dependency is used or documented.

## Phase 2 — Canonical Boundary Types And Mappers

Priority: P0

1. Add feature-local DTO modules for applications, tasks, prelim, notes, and profile.
2. Define canonical task accessors for ID, type/category, status/result, assignee, and
   capacity.
3. Move casing fallbacks out of components/hooks into mappers.
4. Create one canonical TaskNote adapter used by notes UI and state hooks.
5. Replace endpoint `Promise<any>` returns, starting with task actions and resolution.
6. Split new domain types out of `src/types/application.ts`, with temporary compatibility
   exports.
7. Evaluate runtime schemas only for unstable/high-risk boundaries.

Done when:

- Migrated UI code consumes one field shape.
- Touched API/domain code adds no new `any`.
- Mapper tests cover missing and alternate-casing data.

## Phase 3 — Unify Task Action Execution

Priority: P0

`useTaskActions.ts` and `useTaskDashboardState.ts` currently overlap.

1. Add table-driven tests for every action combination.
2. Extract pure `classifyTaskAction(task)` returning a discriminated union.
3. Use it from application, prelim, and task dashboards.
4. Centralize mutation inputs, result formatting, capacity, and invalidation.
5. Keep modal/drawer visibility feature-local.
6. Remove duplicate execution only after parity tests.

Done when:

- One classifier and mutation path govern all task actions.
- Resolver, assignment, invoice, visit, contract, schedule, upload, confirmation, and
  conditional paths have tests.

## Phase 4 — Split Large Workflows Incrementally

Priority: P1

### Contract

1. Move static legal templates into typed data modules.
2. Extract parsing and payload builders.
3. Extract mutation/notification orchestration into hooks.
4. Split preview, approval, schedules, and actions into sections.
5. Lazy-load preview/editor surfaces.

### Task Notes

1. Move normalization, threading, and filtering to `notes/lib`.
2. Split list, filters, composer, reactions, and thread view.
3. Derive loading/error from Query rather than mirroring with effects.
4. Preserve existing tests and add adapter tests.

### Schedule A/B

1. Extract shared import/text sanitization.
2. Extract matching and payload builders.
3. Separate query/mutation orchestration from editable drafts.
4. Share only identical mechanics; keep ingredient/product rules separate.
5. Test parsing, hierarchy, matching, and saves.

### Inspection

1. Extract application/task adapters shared by assignment, visit, and invoice.
2. Model workflow stages explicitly instead of loosely related booleans.
3. Split lookup, form, preview, and completion sections.

Done when:

- Main drawers are composition surfaces.
- Pure helpers live in `lib`, not another UI component.
- Behavior and bundle size are measured before/after.

## Phase 5 — Query And Effect Discipline

Priority: P1

1. Review every `set-state-in-effect` warning.
2. Replace query-to-state mirroring with query `select` or derived values.
3. Use event-driven resets or component keys for drawer lifecycle.
4. Keep explicit drafts only for editable server-backed forms.
5. Standardize defaults for reference data, dashboard lists, details, and messages.
6. Replace broad invalidations with targeted cache updates where safe.
7. Profile before adding memoization.

Done when:

- Hook warnings are resolved rather than suppressed.
- Server data has one source of truth.
- Refetch behavior is predictable.

## Phase 6 — Route, Screen, And Bundle Boundaries

Priority: P1

1. Move authenticated home UI into a feature/app screen.
2. Move Profile UI into `features/profile/screens`.
3. Keep route files declarative.
4. Lazy-load rarely opened heavy drawers/editor surfaces at module scope with Suspense.
5. Measure initial and route chunks with build output or a visualizer.
6. Add `vite:preloadError` recovery for stale deployed chunks if deployment can replace
   hashed assets.
7. Add manual chunk rules only after measurement.

Done when:

- Home and Profile routes are thin.
- Heavy workflows are absent from unrelated initial route work.
- Chunk loading failures have recovery UI.

## Phase 7 — Tests By Business Risk

Priority: P1, continuous

Add tests for:

1. Task classification and mutation inputs.
2. Application/task/prelim mapper aliases.
3. Company/plant resolution adapters.
4. Schedule A/B parsers and save payloads.
5. Contract payload generation and approval gates.
6. Notes adapter and threading.
7. Auth redirects and callback failure.
8. Top and left navigation layout.
9. HTTP timeout, refresh retry, errors, and abort.

Done when:

- Every risky extraction starts with characterization tests.
- Critical pure modules have meaningful branch coverage.
- Browser checks cover both navigation modes and core completion paths.

## Phase 8 — Production Hygiene

Priority: P2

1. Gate/remove routine `console.debug` in `httpClient.ts`.
2. Keep actionable errors without logging tokens or sensitive payloads.
3. Type request timeout options instead of attaching private fields through `any`.
4. Document and isolate localhost authentication and its removal criteria.
5. Either send web-vitals to a real sink or remove the call/package.
6. Add recovery for expected lazy-load/network failures.

Done when:

- Normal production use is console-quiet.
- Auth/transport failures are observable without sensitive exposure.

## Recommended Order

1. Quality gate.
2. Dependency/security patching.
3. Canonical task/note DTOs.
4. Unified task actions.
5. Notes split (best current test safety).
6. Schedule A/B pure parsers.
7. Contract and inspection decomposition.
8. Query, route, testing, and production hygiene continuously.

## Definition Of Done

- Typecheck, tests, lint, and build are reliable gates.
- No unexplained high production dependency vulnerabilities.
- Routes are thin and heavy features lazy-load at useful boundaries.
- Backend quirks are normalized at typed adapters.
- Task execution has one classification/mutation path.
- Large workflows are decomposed without regressions.
- Tests grow with every risky extraction.
- Documentation matches actual ownership and package baselines.
