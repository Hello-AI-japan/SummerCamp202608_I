"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/types/task";

export function Header({
  displayName,
  role,
}: {
  displayName: string;
  role: Role;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-lg font-bold text-gray-900">HelloBoard</h1>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>
          {displayName}
          <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
            {role === "admin" ? "admin" : "member"}
          </span>
        </span>
        <button
          onClick={handleSignOut}
          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          サインアウト
        </button>
      </div>
    </header>
  );
}
