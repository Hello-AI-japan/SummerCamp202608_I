import type { TaskStatus, TaskWithAssignee } from "@/types/task";

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  done: "bg-green-500",
};

function clampPct(value: number) {
  return Math.min(100, Math.max(0, value));
}

// start_at が未設定の（既存）タスクは created_at を開始日の代わりに使う
function barStartOf(task: TaskWithAssignee) {
  return task.start_at ?? task.created_at;
}

export function GanttChart({ tasks }: { tasks: TaskWithAssignee[] }) {
  const plottable = tasks
    .filter((t) => t.due_at !== null)
    .sort((a, b) => new Date(barStartOf(a)).getTime() - new Date(barStartOf(b)).getTime());

  const unscheduledCount = tasks.length - plottable.length;

  if (plottable.length === 0) {
    return (
      <section className="mb-8 rounded-md border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-400">
          期限が設定されたタスクがまだありません。
          {unscheduledCount > 0 && ` （期限未設定: ${unscheduledCount}件）`}
        </p>
      </section>
    );
  }

  const barStartTimes = plottable.map((t) => new Date(barStartOf(t)).getTime());
  const dueTimes = plottable.map((t) => new Date(t.due_at!).getTime());
  const startMs = Math.min(...barStartTimes, ...dueTimes);
  const endMs = Math.max(...barStartTimes, ...dueTimes);
  const totalMs = Math.max(endMs - startMs, 1);

  return (
    <section className="mb-8 rounded-md border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <span>{new Date(startMs).toLocaleDateString("ja-JP")}</span>
        <span>{new Date(endMs).toLocaleDateString("ja-JP")}</span>
      </div>

      <div className="space-y-2">
        {plottable.map((task) => {
          const startPct = clampPct(((new Date(barStartOf(task)).getTime() - startMs) / totalMs) * 100);
          const duePct = clampPct(((new Date(task.due_at!).getTime() - startMs) / totalMs) * 100);
          const left = Math.min(startPct, duePct);
          const width = Math.max(Math.abs(duePct - startPct), 1.5);

          return (
            <div key={task.id} className="flex items-center gap-3">
              <p className="w-40 shrink-0 truncate text-xs text-gray-700" title={task.title}>
                {task.title}
              </p>
              <div className="relative h-4 flex-1 rounded bg-gray-100">
                <div
                  className={`absolute h-4 rounded ${STATUS_COLOR[task.status]}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {unscheduledCount > 0 && (
        <p className="mt-3 text-xs text-gray-400">期限未設定: {unscheduledCount}件（チャートには表示していません）</p>
      )}
    </section>
  );
}
