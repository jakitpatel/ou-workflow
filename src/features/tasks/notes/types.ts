export type MyMessagesTab = 'incoming' | 'outgoing' | 'mention'

export type NoteTab = 'directed' | 'private' | 'public' | 'global' | MyMessagesTab

export type NotesByTab<TNote> = {
  global: TNote[]
  incoming: TNote[]
  outgoing: TNote[]
  mention: TNote[]
  private: TNote[]
}
