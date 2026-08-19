import type { Task } from "@/types/task";

// M4担当者向けスタブ。SLACK_WEBHOOK_URL宛にfetchでPOSTする実装をここに追加する。
// 呼び出し側（app/api/tasks/route.ts, app/api/tasks/[id]/route.ts）は変更不要。
export async function notifyTaskEvent(
  event: "created" | "updated",
  task: Task,
): Promise<void> {
  void event;
  void task;
}
