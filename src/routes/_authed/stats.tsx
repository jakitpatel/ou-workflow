import { createFileRoute } from '@tanstack/react-router'

import { StatsPage } from '@/features/stats/screens/StatsPage'

export const Route = createFileRoute('/_authed/stats')({ component: StatsPage })
