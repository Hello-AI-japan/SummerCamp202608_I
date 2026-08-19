import type { TaskWithAssignee } from "@/types/task";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("ja-JP") : "未設定";
}

function getBarStyle(task: TaskWithAssignee, rangeStart: number, rangeDays: number) {
  if (!task.start_at || !task.due_at) return null;

  const start = new Date(task.start_at).getTime();
  const end = new Date(task.due_at).getTime();
  const left = Math.max(0, ((start - rangeStart) / 86400000 / rangeDays) * 100);
  const right = Math.min(100, ((end - rangeStart) / 86400000 / rangeDays) * 100);

  return {
    left: `${left}%`,
    width: `${Math.max(1, right - left)}%`,
  };
}

export function TaskScheduleView({ tasks }: { tasks: TaskWithAssignee[] }) {
  const scheduledTasks = tasks.filter((task) => task.start_at && task.due_at);
  const taskDates = scheduledTasks.flatMap((task) => [
    new Date(task.start_at!).getTime(),
    new Date(task.due_at!).getTime(),
  ]);
  const rangeStart = taskDates.length ? Math.min(...taskDates) : 0;
  const rangeEnd = taskDates.length ? Math.max(...taskDates) : rangeStart + 86400000;
  const rangeDays = Math.max(1, Math.ceil((rangeEnd - rangeStart) / 86400000) + 1);
  const totalEstimatedHours = tasks.reduce(
    (total, task) => total + (task.estimated_hours ?? 0),
    0,
  );
  const estimatedHoursByAssignee = tasks.reduce<Map<string, number>>((totals, task) => {
    const assigneeName = task.assignee?.display_name ?? "未アサイン";
    totals.set(assigneeName, (totals.get(assigneeName) ?? 0) + (task.estimated_hours ?? 0));
    return totals;
  }, new Map());

  return (
    <section className="mb-8 rounded-md border border-gray-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">スケジュール・工数</h2>
          <p className="text-xs text-gray-500">見積工数合計: {totalEstimatedHours}時間</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {[...estimatedHoursByAssignee.entries()].map(([assigneeName, hours]) => (
              <span key={assigneeName}>
                {assigneeName}: {hours}時間
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {formatDate(taskDates.length ? new Date(rangeStart).toISOString() : null)} - {formatDate(taskDates.length ? new Date(rangeEnd).toISOString() : null)}
        </p>
      </div>

      {scheduledTasks.length === 0 ? (
        <p className="text-sm text-gray-500">開始日と期限が設定されたタスクはありません。</p>
      ) : (
        <div className="space-y-3 overflow-x-auto">
          {scheduledTasks.map((task) => {
            const barStyle = getBarStyle(task, rangeStart, rangeDays);
            return (
              <div key={task.id} className="min-w-[560px]">
                <div className="mb-1 flex justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-gray-700">{task.title}</span>
                  <span className="shrink-0 text-gray-500">{task.estimated_hours ?? 0}時間</span>
                </div>
                <div className="relative h-5 rounded bg-gray-100">
                  {barStyle && (
                    <div
                      className="absolute top-0 h-5 rounded bg-gray-700"
                      style={barStyle}
                      title={`${formatDate(task.start_at)} - ${formatDate(task.due_at)}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}