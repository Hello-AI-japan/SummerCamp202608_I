export type Role = "admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Profile {
  id: string;
  display_name: string;
  role: Role;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_ids: string[];
  created_by: string | null;
  due_at: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskWithAssignee extends Task {
  assignees: Pick<Profile, "id" | "display_name">[];
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  assignee_ids?: string[];
  due_at?: string | null;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  assignee_ids?: string[];
  due_at?: string | null;
}
