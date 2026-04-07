# ncrc-app

`ncrc-app` is a React + TypeScript workflow application for NCRC application review and operations. It includes authenticated dashboards for:

- NCRC application review
- preliminary intake review
- task and notification handling
- application detail management across files, plants, products, ingredients, messages, quote data, and task events

This repository is a real business app, not a starter template. The current codebase uses Cognito-based authentication, TanStack Router route groups, TanStack Query for server state, feature-owned API modules, and a shared transport layer.

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Router with file-based routes
- TanStack Query
- Tailwind CSS 4
- Radix UI primitives
- Vitest + Testing Library
- AWS Cognito OAuth with PKCE

## Main Workflows

After login, the authenticated home page links to:

- `Application Dashboard` at `/ou-workflow/ncrc-dashboard`
- `Tasks & Notifications` at `/ou-workflow/tasks-dashboard`
- `Application Intake Dashboard` at `/ou-workflow/prelim-dashboard`

Users can also open dashboard-management dialogs from the home page for create/delete workflow actions.

Application detail screens expose richer management areas such as:

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

## Current Architecture

### Routing

The app uses TanStack Router file-based routes under [src/routes](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes).

Current route layout:

- [src/routes/__root.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/__root.tsx): plain root outlet
- [src/routes/_public.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public.tsx): public auth route group
- [src/routes/_authed.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed.tsx): authenticated layout, auth gating, and navigation shell

Public auth routes live under:

- [src/routes/_public/login.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public/login.tsx)
- [src/routes/_public/cognito-directcallback.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public/cognito-directcallback.tsx)
- [src/routes/_public/cognito-logout.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public/cognito-logout.tsx)

Authenticated routes live under:

- [src/routes/_authed/index.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/index.tsx)
- [src/routes/_authed/profile.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/profile.tsx)
- [src/routes/_authed/ou-workflow/**](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/ou-workflow)

Large workflow dashboards are lazy-loaded at the route level:

- [src/routes/_authed/ou-workflow/ncrc-dashboard/index.lazy.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/ou-workflow/ncrc-dashboard/index.lazy.tsx)
- [src/routes/_authed/ou-workflow/tasks-dashboard/index.lazy.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/ou-workflow/tasks-dashboard/index.lazy.tsx)
- [src/routes/_authed/ou-workflow/prelim-dashboard/index.lazy.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed/ou-workflow/prelim-dashboard/index.lazy.tsx)

Loader-based detail entry points currently exist for:

- the NCRC application detail route
- the task-dashboard application task route
- the Cognito callback route

### Auth And Session

The current auth/session split is:

- [src/auth/authService.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/auth/authService.ts): PKCE login/logout helpers and authenticated fetch facade exports
- [src/features/auth/model/sessionManager.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/auth/model/sessionManager.ts): token/session ownership, callback completion, token parsing, refresh flow, redirect persistence
- [src/features/auth/model/tokenStorage.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/auth/model/tokenStorage.ts): session storage helpers
- [src/context/UserContext.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/context/UserContext.tsx): session identity in React context
- [src/context/AppPreferencesContext.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/context/AppPreferencesContext.tsx): API selection and display preferences

Unauthenticated users are redirected by [src/routes/_authed.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed.tsx).

The login screen supports:

- Cognito login
- local-dev session setup when the selected API server is `http://localhost:3001`

### API And Data Access

Preferred architecture:

- shared transport and request utilities in [src/shared/api](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api)
- domain APIs in [src/features/applications/api](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/applications/api), [src/features/tasks/api](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/tasks/api), [src/features/prelim/api](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim/api), and [src/features/profile/api](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/profile/api)
- query hooks in feature folders under `src/features/*/hooks`
- query keys in feature model folders

Important shared files:

- [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts)
- [src/shared/api/errors.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/errors.ts)
- [src/shared/api/queryClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/queryClient.ts)
- [src/shared/api/queryOptions.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/queryOptions.ts)
- [src/shared/api/queryParams.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/queryParams.ts)

`src/api.ts` still exists, but it is a compatibility layer for older imports. New code should avoid `@/api` and import from shared or feature modules directly.

### UI Ownership

The UI is currently split across:

- [src/components/ui](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ui): reusable primitive components
- [src/components/ou-workflow](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow): workflow screens and workflow-specific UI
- [src/features/applications/components](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/applications/components): newer feature-owned detail components

The app is mid-migration from workflow-folder ownership toward stronger feature ownership. Some compatibility hook surfaces still remain in [src/components/ou-workflow/hooks](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/hooks).

## Project Structure

```text
ncrc-app/
|- public/
|  |- data/config.js
|  |- web.config
|- scripts/
|  |- write-build-info.js
|- src/
|  |- api.ts
|  |- auth/
|  |- components/
|  |  |- ou-workflow/
|  |  |  |- ApplicationManagement/
|  |  |  |- NCRCDashboard/
|  |  |  |- PrelimDashboard/
|  |  |  |- TaskDashboard/
|  |  |  |- hooks/
|  |  |  |- modal/
|  |  |- ui/
|  |- context/
|  |- features/
|  |  |- applications/
|  |  |- auth/
|  |  |- prelim/
|  |  |- profile/
|  |  |- tasks/
|  |- lib/
|  |- routes/
|  |  |- __root.tsx
|  |  |- _public.tsx
|  |  |- _authed.tsx
|  |  |- _public/
|  |  |- _authed/
|  |- shared/
|  |  |- api/
|  |- test/
|  |- types/
|  |- main.tsx
|- ARCHITECTURE_ACTION_PLAN.md
|- package.json
|- vite.config.ts
|- vitest.config.ts
```

## Runtime Behavior

### API Base URL Resolution

The app resolves its API base URL in this order:

1. user-selected value stored in app preferences
2. runtime config from `window.__APP_CONFIG__`
3. utility fallback

Key files:

- [public/data/config.js](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/public/data/config.js)
- [src/context/AppPreferencesContext.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/context/AppPreferencesContext.tsx)
- [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts)

### Build Metadata

Before builds, [scripts/write-build-info.js](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/scripts/write-build-info.js) writes `src/build-info.json`, which is then read by [src/lib/utils.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/lib/utils.ts).

### Navigation Shell

Authenticated navigation is rendered by [src/components/ou-workflow/Navigation.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/Navigation.tsx) from the `_authed` layout.

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

The Vite dev server runs on port `3000`.

`npm run start` currently runs the same Vite command.

### Typecheck

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

### Test

```bash
npm run test
```

### Build

```bash
npm run build
```

Production builds use the base path `/dashboard/`.

### Preview The Production Build

```bash
npm run serve
```

## Available npm Scripts

- `npm run dev` - start Vite on port 3000
- `npm run start` - same as `dev`
- `npm run build` - run the Vite build and TypeScript compilation
- `npm run serve` - preview the build output
- `npm run test` - run Vitest once
- `npm run typecheck` - run TypeScript without emitting
- `npm run lint` - run ESLint
- `npm run format` - run Prettier write mode
- `npm run format:check` - run Prettier check mode

## Recommended Places To Start Reading

### App Bootstrap

- [src/main.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/main.tsx)
- [src/routes/__root.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/__root.tsx)
- [src/routes/_authed.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_authed.tsx)

### Auth Flow

- [src/auth/authService.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/auth/authService.ts)
- [src/features/auth/model/sessionManager.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/auth/model/sessionManager.ts)
- [src/routes/_public/login.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public/login.tsx)
- [src/routes/_public/cognito-directcallback.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/routes/_public/cognito-directcallback.tsx)

### Shared Data Layer

- [src/shared/api/httpClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/httpClient.ts)
- [src/shared/api/queryClient.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/queryClient.ts)
- [src/shared/api/queryOptions.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/shared/api/queryOptions.ts)

### Feature Domains

- [src/features/applications](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/applications)
- [src/features/tasks](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/tasks)
- [src/features/prelim](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/prelim)
- [src/features/profile](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/features/profile)

### Main Workflow Screens

- [src/components/ou-workflow/NCRCDashboard](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/NCRCDashboard)
- [src/components/ou-workflow/TaskDashboard](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/TaskDashboard)
- [src/components/ou-workflow/PrelimDashboard](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/PrelimDashboard)
- [src/components/ou-workflow/ApplicationManagement](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/components/ou-workflow/ApplicationManagement)

## Conventions For New Work

### Keep Route Files Thin

Route files should mainly own:

- route declaration
- search param normalization
- redirects
- loader wiring
- mounting a feature screen

Heavy UI state and business logic should not accumulate in route files.

### Prefer Feature-Owned Data Access

- add new endpoint logic in `src/features/<feature>/api`
- add query/mutation hooks in `src/features/<feature>/hooks`
- keep query keys in feature model folders
- use shared API helpers for transport, params, and normalized errors

### Avoid New `@/api` Imports

`src/api.ts` is still present for migration compatibility. New code should import directly from feature/shared modules.

### Keep Shared UI Primitive

Components in `src/components/ui` should remain reusable and presentational. Workflow-specific business behavior should stay in workflow or feature modules.

## Testing Status

Testing infrastructure exists, but coverage is still light.

Current visible setup:

- [src/test/setup.ts](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/test/setup.ts)
- [src/test/renderWithProviders.tsx](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/src/test/renderWithProviders.tsx)

The current architecture plan in [ARCHITECTURE_ACTION_PLAN.md](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/ARCHITECTURE_ACTION_PLAN.md) tracks the next test priorities.

## Known Active Migration Areas

These are still in transition and should be treated carefully during refactors:

- `src/api.ts`
- `src/components/ou-workflow/hooks/*`
- large workflow screen containers in NCRC, Tasks, and Prelim
- task notes orchestration
- prelim flow cleanup

## Related Planning Doc

The current phased execution plan lives in [ARCHITECTURE_ACTION_PLAN.md](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/ARCHITECTURE_ACTION_PLAN.md).
