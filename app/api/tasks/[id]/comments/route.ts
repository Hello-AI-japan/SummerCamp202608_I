import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import type { ApiResponse } from "@/types/task";
import type { Comment, CreateCommentInput } from "@/types/comment";

type CommentRow = {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  author: { id: string; display_name: string } | null;
};

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    task_id: row.task_id,
    author_id: row.author_id,
    author_display_name: row.author?.display_name ?? null,
    body: row.body,
    created_at: row.created_at,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getSessionProfile();

  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("task_comments")
    .select("id, task_id, author_id, body, created_at, author:profiles(id, display_name)")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiResponse<Comment[]>>({
    data: (data as unknown as CommentRow[]).map(toComment),
    error: null,
  });
}

export async function POST(
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

  const parsedBody = (await request.json()) as CreateCommentInput;
  const body = parsedBody.body?.trim();

  if (!body || body.length > 1000) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "body is required (max 1000 chars)" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("task_comments")
    .insert({ task_id: id, author_id: user.id, body })
    .select("id, task_id, author_id, body, created_at")
    .single();

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json<ApiResponse<Comment>>(
    {
      data: {
        ...data,
        author_display_name: profile.display_name,
      },
      error: null,
    },
    { status: 201 },
  );
}
