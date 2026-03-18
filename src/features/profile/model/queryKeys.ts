export const profileQueryKeys = {
  all: ['profile'] as const,
  layout: (username?: string | null) => [...profileQueryKeys.all, 'layout', username ?? 'unknown'] as const,
} as const
