import type { TaskStatus, TaskWithAssignee } from "@/types/task";
import { TaskCard } from "./TaskCard";

export function MyTasksSection({
  tasks,
  onStatusChange,
}: {
  tasks: TaskWithAssignee[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-gray-900">自分のタスク</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400">担当しているタスクはありません</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canEdit
              onStatusChange={(status) => onStatusChange(task.id, status)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
