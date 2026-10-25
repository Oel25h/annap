import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/site/Icon";
import { supabase } from "@/integrations/supabase/client";
import { createFirstAdmin, hasAnyAdmin } from "@/lib/admin.functions";
import studioCss from "@/styles/studio.css?url";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to the studio — Anastasia Patience" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "stylesheet", href: studioCss }],
  }),
  component: AuthPage,
});

/** The studio's sign-in: email and password. */
type Step = { kind: "loading" } | { kind: "signin" } | { kind: "bootstrap" } | { kind: "denied" };

async function nextStep(): Promise<Step | "done"> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return { kind: "signin" };
  const { data: allowed } = await supabase.rpc("is_admin");
  return allowed === true ? "done" : { kind: "denied" };
}

function AuthPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errorId = useId();

  async function advance() {
    const next = await nextStep();
    if (next === "done") nav({ to: "/admin" });
    else setStep(next);
  }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) return await advance();
        const res = await hasAnyAdmin();
        setStep({ kind: res.exists ? "signin" : "bootstrap" });
      } catch {
        setStep({ kind: "signin" });
      }
    })();
    // advance only reads state setters and the navigator
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(work: () => Promise<void>) {
    setErr(null);
    setBusy(true);
    try {
      await work();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onPassword(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      if (step.kind === "bootstrap") {
        await createFirstAdmin({ data: { email, password, setupSecret } });
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await advance();
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setStep({ kind: "signin" });
  }

  const describedBy = err ? errorId : undefined;
  const alert = err && (
    <p className="form-alert" id={errorId} role="alert">
      <Icon name="alert" />
      <span>{err}</span>
    </p>
  );

  return (
    <main className="studio-app studio-auth" id="main">
      <div className="studio-auth-card">
        <p className="wordmark">Anastasia Patience</p>
        {step.kind === "loading" && <p className="meta">Checking your sign-in…</p>}

        {(step.kind === "signin" || step.kind === "bootstrap") && (
          <>
            <h1 className="title">
              {step.kind === "bootstrap" ? "Create the studio account" : "Sign in to the studio"}
            </h1>
            {step.kind === "bootstrap" && (
              <p className="small">
                No admin exists yet. Create the one admin account with the setup secret from the
                hosting settings. Nobody else can sign up.
              </p>
            )}
            <form className="form" onSubmit={onPassword}>
              <div className="field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  aria-describedby={describedBy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  aria-describedby={describedBy}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {step.kind === "bootstrap" && (
                <div className="field">
                  <label htmlFor="auth-secret">Setup secret</label>
                  <input
                    id="auth-secret"
                    type="password"
                    autoComplete="off"
                    required
                    value={setupSecret}
                    onChange={(e) => setSetupSecret(e.target.value)}
                  />
                </div>
              )}
              {alert}
              <button className="btn btn-primary btn-block" type="submit" aria-busy={busy}>
                {step.kind === "bootstrap" ? "Create and sign in" : "Sign in"}
              </button>
            </form>
          </>
        )}

        {step.kind === "denied" && (
          <>
            <h1 className="title">This account can't open the studio</h1>
            <p className="small">It is signed in, but it is not an admin of this site.</p>
            <button className="btn btn-quiet btn-block" type="button" onClick={signOut}>
              Sign out
            </button>
          </>
        )}
      </div>
    </main>
  );
}
