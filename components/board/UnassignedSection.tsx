import type { Role, TaskStatus, TaskWithAssignee } from "@/types/task";
import { TaskCard } from "./TaskCard";

export function UnassignedSection({
  tasks,
  canEdit,
  currentUser,
  onStatusChange,
}: {
  tasks: TaskWithAssignee[];
  canEdit: boolean;
  currentUser: { id: string; role: Role };
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <section className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">未アサイン</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canEdit={canEdit}
            currentUser={currentUser}
            onStatusChange={(status) => onStatusChange(task.id, status)}
          />
        ))}
      </div>
    </section>
  );
}
