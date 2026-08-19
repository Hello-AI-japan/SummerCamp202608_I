import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { attachAssignees } from "@/lib/tasks/withAssignees";
import { notifyTaskEvent } from "@/lib/notifications/notify";
import type { ApiResponse, Task, TaskWithAssignee, UpdateTaskInput } from "@/types/task";

const STATUS_VALUES = ["todo", "in_progress", "done"];

function parseAssigneeIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) return null;
  return [...new Set(value)];
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user, profile } = await getSessionProfile();

  if (!user || !profile) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("id, assignee_ids, start_at, due_at")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: fetchError.message },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "task not found" },
      { status: 404 },
    );
  }

  const isAdmin = profile.role === "admin";
  const isAssignee = (existing.assignee_ids as string[]).includes(user.id);

  if (!isAdmin && !isAssignee) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "forbidden" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as UpdateTaskInput;

  if (
    !isAdmin &&
    ("assignee_ids" in body || "start_at" in body || "due_at" in body || "estimated_hours" in body)
  ) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "only admin can change assignees, schedule, or estimated hours" },
      { status: 403 },
    );
  }

  if (body.status !== undefined && !STATUS_VALUES.includes(body.status)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "invalid status" },
      { status: 400 },
    );
  }

  const effectiveStartAt = body.start_at !== undefined ? body.start_at : existing.start_at;
  const effectiveDueAt = body.due_at !== undefined ? body.due_at : existing.due_at;
  const effectiveStartTime = effectiveStartAt ? new Date(effectiveStartAt).getTime() : null;
  const effectiveDueTime = effectiveDueAt ? new Date(effectiveDueAt).getTime() : null;

  if (
    (body.estimated_hours !== undefined &&
      body.estimated_hours !== null &&
      (!Number.isFinite(body.estimated_hours) || body.estimated_hours < 0)) ||
    (effectiveStartAt !== null && (effectiveStartTime === null || !Number.isFinite(effectiveStartTime))) ||
    (effectiveDueAt !== null && (effectiveDueTime === null || !Number.isFinite(effectiveDueTime))) ||
    (effectiveStartTime !== null && effectiveDueTime !== null && effectiveStartTime > effectiveDueTime)
  ) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "invalid task schedule or estimated hours" },
      { status: 400 },
    );
  }

  const updateFields: UpdateTaskInput = {};
  if (body.status !== undefined) updateFields.status = body.status;

  if (isAdmin && body.assignee_ids !== undefined) {
    const assigneeIds = parseAssigneeIds(body.assignee_ids);
    if (assigneeIds === null) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "assignee_ids must be an array of strings" },
        { status: 400 },
      );
    }
    updateFields.assignee_ids = assigneeIds;
  }
  if (isAdmin && body.start_at !== undefined) updateFields.start_at = body.start_at;
  if (isAdmin && body.due_at !== undefined) updateFields.due_at = body.due_at;
  if (isAdmin && body.estimated_hours !== undefined) updateFields.estimated_hours = body.estimated_hours;

  const { data, error } = await supabase
    .from("tasks")
    .update(updateFields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 400 },
    );
  }

  const task = data as Task;
  await notifyTaskEvent("updated", task);

  const { data: profiles } =
    task.assignee_ids.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", task.assignee_ids)
      : { data: [] };

  return NextResponse.json<ApiResponse<TaskWithAssignee>>({
    data: attachAssignees([task], profiles ?? [])[0],
    error: null,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user, profile } = await getSessionProfile();

  if (!user || !profile) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "unauthorized" },
      { status: 401 },
    );
  }

  if (profile.role !== "admin") {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "admin only" },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
}
