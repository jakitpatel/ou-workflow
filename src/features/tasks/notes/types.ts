export type NoteTab = 'directed' | 'private' | 'public' | 'toMe'

export type NotesByTab<TNote> = {
  directed: TNote[]
  private: TNote[]
  public: TNote[]
  toMe: TNote[]
}
