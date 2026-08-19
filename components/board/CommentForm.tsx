"use client";

import { useState } from "react";

export function CommentForm({ onSubmit }: { onSubmit: (body: string) => Promise<void> }) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSubmitting(true);
    await onSubmit(trimmed);
    setSubmitting(false);
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="コメントを入力..."
        className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        送信
      </button>
    </form>
  );
}
