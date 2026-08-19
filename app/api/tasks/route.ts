import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { attachAssignees } from "@/lib/tasks/withAssignees";
import { notifyTaskEvent } from "@/lib/notifications/notify";
import type { ApiResponse, CreateTaskInput, Task, TaskWithAssignee } from "@/types/task";

function parseAssigneeIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) return null;
  return [...new Set(value)];
}

export async function GET() {
  const { supabase, user } = await getSessionProfile();

  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "unauthorized" },
      { status: 401 },
    );
  }

  const [{ data: tasks, error: tasksError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, display_name"),
    ]);

  if (tasksError || profilesError) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: (tasksError ?? profilesError)!.message },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiResponse<TaskWithAssignee[]>>({
    data: attachAssignees((tasks ?? []) as Task[], profiles ?? []),
    error: null,
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await getSessionProfile();

  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as CreateTaskInput;
  const title = body.title?.trim();

  if (!title || title.length > 200) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "title is required (max 200 chars)" },
      { status: 400 },
    );
  }

  const assigneeIds = parseAssigneeIds(body.assignee_ids);
  if (assigneeIds === null) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "assignee_ids must be an array of strings" },
      { status: 400 },
    );
  }

  const startAt = body.start_at ?? null;
  const dueAt = body.due_at ?? null;
  const startTime = startAt ? new Date(startAt).getTime() : null;
  const dueTime = dueAt ? new Date(dueAt).getTime() : null;

  if (
    (body.estimated_hours !== undefined &&
      body.estimated_hours !== null &&
      (!Number.isFinite(body.estimated_hours) || body.estimated_hours < 0)) ||
    (startAt !== null && (startTime === null || !Number.isFinite(startTime))) ||
    (dueAt !== null && (dueTime === null || !Number.isFinite(dueTime))) ||
    (startTime !== null && dueTime !== null && startTime > dueTime)
  ) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "invalid task schedule or estimated hours" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: body.description ?? null,
      assignee_ids: assigneeIds,
      start_at: startAt,
      due_at: dueAt,
      estimated_hours: body.estimated_hours ?? null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 400 },
    );
  }

  const task = data as Task;
  await notifyTaskEvent("created", task);

  const { data: profiles } =
    assigneeIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", assigneeIds)
      : { data: [] };

  return NextResponse.json<ApiResponse<TaskWithAssignee>>(
    { data: attachAssignees([task], profiles ?? [])[0], error: null },
    { status: 201 },
  );
}
