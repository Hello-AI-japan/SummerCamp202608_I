import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/task";

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null as Profile | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .eq("id", user.id)
    .single<Profile>();

  return { supabase, user, profile };
}
