export type MyMessagesTab = 'incoming' | 'outgoing' | 'mention'

export type NoteTab = 'directed' | 'private' | 'public' | MyMessagesTab

export type NotesByTab<TNote> = {
  incoming: TNote[]
  outgoing: TNote[]
  mention: TNote[]
  private: TNote[]
}
