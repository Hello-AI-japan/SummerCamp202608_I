"use client";

import { useState } from "react";
import type { Role, TaskStatus, TaskWithAssignee, ApiResponse } from "@/types/task";
import type { Comment } from "@/types/comment";
import { StatusBadge, StatusSelect } from "./StatusSelect";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";

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
  currentUser,
  onStatusChange,
}: {
  task: TaskWithAssignee;
  canEdit: boolean;
  currentUser: { id: string; role: Role };
  onStatusChange: (status: TaskStatus) => void;
}) {
  const overdue = isOverdue(task.due_at, task.status);
  const dueToday = isDueToday(task.due_at);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  async function toggleComments() {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);

    if (nextOpen && comments === null) {
      setLoadingComments(true);
      setCommentError(null);
      const res = await fetch(`/api/tasks/${task.id}/comments`);
      const json = (await res.json()) as ApiResponse<Comment[]>;
      if (json.data) {
        setComments(json.data);
      } else {
        setComments([]);
        setCommentError(json.error ?? "コメントの取得に失敗しました");
      }
      setLoadingComments(false);
    }
  }

  async function handleAddComment(body: string) {
    setCommentError(null);
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = (await res.json()) as ApiResponse<Comment>;

    if (json.data) {
      setComments((prev) => [...(prev ?? []), json.data!]);
    } else {
      setCommentError(json.error ?? "コメントの投稿に失敗しました");
    }
  }

  async function handleDeleteComment(commentId: string) {
    setCommentError(null);
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    const json = (await res.json()) as ApiResponse<{ id: string }>;

    if (json.data) {
      setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId));
    } else {
      setCommentError(json.error ?? "コメントの削除に失敗しました");
    }
  }

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
      <div className="flex items-center justify-between">
        {canEdit ? (
          <StatusSelect value={task.status} onChange={onStatusChange} />
        ) : (
          <StatusBadge value={task.status} />
        )}
        <button
          onClick={toggleComments}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          {commentsOpen ? "コメントを閉じる" : "コメント"}
        </button>
      </div>

      {commentsOpen && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          {loadingComments || comments === null ? (
            <p className="text-xs text-gray-400">読み込み中...</p>
          ) : (
            <CommentList
              comments={comments}
              currentUserId={currentUser.id}
              isAdmin={currentUser.role === "admin"}
              onDelete={handleDeleteComment}
            />
          )}
          {commentError && <p className="mt-1 text-xs text-red-600">{commentError}</p>}
          <CommentForm onSubmit={handleAddComment} />
        </div>
      )}
    </div>
  );
}
