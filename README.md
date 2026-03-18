# ncrc-app

`ncrc-app` is a React + TypeScript workflow application for reviewing and managing NCRC-related applications. It provides authenticated dashboards for:

- NCRC application review
- preliminary/intake application review
- task and notification tracking
- application detail management, including files, messages, plants, products, ingredients, and task events

This repository is no longer a generic TanStack starter. It is a working business application with Cognito authentication, dynamic API server selection, and multiple review workflows.

## Tech stack

- React 19
- TypeScript
- Vite
- TanStack Router with file-based routes
- TanStack Query for server state
- Tailwind CSS 4
- Radix UI primitives
- Vitest + Testing Library
- AWS Cognito PKCE authentication

## What the app does

After login, users land on a home screen that links to the main workflow areas:

- `Application Dashboard`: the primary NCRC dashboard
- `Tasks & Notifications`: task queue and task-level actions
- `Application Intake Dashboard`: preliminary/submission application review
- dashboard management dialogs for creating or deleting dashboard/intake records

Application detail pages expose a richer management UI with tabs such as:

- overview
- company details
- company contacts
- plants
- products
- ingredients
- quote
- recent activity
- task events
- file management
- messages

## Key runtime behavior

### Authentication

- Protected routing is enforced in `src/routes/__root.tsx`.
- The app uses AWS Cognito OAuth with PKCE from `src/auth/authService.ts`.
- Tokens are stored in `sessionStorage`.
- Unauthenticated users are redirected to `/login`.
- A local development login path is supported when the selected API server is `http://localhost:3001`.

### API configuration

The app resolves its API base URL dynamically:

1. user-selected server from app context
2. values exposed on `window.__APP_CONFIG__`
3. utility fallback

Runtime server options are currently defined in `public/data/config.js` as `API_CLIENT_URL*` values. The login screen lets the user choose one before starting the Cognito flow.

### Routing

The app uses file-based TanStack Router routes under `src/routes`.

Main route groups:

- `/`
- `/login`
- `/loginDev`
- `/profile`
- `/ou-workflow/ncrc-dashboard`
- `/ou-workflow/prelim-dashboard`
- `/ou-workflow/tasks-dashboard`
- per-application detail routes under dashboard folders

### Build metadata

Before production builds, `scripts/write-build-info.js` updates `src/build-info.json` with:

- incremented patch version
- build timestamp

This metadata is exposed through `getBuildInfo()` in `src/lib/utils.ts`.

## Getting started

### Prerequisites

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The Vite dev server runs on port `3000`.

You can also use:

```bash
npm run start
```

Both `dev` and `start` currently run Vite on port `3000`.

### Test

```bash
npm run test
```

### Build

```bash
npm run build
```

Production builds use the base path `/dashboard/`.

### Preview production build

```bash
npm run serve
```

## Available npm scripts

- `npm run dev` - start Vite dev server on port 3000
- `npm run start` - same as `dev`
- `npm run test` - run Vitest once
- `npm run build` - generate build info, build the app, then run TypeScript compilation
- `npm run serve` - preview the built app

## Project structure

```text
ncrc-app/
|- public/
|  |- data/config.js              # runtime API server options
|  |- web.config                  # deployment rewrite/static hosting config
|- scripts/
|  |- write-build-info.js         # build version/timestamp generator
|- src/
|  |- api.ts                      # API client and endpoint wrappers
|  |- auth/                       # Cognito config and auth flow
|  |- components/
|  |  |- ou-workflow/
|  |  |  |- ApplicationManagement/
|  |  |  |- NCRCDashboard/
|  |  |  |- PrelimDashboard/
|  |  |  |- TaskDashboard/
|  |  |  |- hooks/
|  |  |  |- modal/
|  |  |- ui/                      # shared UI primitives
|  |- context/
|  |  |- UserContext.tsx          # user session, selected API, layout prefs
|  |- lib/
|  |  |- constants/
|  |  |- utils/
|  |- routes/                     # file-based TanStack routes
|  |- types/
|  |- main.tsx                    # app bootstrap
|- vite.config.ts
|- vitest.config.ts
|- tailwind.config.ts
|- package.json
```

## Important areas for reviewers

If you are reviewing the codebase for behavior or future changes, start here:

### 1. App bootstrap

- `src/main.tsx`
- `src/routes/__root.tsx`

These files show provider setup, router setup, auth gating, global navigation, and toast wiring.

### 2. Authentication flow

- `src/auth/authService.ts`
- `src/auth/cognitoConfig.ts`
- `src/routes/login.tsx`

These files define PKCE login, token refresh, logout, callback handling, and server selection before authentication.

### 3. API integration

- `src/api.ts`
- `src/context/UserContext.tsx`
- `public/data/config.js`

These files define how the selected API host is stored, resolved, and used for authenticated requests.

### 4. Core workflows

- `src/components/ou-workflow/NCRCDashboard/`
- `src/components/ou-workflow/PrelimDashboard/`
- `src/components/ou-workflow/TaskDashboard/`
- `src/components/ou-workflow/ApplicationManagement/`

These folders contain the main business UI and the application review/detail flows.

### 5. Route entry points

- `src/routes/ou-workflow/ncrc-dashboard/`
- `src/routes/ou-workflow/prelim-dashboard/`
- `src/routes/ou-workflow/tasks-dashboard/`

These route files define search params, route validation, and which top-level feature component is mounted.

## Data flow summary

1. User selects an API server on the login page.
2. User authenticates through Cognito or uses local-dev login for localhost API mode.
3. `UserContext` stores session-level app state such as selected API URL, role, stage layout, and pagination mode.
4. `api.ts` resolves the active base URL and attaches bearer tokens to requests.
5. Feature hooks/components fetch dashboard or application data and render workflow actions.

## Architecture conventions

These conventions are required for new work and refactors.

### Route files stay thin

- Keep route files in `src/routes/**` focused on routing concerns only:
  - route declaration (`createFileRoute`)
  - search param validation (`validateSearch`)
  - loader wiring / redirects
  - mounting a feature screen
- Do not keep heavy UI state, API mapping logic, or large business workflows inside route files.

### Feature modules own business logic

- Business logic should live in feature modules (target structure: `src/features/<feature>/**`).
- Keep workflow-specific logic in feature hooks/services, not inside shared UI primitives.
- Components under `src/components/ui/**` should remain presentational and reusable.

### Server state belongs in TanStack Query

- Remote data fetching, caching, and mutation state must go through TanStack Query.
- Use `useQuery` for reads and `useMutation` for writes in feature hooks.
- Avoid ad hoc `useEffect + fetch` patterns in route and screen components.

### Shared API transport stays out of feature UI files

- Low-level transport concerns (base URL resolution, auth headers, timeouts, normalized errors) belong in shared API modules.
- Feature UI files should call feature hooks/APIs, not raw `fetch`.
- Keep endpoint contracts and response mapping close to feature API modules, not inline inside JSX components.

### Naming conventions

- Hooks:
  - Prefix all hooks with `use` (`useApplications`, `useTaskActions`).
  - Name by domain + intent: `use<Domain><Action|Resource>`.
- Query hooks:
  - Prefer names that read as data sources (`useApplicationDetail`, `usePrelimApplications`).
  - Keep query keys centralized per feature as key factories once introduced.
- Mutation hooks:
  - Name by command/action (`useAssignTaskMutation`, `useConfirmTaskMutation`), or group related actions in a clearly named hook (`useTaskActions`).
- Route search params:
  - Use a typed `...Search` shape per route (`DashboardSearch`, `PrelimDashboardSearch`).
  - Keep param names descriptive and stable (`page`, `limit`, `status`, `q`), avoid one-letter names.
  - Validate and normalize defaults in `validateSearch`.

## Notes and current implementation details

- `vite.config.ts` uses `/dashboard/` as the production base path and `/` in development.
- `public/web.config` suggests deployment behind a static host that needs SPA route rewrites.
- `public/data/*.json` contains mock/reference payloads used during development or prototyping.
- Some screens still contain demo-style seed data mixed with real API-driven flows, especially inside parts of `ApplicationManagement`.

## Suggested future README additions

If the team wants this document to go further, the next most valuable sections would be:

- environment-specific deployment instructions
- backend API contract summary
- role/permission matrix
- screenshot-based walkthrough of each dashboard
- testing strategy and coverage expectations
