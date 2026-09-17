import type { TaskNote } from '@/types/application'
import type { TaskNotesDrawerTabConfig } from './TaskNotesDrawer'
import type { NotesByTab } from './types'

/** Only application-list Notes drawers opt into the Global tab. */
export function getApplicationNotesTabs(
  notes: NotesByTab<TaskNote>,
  loading: Record<keyof NotesByTab<TaskNote>, boolean>,
): TaskNotesDrawerTabConfig[] {
  return [
    {
      id: 'incoming',
      label: 'Direct',
      notes: notes.incoming,
      loading: loading.incoming,
      mode: 'directed',
      tabClassName: 'border-violet-600 text-violet-700',
      badgeClassName: 'bg-violet-100 text-violet-700',
    },
    {
      id: 'private',
      label: 'Private',
      notes: notes.private,
      loading: loading.private,
      mode: 'private',
      tabClassName: 'border-blue-600 text-blue-700',
      badgeClassName: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'mention',
      label: 'Mention',
      notes: notes.mention,
      loading: loading.mention,
      mode: 'public',
      tabClassName: 'border-amber-600 text-amber-700',
      badgeClassName: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'global',
      label: 'Global',
      notes: notes.global,
      loading: loading.global,
      mode: 'public',
      tabClassName: 'border-emerald-600 text-emerald-700',
      badgeClassName: 'bg-emerald-100 text-emerald-700',
    },
  ]
}
