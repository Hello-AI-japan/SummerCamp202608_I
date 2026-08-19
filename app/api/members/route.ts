import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import type { ApiResponse, Profile } from "@/types/task";

export async function GET() {
  const { supabase, user } = await getSessionProfile();

  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .order("display_name", { ascending: true });

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiResponse<Profile[]>>({ data, error: null });
}
