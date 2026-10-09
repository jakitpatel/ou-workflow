# ncrc-app

Internal React + TypeScript application for NCRC review and operations. It supports
application intake, workflow/task management, company and plant resolution, inspection,
contracts, certification, Schedule A/B, files, and messages.

Reviewed against the local source on **2026-10-09**. Development uses the sibling
[ncrc-server-app](../ncrc-server-app/) mock; deployed environments use their configured API.

## Getting Started

The latest checks used **Node 24.18.1** and npm. The repository does not yet pin Node.
Use that verified version when reproducing the baseline. Installed jsdom requires
`^22.22.2 || ^24.15.0 || >=26.0.0`; the old “Node 20+” guidance is insufficient
for the current test stack.

From `ncrc-app/`:

```bash
npm ci
npm run build:info
npm run dev
```

`npm ci` installs the committed lockfile. Use `npm install` when deliberately changing
dependencies. Generate build information before the first development start on a clean
checkout: `src/build-info.json` is ignored and imported by the application.

The frontend runs at [http://localhost:3000](http://localhost:3000).
`npm run start` is an alias for the same Vite command.

For local mock data, open a second terminal:

```bash
cd ../ncrc-server-app
npm ci
node server.js
```

The mock listens on port **3001** and allows CORS from `http://localhost:3000`.
It has no `npm start` script. Set the development API URL to
`http://localhost:3001` and restart Vite; the login screen then uses the intentional
local development session path. A different API URL uses Cognito SSO.

## Environment Configuration

Vite reads the active mode's environment configuration:

| Mode               | File               | Command                                 |
| ------------------ | ------------------ | --------------------------------------- |
| Development server | `.env.development` | `npm run dev`                           |
| Development build  | `.env.development` | `npm run build:dev`                     |
| Staging build      | `.env.staging`     | `npm run build:stage`                   |
| Production build   | `.env.production`  | `npm run build` or `npm run build:prod` |

Required configuration keys for the selected API and SSO environment:

| Variable                    | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `VITE_API_CLIENT_URL`       | API base URL; use `http://localhost:3001` for the local mock           |
| `VITE_COGNITO_REGION`       | Cognito region                                                         |
| `VITE_COGNITO_USER_POOL_ID` | User pool identifier                                                   |
| `VITE_COGNITO_CLIENT_ID`    | Browser app client identifier                                          |
| `VITE_COGNITO_DOMAIN`       | Cognito domain without `https://`                                      |
| `VITE_COGNITO_IDP`          | Optional identity-provider selector; staging/production use `OktaOIDC` |

A developer-specific `.env.development.local` can supply local overrides without editing
shared environment files. Restart Vite or rebuild after configuration changes.
`VITE_*` values are embedded in browser assets and must not contain secrets.

The login screen exposes the mode-specific API URL. Shared HTTP transport accepts a
stored/context URL only when it matches that configured URL; saved preferences cannot
redirect requests to an unrelated backend. See [API URL resolution](src/shared/api/httpClient.ts)
and [preferences](src/context/AppPreferencesContext.tsx).

## Workflows And Routes

Paths below are application-relative; deployed builds prepend `/dashboard`.

| Page                              | Path                                          |
| --------------------------------- | --------------------------------------------- |
| Home and dashboard management     | `/`                                           |
| Application Dashboard             | `/ou-workflow/ncrc-dashboard`                 |
| Application Intake                | `/ou-workflow/prelim-dashboard`               |
| Tasks & Notifications             | `/ou-workflow/tasks-dashboard`                |
| Application detail                | `/ou-workflow/ncrc-dashboard/$applicationId`  |
| Task application detail           | `/ou-workflow/tasks-dashboard/$applicationId` |
| Restricted RFR application detail | `/ou-workflow/rfr-dashboard/$applicationId`   |
| Profile and display preferences   | `/profile`                                    |

Application detail includes company/contact/plant information, ingredients, products,
quote data, files, messages, activity, and task events. Workflow controls depend on
role and task state. The authenticated layout supports top and left navigation;
preferences also include pagination and stage presentation.

Cognito uses authorization code flow with PKCE. Staging/production select Okta through
Cognito. Callback/logout URLs derive from the current origin and Vite base:
`/cognito-directcallback` and `/cognito-logout` during development, or
`/dashboard/cognito-directcallback` and `/dashboard/cognito-logout` in builds.
Configure the matching URLs in the identity provider.

RFR session policy permits Profile and the restricted application-detail route, and
redirects other navigation. This is UI policy; backend authorization remains independent.
See [session management](src/features/auth/model/sessionManager.ts) and
[RFR access policy](src/features/auth/model/rfrAccess.ts).

## Architecture

```text
src/
  app/                       provider and router composition
  routes/                    file routes, loaders, search, redirects
  features/
    applications/            workflow dashboard, details, stages, schedules
    auth/                    session, OAuth, access policy
    prelim/                  intake, resolution, company/plant search
    profile/                 profile APIs and mutation hooks
    tasks/                   task dashboard, actions, notes
  components/
    layout/                  navigation and PageShell
    feedback/                shared error/recovery UI
    ui/                      reusable primitives
  context/                   user identity and preferences
  shared/
    api/                     transport, query defaults, SSE connection/parser
    email/                   common formatting and validation
  hooks/                     cross-feature hooks and SSE subscriptions
  lib/                       shared utilities and task helpers
  test/                      setup and provider-aware render helpers
  types/                     legacy shared types
```

Feature folders use `api`, `components`, `hooks`, `model`, `screens`, and, where
needed, `cache` and `lib`. Not every feature has every folder. Existing feature
`utils` modules remain in use.

[src/main.tsx](src/main.tsx) renders [AppProviders](src/app/providers/AppProviders.tsx);
[createAppRouter](src/app/router/createAppRouter.ts) wires generated routes.
The [authenticated layout](src/routes/_authed.tsx) owns auth gates, navigation, and
the authenticated event provider. Dashboard routes use lazy screen entry points;
Home already mounts a feature screen, while Profile still contains substantial route UI.
Never hand-edit `src/routeTree.gen.ts`.

TanStack Query owns server state. Feature query keys and cache helpers support paged
and infinite lists. React state holds transient UI and explicit editable drafts.
APIs use shared authenticated transport, and boundary mappers normalize backend quirks.
[Query defaults](src/shared/api/queryOptions.ts) centralize retry and refetch policy.

[EventsProvider](src/app/providers/EventsProvider.tsx) owns one authenticated SSE
connection through [useSSEConnection](src/shared/api/useSSEConnection.ts).
[useSSE](src/hooks/useSSE.tsx) subscribes locally. Workflow/submission event handlers
live in feature cache modules. The local mock emits only `refresh_messages`; other
event types need synthetic tests or a backend that emits them.

`src/api.ts` and `src/types/application.ts` remain compatibility/legacy modules.
New code imports from the owning feature/shared module. The retired
`src/components/ou-workflow` folder is not part of the current architecture.

## Stack

Declared baselines from [package.json](package.json); the lockfile determines resolved versions.

| Area               | Packages                                                            |
| ------------------ | ------------------------------------------------------------------- |
| UI                 | React / React DOM 19.3.0, Radix primitives, Sonner                  |
| Language and build | TypeScript 5.9.3, Vite 8.3.4, React plugin 6.1.2                    |
| Routing and data   | TanStack Router 1.170.41, Query 5.104.1                             |
| Styling and icons  | Tailwind CSS 4.2.1, Tailwind Vite plugin 4.3.3, Lucide React 1.54.0 |
| Tests              | Vitest 5.0.3, Testing Library React 16.3.3, jsdom 30.1.2            |
| Code checks        | ESLint 10.12.0, typescript-eslint 8.71.1, Prettier                  |

## Commands And Verification

Run commands from `ncrc-app/`.

| Command                                     | Purpose                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| `npm run dev` / `npm run start`             | Vite development server on port 3000                        |
| `npm run build:info`                        | Generate local build metadata                               |
| `npm run typecheck`                         | TypeScript check without emitting                           |
| `npm test`                                  | Run Vitest once                                             |
| `npm test -- --run <test-file>`             | Run a focused test file                                     |
| `npm run lint`                              | ESLint, including warnings                                  |
| `npx eslint . --quiet`                      | Show lint errors only                                       |
| `npm run build` / `npm run build:prod`      | Production build, then TypeScript check                     |
| `npm run build:dev` / `npm run build:stage` | Build with development/staging configuration                |
| `npm run serve`                             | Preview built assets locally                                |
| `npm run format:check`                      | Check repository formatting                                 |
| `npx prettier --write <files>`              | Format selected files                                       |
| `npm run format`                            | Format the whole repository; review broad changes carefully |
| `npm outdated`                              | Inspect dependency drift                                    |
| `npm audit --omit=dev`                      | Audit production dependencies                               |

All build modes use the `/dashboard/` base. Preview the build at the base path shown by
Vite, typically `http://localhost:4173/dashboard/`. Build hooks generate ignored
`src/build-info.json`, incrementing its local patch counter and recording a timestamp.
That counter is not a source-control release version.

Current build scripts run Vite before `tsc`. Run explicit typecheck first for validation:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

The latest review on **2026-10-09** found:

- Typecheck and production build pass.
- All **53 test files / 311 tests** pass.
- Lint fails with **9 errors and 608 warnings**.
- Production audit reports **4 affected packages: 1 high and 3 moderate**.

These are dated results, not a claim that every quality gate passes. Test count does not
establish full workflow or production coverage. Existing tests cover auth/access,
resolution, task actions, notes, cache refreshes, navigation, and application workflows.
Use [renderWithProviders](src/test/renderWithProviders.tsx) and an isolated test QueryClient.
No aggregate check script, Node pin, or app-local GitHub workflow is present yet.

## Backend And Deployment Notes

The mock's route registration lives in [src/app.js](../ncrc-server-app/src/app.js),
with feature handlers under [src/routes](../ncrc-server-app/src/routes/).
Mock data is reset on restart. Some filters are ignored and some handlers return success
without persisting input. Request casing and response formats vary; consult
[API contracts](docs/api-contracts.md) before changing integrations.

Host built `dist/` under `/dashboard/` and configure SPA fallback for deep links while
serving real assets directly. [public/web.config](public/web.config) provides the current
IIS rewrite to `/dashboard/index.html`. Coordinate API CORS and Cognito callback/logout
configuration with the deployed origin. Local preview is not a deployment command.

## Contributing And Maintenance

Read [AGENTS.md](AGENTS.md) for implementation rules and required checks.
[ARCHITECTURE_ACTION_PLAN.md](ARCHITECTURE_ACTION_PLAN.md) tracks current priorities:
lint/CI reliability, dependency review, typed boundaries, task-action consolidation,
large workflow decomposition, and cache/session correctness.

Keep routes declarative and new domain code feature-owned. Normalize backend aliases at
API boundaries. Preserve draft edits, both navigation layouts, RFR restrictions, and
the localhost login workflow. Add meaningful tests for changed behavior; characterize
high-risk workflows before extracting them. Keep unrelated formatting and major upgrades
out of business changes.

Update contracts when API semantics change and record significant decisions with context,
alternatives, outcome, and follow-up. `docs/` is currently Git-ignored, so verify that
documentation intended to ship is tracked deliberately. Formatting/reference checks are
sufficient for documentation-only changes; executable changes require the checks in AGENTS.md.
