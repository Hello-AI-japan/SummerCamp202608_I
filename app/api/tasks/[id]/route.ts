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
    .select("id, assignee_id")
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

  if (!isAdmin && ("assignee_id" in body || "due_at" in body)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "only admin can change assignee or due date" },
      { status: 403 },
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
  if (isAdmin && body.due_at !== undefined) updateFields.due_at = body.due_at;

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
