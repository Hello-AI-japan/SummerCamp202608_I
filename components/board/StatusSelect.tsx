"use client";

import type { TaskStatus } from "@/types/task";

const LABELS: Record<TaskStatus, string> = {
  todo: "未着手",
  in_progress: "進行中",
  done: "完了",
};

export function StatusSelect({
  value,
  onChange,
}: {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      className="rounded-md border border-gray-300 px-2 py-1 text-xs"
    >
      {(Object.keys(LABELS) as TaskStatus[]).map((status) => (
        <option key={status} value={status}>
          {LABELS[status]}
        </option>
      ))}
    </select>
  );
}

export function StatusBadge({ value }: { value: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    todo: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
  };

  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${colors[value]}`}>
      {LABELS[value]}
    </span>
  );
}
