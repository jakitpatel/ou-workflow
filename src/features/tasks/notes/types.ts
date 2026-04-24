export type MyMessagesTab = 'incoming' | 'outgoing' | 'mention'

export type NoteTab = 'directed' | 'private' | 'public' | MyMessagesTab

export type NotesByTab<TNote> = {
  directed: TNote[]
  private: TNote[]
  public: TNote[]
}
