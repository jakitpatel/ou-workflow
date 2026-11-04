/**
 * Whether completed tasks show the "Undo task" button (Application Dashboard stage panel).
 *
 * Turned off on 2026-11-05: the undo implementation (useUndoTaskMutation, /undoTask,
 * mapTaskToUndoAction) is kept unchanged so it can be switched back on by setting this to true.
 */
export const TASK_UNDO_ENABLED = false
