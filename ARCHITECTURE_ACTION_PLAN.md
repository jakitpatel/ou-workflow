# NCRC App Architecture Action Plan

Reviewed: 2026-10-09. Scope: current local frontend and sibling mock backend.
This document separates verified current behavior from proposed maintenance work.
See [AGENTS.md](AGENTS.md) for working rules and [API contracts](docs/api-contracts.md)
for local backend behavior.

## Verified Baseline

These observations include pre-existing local changes and should be refreshed after
relevant implementation changes, rather than treated as permanent guarantees.

| Check                | Result on 2026-10-09                              |
| -------------------- | ------------------------------------------------- |
| Typecheck            | Pass                                              |
| Tests                | 53 files / 311 tests pass                         |
| Production build     | Pass with Vite 8.3.4                              |
| Lint                 | Fails: 9 errors and 608 warnings                  |
| Production audit     | 4 affected packages: 1 high, 3 moderate           |
| Node used for checks | 24.18.1; no runtime pin found                     |
| CI                   | No `.github` workflow directory found in this app |
| API documentation    | `docs/` is currently Git-ignored                  |

Typecheck, tests, lint, and build were verified during the dependency update in this
session. The production audit was refreshed with `npm audit --omit=dev --json`.
Its high finding is `@xmldom/xmldom`; moderate findings are the
`mammoth` / `argparse` / `sprintf-js` chain. These are affected-package counts,
not distinct-advisory counts or proof of exploitability. npm reports an xmldom fix;
the proposed Mammoth remedy is a breaking downgrade and needs independent review.
The earlier full install audit reported 21 findings; it is a different audit scope.

Declared dependency baselines: React/React DOM 19.3.0, TypeScript 5.9.3, Vite 8.3.4,
React plugin 6.1.2, Router 1.170.41 / router plugin 1.168.42, Query 5.104.1,
Vitest 5.0.3, jsdom 30.1.2, ESLint 10.12.0, Lucide React 1.54.0.
Tailwind CSS is declared at 4.2.1 and its Vite plugin at 4.3.3; verify compatibility
before aligning them. Resolved versions come from the lockfile. The previous plan's
Vite 8, ESLint 10, Lucide 1, and related migrations are already adopted.

## Current Architecture And Progress

The app uses strict TypeScript, feature ownership, TanStack file routes with automatic
splitting, TanStack Query, shared transport, and authenticated layout composition.

- `main.tsx` is the render entry; `app/providers` and `app/router` own bootstrap.
- Dashboard/detail screens are feature-owned. Home now mounts
  `features/applications/screens/HomePage`; Profile still contains substantial route UI.
- Feature APIs, mappers, hooks, query keys, and cache modules own domain behavior.
- The authenticated layout mounts `AuthenticatedEventsProvider` for one connection.
  `hooks/useSSE.tsx` subscribes locally; `shared/api` owns parsing/connection mechanics.
- Application/preliminary cache helpers refresh paged and infinite lists.
- Preliminary resolution has pure adapters and dedicated search endpoints; RC assignment
  and Schedule A edit/delete have dedicated API modules.
- Shared email utilities cover common addresses, formatting, copies, and attachments.
- Lazy boundaries exist for dashboards, application drawer content, preliminary detail
  from message actions, and JSON editor content.
- RFR sessions restrict navigation to Profile and RFR application detail. Builds use
  `/dashboard/`; development serves at `/`. Preserve Cognito/Okta callbacks and browser targets.

Remaining gaps include aggregate API modules with `Promise<any>`, legacy shared types,
duplicate task orchestration, very large drawers, and failing lint. The mock backend
has incomplete filters and in-memory mutations; mock success does not prove production
persistence or authorization.

Largest production modules (lines measured on review date):

| Module                               | Lines | Concern                                     |
| ------------------------------------ | ----: | ------------------------------------------- |
| `ContractStageDrawer.tsx`            | 4,257 | Templates, approvals, payloads, preview, UI |
| `ScheduleAIngredientsDrawer.tsx`     | 2,501 | Imports, edits, matching, UI                |
| `TaskNotesDrawer.tsx`                | 2,304 | Normalization, threads, composer, UI        |
| `ScheduleBProductsDrawer.tsx`        | 2,229 | Product orchestration and UI                |
| `useScheduleBProducts.ts`            | 1,496 | Parsing, matching, queries, mutations       |
| `useInspectionInvoiceDrawerState.ts` | 1,488 | Invoice state and requests                  |
| `useScheduleAIngredients.ts`         | 1,378 | Parsing, matching, drafts                   |
| `ApplicationDetailsContent.tsx`      | 1,170 | Detail tabs and composition                 |
| `types/application.ts`               | 1,055 | DTO/domain coupling                         |

Line count highlights review areas; responsibility and testability determine extraction.

## Target Boundaries

```text
src/app/                     providers and router composition
src/routes/                  declarations, loaders, search, access gates
src/features/<feature>/
  api/                       endpoint groups, DTOs, boundary mappers
  cache/                     domain event reconciliation and cache updates
  components/                UI and cohesive workflow sections
  hooks/                     queries, mutations, local orchestration
  lib/                       pure parsers, adapters, payload builders
  model/                     canonical types, keys, rules, constants
  screens/                   route-facing composition
src/shared/                  domain-independent infrastructure and utilities
src/components/              reusable UI, layout, feedback
```

Routes/screens compose features; components/hooks consume APIs/models; APIs consume
shared transport. Shared modules must not depend on features/routes. Necessary
cross-feature collaboration uses explicit API/model modules, not screen internals.
Avoid cycles and broad barrels. Maintain existing `utils` until substantive work
justifies moving them.

Normalize external aliases at typed boundaries. Separate tolerant DTOs from canonical
models. Query owns server state; React owns transient UI and explicit drafts.
New state/schema libraries or generic workflow frameworks require a demonstrated need.

## P0: Quality Gates And Release Reproducibility

1. Fix nine lint errors in Schedule A/B hooks and TaskNotesDrawer with behavior preserved.
   The previous SSE render-time ref assignment issue is already resolved.
2. Separate formatting from behavior changes; reduce warnings by category. Do not disable
   hooks rules to pass lint. Gradually promote correctness rules after debt is addressed.
3. Add a check script and CI for lockfile install, typecheck, tests, lint, and build.
   These do not exist yet. Remove `--passWithNoTests` from the required gate so discovery
   failures cannot silently pass.
4. Run typecheck before Vite in every build mode; current builds emit assets before `tsc`.
5. Select/pin a supported Node release and align engines, developer setup, and CI.
   Local Node 24 verification is not an established runtime support policy.
6. Deliberately track docs by revising the blanket ignore or adding explicit exceptions.

Acceptance: discovered tests pass, lint exits zero, type failures stop asset emission,
and a fresh supported environment reproduces checks in CI.

## P0: Dependency And Document-Processing Hygiene

1. Review production audit paths and actual document parsing/preview exposure. Apply
   compatible remedies with focused tests; record advisory, dependency path, owner,
   disposition, and review date when a fix is unsuitable or unavailable.
2. Move `@tailwindcss/vite` to devDependencies; the router plugin is already there.
3. Confirm planned `react-hook-form` usage; no source import was found. Remove it if
   unnecessary. `web-vitals` is absent, so that old removal task is complete.
4. Verify the Tailwind version difference. Separate patch/minor work from major migrations.
5. Inspect lockfile changes and audit tooling separately. Do not run blind
   `npm audit fix --force` or accept an incompatible downgrade automatically.

Acceptance: findings have verified fixes or dated dispositions, package ownership is
intentional, and dependency changes pass the full checks and lockfile review.

## P0: Typed Workflow Boundaries

1. Split aggregate APIs by responsibility when touched. Replace `Promise<any>`, starting
   with task assignment/completion, messages, resolution, and generated document responses.
2. Establish canonical task accessors and one note adapter; remove aliases from UI branching.
3. Move new domain types out of `types/application.ts`. Retire compatibility exports only
   after consumers migrate; avoid a second catch-all module.
4. Test direct KASH arrays, encoded role results, resolution fragments, mixed casing,
   nullable IDs, malformed responses, and incomplete fixtures.
5. Update API contracts whenever request/response semantics change.

Acceptance: migrated consumers use one shape, touched API code adds no new `any`,
and boundary tests cover missing, alternate, and invalid data.

## P1: Task Actions And Large Workflow Modules

Task execution still overlaps in `useTaskActions.ts` and `useTaskDashboardState.ts`.
Add parity tests before extracting a pure classifier with a discriminated union.
Share payload construction/invalidation while keeping drawer visibility local.
Cover resolution, assignment, NDA email/upload, conditions, confirmation, inspection,
visits, contract, certification, and schedules; preserve role/capacity restrictions.

Extract one cohesive slice per change:

- Contract: templates, fee/payload builders, approval rules, preview sections, notifications.
- Notes: adapters, threading/filtering, composer, attachments, list presentation.
- Schedule A/B: import sanitization, hierarchy/matching, drafts, save builders, table sections.
  Share identical mechanics while retaining ingredient/product rules.
- Inspection: adapters, recipients, invoice state, previews, completion flow. Model explicit
  states when boolean combinations can represent impossible workflows.

Acceptance: drawers compose tested modules; payloads, generated content, notifications,
draft preservation, role gates, and failure recovery remain equivalent.

## P1: Cache, Events, Routes, And Performance

1. Preserve one SSE connection; test subscriptions, cleanup, abort/reconnect, identity
   and API-base changes, malformed events, and stale-session isolation.
2. Keep event policies feature-owned. Preserve metadata, ordering, page parameters, and
   unrelated rows. Invalidate when filter membership/removals cannot be patched safely.
3. The mock emits `refresh_messages` only. Use synthetic tests for workflow/submission
   reload events and coordinate backend support before claiming end-to-end verification.
4. Replace query-to-state effects with derived values or event-driven resets. Refetches
   must not overwrite unsaved drafts.
5. Move Profile UI into its feature screen. Reuse keys/options in loaders and hooks.
   Preserve search state, RFR access, both navigation layouts, and the deployed base.
6. Measure loading/chunks before memoization or manual splitting. Lazy-load heavy editors
   and previews with loading/error recovery.
7. Plan stale-chunk recovery and asset retention with hosting; avoid reload loops.
   Review the current diagnostic SSE route's production exposure explicitly.

Acceptance: cache tests cover paged/infinite data and event isolation; auth/navigation
flows work; performance changes have measured before/after evidence.

## P1: Production Behavior And Observability

1. Preserve intentional localhost login and test deployed SSO redirects, callback failures,
   expired sessions, and role changes. Backend permissions remain independent of UI gates.
2. Gate routine logs and redact tokens, contact data, and business payloads.
3. Centralize typed timeout/abort and auth retries; legacy transport casts still need review.
4. Cover loading, empty, error/retry, pending actions, labels, focus, and keyboard behavior.
   Include upload/email failures, partial completion, and duplicate submission prevention.
5. Establish staging smoke checks for production backend behavior, base path, authentication,
   deep links, and refresh. Record the actual scope verified.

Acceptance: expected failures have recovery UI and actionable redacted errors.

## Delivery And Maintenance

For each change record workflow, source evidence, intended outcome, and acceptance criteria.
Characterize risky behavior before moving it. Preserve unrelated changes and generated
routes. Keep broad formatting, major upgrades, and business changes in separate reviews.

Use proportionate checks from AGENTS.md. Dependencies require typecheck, all tests,
lint, build, and lockfile inspection. Documentation-only changes need reference and
formatting checks. Report baseline failures separately; never label failed gates passed.

Review patches/minors and audits regularly; review architectural debt periodically.
Assign owners and target dates to maintenance work, and keep security dispositions
time-bounded. Revisit them when paths or upstream remedies change.

Record significant decisions in short dated ADRs: context, alternatives, outcome,
consequences, acceptance evidence, follow-up. Use relative links. Update this plan after
verified milestones; proposals alone do not complete work.

## Definition Of Done

- Gates reproduce locally and in CI; lint errors are resolved.
- Production dependency risks have reviewed fixes or dated dispositions.
- Typed adapters and feature ownership avoid cyclic dependencies.
- Server state, drafts, event subscriptions, and caches have clear owners.
- Core payloads, permissions, failures, and navigation modes have meaningful tests.
- Large modules shrink by responsibility while preserving behavior.
- Tracked documentation separates implemented behavior from pending work.
