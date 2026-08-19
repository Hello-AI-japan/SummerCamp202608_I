import type { Profile, TaskWithAssignee } from "@/types/task";

const UNASSIGNED_KEY = "__unassigned__";

export function EffortSummary({
  tasks,
  members,
}: {
  tasks: TaskWithAssignee[];
  members: Profile[];
}) {
  const totals = new Map<string, { taskCount: number; hours: number }>();
  totals.set(UNASSIGNED_KEY, { taskCount: 0, hours: 0 });
  for (const member of members) {
    totals.set(member.id, { taskCount: 0, hours: 0 });
  }

  for (const task of tasks) {
    const hours = task.estimated_hours ?? 0;
    const targetIds = task.assignee_ids.length > 0 ? task.assignee_ids : [UNASSIGNED_KEY];

    for (const id of targetIds) {
      const entry = totals.get(id) ?? { taskCount: 0, hours: 0 };
      entry.taskCount += 1;
      entry.hours += hours;
      totals.set(id, entry);
    }
  }

  const rows = [
    ...members.map((member) => ({ id: member.id, name: member.display_name, ...totals.get(member.id)! })),
    { id: UNASSIGNED_KEY, name: "未アサイン", ...totals.get(UNASSIGNED_KEY)! },
  ];

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">担当者別 工数集計</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="pb-2">メンバー</th>
            <th className="pb-2">担当タスク数</th>
            <th className="pb-2">見積工数合計</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2 text-gray-800">{row.name}</td>
              <td className="py-2 text-gray-600">{row.taskCount}</td>
              <td className="py-2 text-gray-600">{row.hours}h</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-400">
        複数担当者が割り当てられたタスクは、按分せず各担当者に全工数を計上しています。
      </p>
    </section>
  );
}
