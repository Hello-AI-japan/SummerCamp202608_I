import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import type { ApiResponse } from "@/types/task";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;
  const { supabase, user, profile } = await getSessionProfile();

  if (!user || !profile) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from("task_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: fetchError.message },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "comment not found" },
      { status: 404 },
    );
  }

  const isAuthor = existing.author_id === user.id;
  const isAdmin = profile.role === "admin";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "forbidden" },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("task_comments").delete().eq("id", commentId);

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id: commentId }, error: null });
}
