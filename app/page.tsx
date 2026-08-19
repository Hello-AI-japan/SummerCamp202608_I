import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { Header } from "@/components/layout/Header";
import { Board } from "@/components/board/Board";
import type { Profile, TaskWithAssignee } from "@/types/task";

export default async function BoardPage() {
  const { supabase, user, profile } = await getSessionProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(id, display_name)")
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, display_name, role, created_at").order("display_name"),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header displayName={profile.display_name} role={profile.role} />
      <Board
        initialTasks={(tasks ?? []) as unknown as TaskWithAssignee[]}
        members={(members ?? []) as Profile[]}
        currentUser={{ id: user.id, role: profile.role }}
      />
    </div>
  );
}
