import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import type { ApiResponse, TaskWithAssignee, UpdateTaskInput } from "@/types/task";

const STATUS_VALUES = ["todo", "in_progress", "done"];

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
    .select("id, assignee_id, start_at, due_at")
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
  const isAssignee = existing.assignee_id === user.id;

  if (!isAdmin && !isAssignee) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "forbidden" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as UpdateTaskInput;

  if (!isAdmin && ("assignee_id" in body || "start_at" in body || "due_at" in body || "estimated_hours" in body)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "only admin can change assignee or due date" },
      { status: 403 },
    );
  }

  if (
    body.estimated_hours !== undefined &&
    body.estimated_hours !== null &&
    (!Number.isFinite(body.estimated_hours) || body.estimated_hours < 0)
  ) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "estimated_hours must be a non-negative number" },
      { status: 400 },
    );
  }

  const effectiveStartAt = body.start_at !== undefined ? body.start_at : existing.start_at;
  const effectiveDueAt = body.due_at !== undefined ? body.due_at : existing.due_at;
  const effectiveStartTime = effectiveStartAt ? new Date(effectiveStartAt).getTime() : null;
  const effectiveDueTime = effectiveDueAt ? new Date(effectiveDueAt).getTime() : null;

  if (
    (effectiveStartTime !== null && !Number.isFinite(effectiveStartTime)) ||
    (effectiveDueTime !== null && !Number.isFinite(effectiveDueTime)) ||
    (effectiveStartTime !== null && effectiveDueTime !== null && effectiveStartTime > effectiveDueTime)
  ) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "start_at must be before due_at" },
      { status: 400 },
    );
  }

  if (body.status !== undefined && !STATUS_VALUES.includes(body.status)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "invalid status" },
      { status: 400 },
    );
  }

  const updateFields: UpdateTaskInput = {};
  if (body.status !== undefined) updateFields.status = body.status;
  if (isAdmin && body.assignee_id !== undefined) updateFields.assignee_id = body.assignee_id;
  if (isAdmin && body.start_at !== undefined) updateFields.start_at = body.start_at;
  if (isAdmin && body.due_at !== undefined) updateFields.due_at = body.due_at;
  if (isAdmin && body.estimated_hours !== undefined) {
    updateFields.estimated_hours = body.estimated_hours;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateFields)
    .eq("id", id)
    .select("*, assignee:profiles!tasks_assignee_id_fkey(id, display_name)")
    .single();

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json<ApiResponse<TaskWithAssignee>>({
    data: data as unknown as TaskWithAssignee,
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
