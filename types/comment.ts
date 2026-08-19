export interface Comment {
  id: string;
  task_id: string;
  author_id: string | null;
  author_display_name: string | null;
  body: string;
  created_at: string;
}

export interface CreateCommentInput {
  body: string;
}
