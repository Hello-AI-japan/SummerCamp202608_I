import type { TaskStatus, TaskWithAssignee } from "@/types/task";
import { TaskCard } from "./TaskCard";

export function MemberSection({
  memberName,
  tasks,
  canEdit,
  onStatusChange,
}: {
  memberName: string;
  tasks: TaskWithAssignee[];
  canEdit: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{memberName}</h3>
      {tasks.length === 0 ? (
        <p className="text-xs text-gray-400">担当タスクなし</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canEdit={canEdit}
              onStatusChange={(status) => onStatusChange(task.id, status)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
