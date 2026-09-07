import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/applications/screens/HomePage'

export const Route = createFileRoute('/_authed/')({
  component: HomePage,
})
