export type NoteTab = 'directed' | 'private' | 'public'

export type NotesByTab<TNote> = {
  directed: TNote[]
  private: TNote[]
  public: TNote[]
}
