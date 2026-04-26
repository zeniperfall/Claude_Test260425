"use client";
import { useState } from "react";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

export function AuthButton() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <span className="text-[10px] text-[var(--text-secondary)]" title="Supabase 미설정">
        로컬 모드
      </span>
    );
  }

  const sb = getSupabase();

  async function handleSubmit() {
    if (!sb) return;
    setMsg(null);
    if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else {
        setOpen(false);
        setEmail("");
        setPassword("");
      }
    } else {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else setMsg("가입 완료. 이메일 확인 후 로그인하세요.");
    }
  }

  async function handleLogout() {
    if (!sb) return;
    await sb.auth.signOut();
    setOpen(false);
  }

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-[var(--bg-2)]"
        >
          <UserIcon size={13} />
          <span className="max-w-[120px] truncate">{user.email}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 bg-[var(--bg-2)] border border-[var(--border)] rounded shadow-lg z-50 min-w-[180px]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-3)]"
            >
              <LogOut size={12} />
              로그아웃
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-2)]"
      >
        <LogIn size={13} />
        로그인
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--bg-2)] border border-[var(--border)] rounded shadow-lg z-50 p-3 min-w-[260px] space-y-2">
          <div className="flex gap-1 mb-2">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 px-2 py-1 text-xs rounded",
                  mode === m
                    ? "bg-[var(--bg-3)] text-white"
                    : "text-[var(--text-secondary)]",
                )}
              >
                {m === "signin" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full bg-[var(--bg-1)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="비밀번호"
            className="w-full bg-[var(--bg-1)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none"
          />
          {msg && <div className="text-[10px] text-down">{msg}</div>}
          <button
            onClick={handleSubmit}
            className="w-full bg-[var(--accent)] text-white text-xs py-1 rounded hover:opacity-90"
          >
            {mode === "signin" ? "로그인" : "가입"}
          </button>
        </div>
      )}
    </div>
  );
}
