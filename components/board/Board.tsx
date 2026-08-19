"use client";

import { useState } from "react";
import type {
  ApiResponse,
  CreateTaskInput,
  Profile,
  TaskStatus,
  TaskWithAssignee,
} from "@/types/task";
import { MyTasksSection } from "./MyTasksSection";
import { MemberSection } from "./MemberSection";
import { UnassignedSection } from "./UnassignedSection";
import { CreateTaskButton } from "./CreateTaskButton";
import { CreateTaskModal } from "./CreateTaskModal";

export function Board({
  initialTasks,
  members,
  currentUser,
}: {
  initialTasks: TaskWithAssignee[];
  members: Profile[];
  currentUser: { id: string; role: "admin" | "member" };
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortByDueDate, setSortByDueDate] = useState(false);
  const isAdmin = currentUser.role === "admin";

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await res.json()) as ApiResponse<TaskWithAssignee>;

    if (json.data) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? json.data! : t)));
    }
  }

  async function handleCreate(input: CreateTaskInput): Promise<string | null> {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as ApiResponse<TaskWithAssignee>;

    if (!json.data) {
      return json.error ?? "作成に失敗しました";
    }

    setTasks((prev) => [...prev, json.data!]);
    return null;
  }

  const displayTasks = sortByDueDate
    ? [...tasks].sort((a, b) => {
        if (a.due_at === null && b.due_at === null) return 0;
        if (a.due_at === null) return 1;
        if (b.due_at === null) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      })
    : tasks;

  const myTasks = displayTasks.filter((t) => t.assignee_ids.includes(currentUser.id));
  const unassignedTasks = displayTasks.filter((t) => t.assignee_ids.length === 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">ボード</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortByDueDate((prev) => !prev)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {sortByDueDate ? "作成順に戻す" : "期限順に並べ替え"}
          </button>
          <CreateTaskButton onClick={() => setModalOpen(true)} />
        </div>
      </div>

      <MyTasksSection tasks={myTasks} currentUser={currentUser} onStatusChange={handleStatusChange} />

      <UnassignedSection
        tasks={unassignedTasks}
        canEdit={isAdmin}
        currentUser={currentUser}
        onStatusChange={handleStatusChange}
      />

      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">メンバー別</h2>
        {members.map((member) => (
          <MemberSection
            key={member.id}
            memberName={member.display_name}
            tasks={displayTasks.filter((t) => t.assignee_ids.includes(member.id))}
            canEdit={isAdmin || member.id === currentUser.id}
            currentUser={currentUser}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {modalOpen && (
        <CreateTaskModal
          members={members}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </main>
  );
}
