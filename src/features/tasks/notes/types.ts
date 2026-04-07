export type NoteTab = 'private' | 'public' | 'toMe'

export type NotesByTab<TNote> = {
  private: TNote[]
  public: TNote[]
  toMe: TNote[]
}
