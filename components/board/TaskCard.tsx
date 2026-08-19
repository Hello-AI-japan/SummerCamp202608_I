import type { TaskStatus, TaskWithAssignee } from "@/types/task";
import { StatusBadge, StatusSelect } from "./StatusSelect";

function isOverdue(dueAt: string | null, status: TaskStatus) {
  if (!dueAt || status === "done") return false;
  return new Date(dueAt).getTime() < Date.now();
}

function isDueToday(dueAt: string | null) {
  if (!dueAt) return false;
  const due = new Date(dueAt);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

export function TaskCard({
  task,
  canEdit,
  onStatusChange,
}: {
  task: TaskWithAssignee;
  canEdit: boolean;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const overdue = isOverdue(task.due_at, task.status);
  const dueToday = isDueToday(task.due_at);

  return (
    <div
      className={`rounded-md border p-3 ${
        overdue ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className="mb-1 text-sm font-medium text-gray-900">{task.title}</p>
      {task.assignees.length > 0 && (
        <p className="mb-1 text-xs text-gray-500">
          担当: {task.assignees.map((a) => a.display_name).join("、")}
        </p>
      )}
      <p
        className={`mb-2 text-xs ${
          overdue ? "font-semibold text-red-600" : dueToday ? "font-semibold text-amber-600" : "text-gray-500"
        }`}
      >
        {task.due_at ? `期限: ${new Date(task.due_at).toLocaleDateString("ja-JP")}` : "期限なし"}
      </p>
      {canEdit ? (
        <StatusSelect value={task.status} onChange={onStatusChange} />
      ) : (
        <StatusBadge value={task.status} />
      )}
    </div>
  );
}
