# NCRC UI Action Plan

This plan is a focused follow-up to the broader [ARCHITECTURE_ACTION_PLAN.md](c:/Users/Jakit/Documents/shouki/NCRC/ncrc-app/ARCHITECTURE_ACTION_PLAN.md). It covers only the remaining migration and cleanup work around `src/components/ou-workflow/NCRCDashboard`.

It is designed to be the safest practical path, not the most aggressive rewrite.

## Why This Plan Exists

The NCRC dashboard is no longer the highest-risk area in the app, but it is still a transitional folder.

What is already in good shape:

- route-facing screen ownership now exists under `src/features/applications/screens`
- dashboard query/filter/search state already lives in `src/features/applications/hooks/useNcrcDashboardState.ts`
- task action execution already lives in `src/features/tasks/hooks/useTaskActions.ts`
- notes state orchestration already lives in `src/features/tasks/notes/useTaskNotesDrawerState.ts`

What is still transitional:

- the real screen implementation still lives in `src/components/ou-workflow/NCRCDashboard`
- several application-specific components are still imported from the old workflow folder
- `TaskNotesDrawer` is still physically located in the NCRC folder even though it is now a shared notes UI
- `ApplicantCard.tsx` is still oversized and blends UI, orchestration, permissions, navigation, and drawer wiring

## Goal

Move the NCRC UI from workflow-folder ownership to proper feature ownership with minimal behavioral risk.

This plan is intentionally staged so we can stop after any slice and still have a coherent codebase.

---

## Current File Assessment

### Files in `src/components/ou-workflow/NCRCDashboard`

- `index.tsx`
- `ApplicantCard.tsx`
- `ApplicantProgressBar.tsx`
- `ApplicantStatsCards.tsx`
- `ApplicationExpandedStage.tsx`
- `TaskNotesDrawer.tsx`
- `TaskNotesDrawer.test.tsx`

### Recommended ownership target

Move into `src/features/applications`:

- `index.tsx` -> `screens/NcrcDashboardContent.tsx` or directly into `screens/NcrcDashboardScreen.tsx`
- `ApplicantCard.tsx` -> `components/ApplicantCard.tsx`
- `ApplicantProgressBar.tsx` -> `components/ApplicantProgressBar.tsx`
- `ApplicantStatsCards.tsx` -> `components/ApplicantStatsCards.tsx`
- `ApplicationExpandedStage.tsx` -> `components/ApplicationExpandedStage.tsx`

Move into `src/features/tasks`:

- `TaskNotesDrawer.tsx` -> `notes/TaskNotesDrawer.tsx` or `components/TaskNotesDrawer.tsx`
- `TaskNotesDrawer.test.tsx` -> colocated with the moved drawer

---

## Migration Principles

### 1. Move ownership before rewriting logic

Prefer:

- file moves
- import updates
- keeping public props stable

Before:

- splitting large components
- changing behavior
- redesigning UI contracts

### 2. Keep the success path untouched

During migration:

- routes should keep the same paths
- task action behavior should stay the same
- note loading and reply behavior should stay the same
- scroll restore and navigation behavior should stay the same

### 3. Separate applications UI from tasks UI

Anything primarily about:

- applicant cards
- application progress stages
- application detail drawer access

belongs under `features/applications`.

Anything primarily about:

- notes
- mentions
- task note reply threads

belongs under `features/tasks`.

---

## Best/Safest Migration Order

## Slice 1: Move `TaskNotesDrawer` Out Of NCRC

Status: Completed

### Why first

This is the cleanest architectural win with the lowest risk:

- the state is already feature-owned under `features/tasks/notes`
- the UI is already reused by application-level and task-level notes
- the folder placement is now misleading

### Actions

1. Move `src/components/ou-workflow/NCRCDashboard/TaskNotesDrawer.tsx` to `src/features/tasks/notes/TaskNotesDrawer.tsx`.
2. Move `src/components/ou-workflow/NCRCDashboard/TaskNotesDrawer.test.tsx` with it.
3. Update imports in:
   - `src/components/ou-workflow/NCRCDashboard/index.tsx`
   - `src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx`
   - `src/components/ou-workflow/NCRCDashboard/ApplicationExpandedStage.tsx`
4. Keep component props unchanged during the move.

### Done when

- no active imports point to `NCRCDashboard/TaskNotesDrawer`

### Risk

Low

### Completed in this slice

- moved `src/components/ou-workflow/NCRCDashboard/TaskNotesDrawer.tsx` to `src/features/tasks/notes/TaskNotesDrawer.tsx`
- moved `src/components/ou-workflow/NCRCDashboard/TaskNotesDrawer.test.tsx` to `src/features/tasks/notes/TaskNotesDrawer.test.tsx`
- updated NCRC dashboard imports to use the tasks-owned drawer component
- preserved the drawer props and behavior contract during the move

---

## Slice 2: Move Small Presentational NCRC Components Into `features/applications`

Status: Completed

### Target files

- `ApplicantStatsCards.tsx`
- `ApplicantProgressBar.tsx`

### Why second

These files are relatively self-contained and have low orchestration risk.

### Actions

1. Move `ApplicantStatsCards.tsx` to `src/features/applications/components/ApplicantStatsCards.tsx`.
2. Move `ApplicantProgressBar.tsx` to `src/features/applications/components/ApplicantProgressBar.tsx`.
3. Update imports in:
   - `src/features/applications/components/NcrcDashboardControls.tsx`
   - `src/components/ou-workflow/NCRCDashboard/ApplicantCard.tsx`
4. Keep props and behavior unchanged.

### Done when

- those components are no longer imported from `components/ou-workflow/NCRCDashboard`

### Risk

Low

### Completed in this slice

- moved `ApplicantStatsCards.tsx` to `src/features/applications/components/ApplicantStatsCards.tsx`
- moved `ApplicantProgressBar.tsx` to `src/features/applications/components/ApplicantProgressBar.tsx`
- updated `NcrcDashboardControls.tsx` to import `ApplicantStatsCards` from `features/applications/components`
- updated `ApplicantCard.tsx` to import `ApplicantProgressBar` from `features/applications/components`
- preserved props and UI behavior during the move

---

## Slice 3: Move `ApplicationExpandedStage` Into `features/applications`

Status: Recommended third

### Why third

This file is clearly applications UI, but it still has note-drawer integration, so it is slightly more coupled than the smaller presentational pieces.

### Actions

1. Move `ApplicationExpandedStage.tsx` to `src/features/applications/components/ApplicationExpandedStage.tsx`.
2. Update its `TaskNotesDrawer` import to the new tasks-owned location from Slice 1.
3. Update imports from the card layer.

### Done when

- stage expansion UI is feature-owned under applications

### Risk

Low to medium

---

## Slice 4: Move `ApplicantCard` Into `features/applications`

Status: Recommended fourth

### Why fourth

`ApplicantCard.tsx` is the largest remaining NCRC-specific component and the one most likely to have accidental regressions if changed too early.

### Current responsibilities

- navigation to task dashboard and application details
- stage expansion wiring
- file/document links
- application notes drawer wiring
- detail drawer wiring
- cancel / undo-withdraw permission checks
- AI panel toggling

### Actions

1. Move `ApplicantCard.tsx` to `src/features/applications/components/ApplicantCard.tsx`.
2. Update imports to use the already-moved:
   - `ApplicantProgressBar`
   - `ApplicationExpandedStage`
   - `TaskNotesDrawer`
3. Keep the component intact at first.
4. Do not split internal logic in the same PR unless necessary.

### Done when

- `NcrcDashboardListSection.tsx` imports `ApplicantCard` from `features/applications/components`

### Risk

Medium

---

## Slice 5: Replace The Old NCRC Screen Implementation

Status: Recommended fifth

### Why fifth

By this point, most NCRC pieces will already be feature-owned, so moving the screen becomes mostly a composition cleanup.

### Actions

1. Move the real implementation from `src/components/ou-workflow/NCRCDashboard/index.tsx` into:
   - `src/features/applications/screens/NcrcDashboardContent.tsx`
   or
   - directly into `src/features/applications/screens/NcrcDashboardScreen.tsx`
2. Update imports to use feature-owned components.
3. Keep route bindings unchanged.

### Done when

- `src/features/applications/screens/NcrcDashboardScreen.tsx` no longer imports from `@/components/ou-workflow/NCRCDashboard`

### Risk

Medium

---

## Slice 6: Optional Internal Refactor Of `ApplicantCard`

Status: Only after ownership migration settles

### Why optional

The current architecture problem is mostly ownership, not correctness. Splitting `ApplicantCard.tsx` is useful, but not required to unlock the larger architecture plan.

### Candidate internal splits

- `ApplicantCardHeader.tsx`
- `ApplicantCardStats.tsx`
- `ApplicantCardActions.tsx`
- `ApplicantDocuments.tsx`
- `ApplicantAIAssistantPanel.tsx`

### Optional hook extraction

Only if the component still feels too dense after relocation:

- `hooks/useApplicantCardState.ts`

### Done when

- `ApplicantCard.tsx` becomes mostly composition

### Risk

Medium to high if mixed with ownership moves

---

## Recommended Target Structure

```text
src/features/applications/
|- screens/
|  |- NcrcDashboardScreen.tsx
|  |- NcrcDashboardContent.tsx
|- components/
|  |- NcrcDashboardControls.tsx
|  |- NcrcDashboardListSection.tsx
|  |- ApplicantCard.tsx
|  |- ApplicantProgressBar.tsx
|  |- ApplicantStatsCards.tsx
|  |- ApplicationExpandedStage.tsx
|  |- ApplicationDetailsDrawer.tsx
|  |- ApplicationDetailsContent.tsx
|- hooks/
|  |- useNcrcDashboardState.ts
```

```text
src/features/tasks/
|- notes/
|  |- TaskNotesDrawer.tsx
|  |- TaskNotesDrawer.test.tsx
|  |- useTaskNotesDrawerState.ts
|  |- types.ts
```

---

## What We Should Not Do Yet

Avoid bundling these into the same migration slice:

- redesigning the NCRC UI
- rewriting task action flow
- replacing existing workflow modals
- changing route paths
- changing search param behavior
- changing notes state contracts

That would turn a safe ownership migration into a risky feature refactor.

---

## Suggested Execution Batches

### Batch A

- move `TaskNotesDrawer`
- move `ApplicantStatsCards`
- move `ApplicantProgressBar`

This is the safest and highest-signal batch.

### Batch B

- move `ApplicationExpandedStage`
- move `ApplicantCard`

This completes most applications-side ownership.

### Batch C

- replace the old NCRC `index.tsx`
- make `NcrcDashboardScreen.tsx` own the actual screen implementation

### Batch D

- optional internal split of `ApplicantCard`
- delete the old `src/components/ou-workflow/NCRCDashboard` folder once imports are gone

---

## Recommendation

If we want the best next practical step, start with **Batch A**.

Why:

- it gives us immediate architectural improvement
- it avoids the highest-risk large-file move first
- it reduces misleading cross-domain ownership
- it prepares the folder for a cleaner `ApplicantCard` migration later

That is the safest way to continue the NCRC migration without destabilizing a working dashboard.
