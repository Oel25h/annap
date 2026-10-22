import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createFirstAdmin, hasAnyAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Anastasia Patience" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "bootstrap" | "loading">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        nav({ to: "/admin" });
        return;
      }
      try {
        const res = await hasAnyAdmin();
        setMode(res.exists ? "signin" : "bootstrap");
      } catch {
        setMode("signin");
      }
    })();
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "bootstrap") {
        await createFirstAdmin({ data: { email, password, setupSecret } });
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      nav({ to: "/admin" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ivory px-6 pt-[max(8rem,calc(env(safe-area-inset-top)+6rem))] pb-[max(5rem,env(safe-area-inset-bottom))]">
      <div className="relative mx-auto max-w-md rounded-[2.5rem] bg-bone/70 p-8 soft-shadow-lg md:p-10">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/80 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy">
          <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />
          {mode === "bootstrap" ? "First-time setup" : "Private area"}
        </div>
        <h1 className="mt-5 font-display text-4xl leading-tight text-plum">
          {mode === "bootstrap" ? "Create your admin account" : "Sign in"}
        </h1>
        {mode === "bootstrap" && (
          <p className="mt-3 text-sm text-ink">
            No admin exists yet. Create your single admin account below. You need the setup secret
            from your hosting environment. Signup is disabled for everyone else.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.24em] text-plum/60">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-12 w-full rounded-full border border-plum/15 bg-ivory px-5 text-plum placeholder:text-plum/40 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.24em] text-plum/60">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-12 w-full rounded-full border border-plum/15 bg-ivory px-5 text-plum placeholder:text-plum/40 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20"
            />
          </label>
          {mode === "bootstrap" && (
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.24em] text-plum/60">
                Setup secret
              </span>
              <input
                type="password"
                required
                value={setupSecret}
                onChange={(e) => setSetupSecret(e.target.value)}
                autoComplete="off"
                className="mt-2 h-12 w-full rounded-full border border-plum/15 bg-ivory px-5 text-plum placeholder:text-plum/40 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20"
              />
            </label>
          )}
          {err && (
            <div className="rounded-2xl border border-burgundy/40 bg-burgundy/10 p-3 text-sm text-burgundy">
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || mode === "loading"}
            className="mt-2 w-full rounded-full bg-burgundy px-6 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory shadow-[0_14px_30px_-14px_rgba(232,93,58,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-plum disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "bootstrap" ? "Create admin & sign in" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
