import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import type { ApiResponse, CreateTaskInput, TaskWithAssignee } from "@/types/task";

export async function GET() {
  const { supabase, user } = await getSessionProfile();

  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(id, display_name)")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiResponse<TaskWithAssignee[]>>({
    data: data as unknown as TaskWithAssignee[],
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

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: body.description ?? null,
      assignee_id: body.assignee_id ?? null,
      due_at: body.due_at ?? null,
      created_by: user.id,
    })
    .select("*, assignee:profiles!tasks_assignee_id_fkey(id, display_name)")
    .single();

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json<ApiResponse<TaskWithAssignee>>(
    { data: data as unknown as TaskWithAssignee, error: null },
    { status: 201 },
  );
}
