import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { attachAssignees } from "@/lib/tasks/withAssignees";
import { Header } from "@/components/layout/Header";
import { Board } from "@/components/board/Board";
import type { Profile, Task } from "@/types/task";

export default async function BoardPage() {
  const { supabase, user, profile } = await getSessionProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, display_name, role, created_at").order("display_name"),
  ]);

  const memberList = (members ?? []) as Profile[];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header displayName={profile.display_name} role={profile.role} />
      <Board
        initialTasks={attachAssignees((tasks ?? []) as Task[], memberList)}
        members={memberList}
        currentUser={{ id: user.id, role: profile.role }}
      />
    </div>
  );
}
