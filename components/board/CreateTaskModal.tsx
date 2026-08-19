"use client";

import { useState } from "react";
import type { CreateTaskInput, Profile } from "@/types/task";

export function CreateTaskModal({
  members,
  onClose,
  onCreate,
}: {
  members: Profile[];
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => Promise<string | null>;
}) {
  const [title, setTitle] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const error = await onCreate({
      title,
      assignee_ids: assigneeIds,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      estimated_hours: estimatedHours ? Number(estimatedHours) : null,
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-base font-semibold text-gray-900">タスク作成</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">タイトル</label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              担当者（複数選択可・未選択で未アサイン）
            </label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-2">
              {members.map((member) => (
                <label key={member.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={assigneeIds.includes(member.id)}
                    onChange={() => toggleAssignee(member.id)}
                  />
                  {member.display_name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">期限</label>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">見積工数（時間・任意）</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? "作成中..." : "作成する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
