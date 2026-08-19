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

  const myTasks = tasks.filter((t) => t.assignee_ids.includes(currentUser.id));
  const unassignedTasks = tasks.filter((t) => t.assignee_ids.length === 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">ボード</h2>
        <CreateTaskButton onClick={() => setModalOpen(true)} />
      </div>

      <MyTasksSection tasks={myTasks} onStatusChange={handleStatusChange} />

      <UnassignedSection
        tasks={unassignedTasks}
        canEdit={isAdmin}
        onStatusChange={handleStatusChange}
      />

      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">メンバー別</h2>
        {members.map((member) => (
          <MemberSection
            key={member.id}
            memberName={member.display_name}
            tasks={tasks.filter((t) => t.assignee_ids.includes(member.id))}
            canEdit={isAdmin || member.id === currentUser.id}
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
