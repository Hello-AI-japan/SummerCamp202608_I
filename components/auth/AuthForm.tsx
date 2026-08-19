"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const supabase = createClient();

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName || email.split("@")[0] } },
          });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.refresh();
    router.push("/");
  }

  return (
    <div>
      <div className="mb-6 flex rounded-md border border-gray-200 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded py-1.5 text-sm font-medium transition ${
            mode === "login" ? "bg-gray-900 text-white" : "text-gray-500"
          }`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded py-1.5 text-sm font-medium transition ${
            mode === "signup" ? "bg-gray-900 text-white" : "text-gray-500"
          }`}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="山田太郎"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">パスワード</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
        </button>
      </form>
    </div>
  );
}
