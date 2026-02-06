export const TASK_TYPES = {
  CONFIRM: 'confirm',
  CONDITIONAL: 'conditional',
  CONDITION: 'condition',
  ACTION: 'action',
  PROGRESS: 'progress',
} as const;

export const TASK_CATEGORIES = {
  CONFIRMATION: 'confirmation',
  APPROVAL: 'approval',
  ASSIGNMENT: 'assignment',
  SELECTOR: 'selector',
  INPUT: 'input',
  SCHEDULING: 'scheduling',
  PROGRESS_TASK: 'progress_task',
} as const;
