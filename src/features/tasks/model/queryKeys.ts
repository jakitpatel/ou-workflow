type TasksListParams = {
  applicationId?: string
  searchTerm?: string
  daysFilter?: string | number
}

export const tasksQueryKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksQueryKeys.all, 'list'] as const,
  list: (params: TasksListParams) => [...tasksQueryKeys.lists(), params] as const,
  roleUsers: () => [...tasksQueryKeys.all, 'role-users'] as const,
  roleUserList: (roleType: string) => [...tasksQueryKeys.roleUsers(), roleType] as const,
  roles: () => [...tasksQueryKeys.all, 'roles'] as const,
  mentionUsers: () => [...tasksQueryKeys.all, 'mention-users'] as const,
} as const
