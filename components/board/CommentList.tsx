import type { Comment } from "@/types/comment";

export function CommentList({
  comments,
  currentUserId,
  isAdmin,
  onDelete,
}: {
  comments: Comment[];
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (commentId: string) => void;
}) {
  if (comments.length === 0) {
    return <p className="text-xs text-gray-400">コメントはまだありません</p>;
  }

  return (
    <ul className="space-y-2">
      {comments.map((comment) => {
        const canDelete = isAdmin || comment.author_id === currentUserId;

        return (
          <li key={comment.id} className="rounded-md bg-gray-50 p-2 text-xs">
            <div className="mb-1 flex items-center justify-between text-gray-500">
              <span className="font-medium text-gray-700">
                {comment.author_display_name ?? "不明なユーザー"}
              </span>
              <div className="flex items-center gap-2">
                <span>{new Date(comment.created_at).toLocaleString("ja-JP")}</span>
                {canDelete && (
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-red-500 hover:underline"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-gray-800">{comment.body}</p>
          </li>
        );
      })}
    </ul>
  );
}
