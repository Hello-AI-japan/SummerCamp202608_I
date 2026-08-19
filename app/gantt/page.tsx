import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { attachAssignees } from "@/lib/tasks/withAssignees";
import { Header } from "@/components/layout/Header";
import { GanttChart } from "@/components/gantt/GanttChart";
import { EffortSummary } from "@/components/gantt/EffortSummary";
import type { Profile, Task } from "@/types/task";

export default async function GanttPage() {
  const { supabase, user, profile } = await getSessionProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, display_name, role, created_at").order("display_name"),
  ]);

  const memberList = (members ?? []) as Profile[];
  const taskList = attachAssignees((tasks ?? []) as Task[], memberList);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header displayName={profile.display_name} role={profile.role} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="mb-6 text-lg font-bold text-gray-900">ガントチャート・工数集計</h2>
        <GanttChart tasks={taskList} />
        <EffortSummary tasks={taskList} members={memberList} />
      </main>
    </div>
  );
}
