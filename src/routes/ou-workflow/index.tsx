import { createFileRoute } from '@tanstack/react-router'
import { OUWorkflowSystem } from './../../components/ou-workflow/OUWorkflowSystem'

export const Route = createFileRoute('/ou-workflow/')({
  component: OUWorkflowSystem,
})