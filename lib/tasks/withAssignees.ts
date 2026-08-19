import type { Profile, Task, TaskWithAssignee } from "@/types/task";

type AssigneeProfile = Pick<Profile, "id" | "display_name">;

export function attachAssignees(
  tasks: Task[],
  profiles: AssigneeProfile[],
): TaskWithAssignee[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return tasks.map((task) => ({
    ...task,
    assignees: task.assignee_ids
      .map((id) => profileMap.get(id))
      .filter((p): p is AssigneeProfile => p !== undefined),
  }));
}
