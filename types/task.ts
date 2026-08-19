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
  assignee_id: string | null;
  created_by: string | null;
  start_at: string | null;
  due_at: string | null;
  estimated_hours: number | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskWithAssignee extends Task {
  assignee: Pick<Profile, "id" | "display_name"> | null;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  assignee_id?: string | null;
  start_at?: string | null;
  due_at?: string | null;
  estimated_hours?: number | null;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  assignee_id?: string | null;
  start_at?: string | null;
  due_at?: string | null;
  estimated_hours?: number | null;
}
