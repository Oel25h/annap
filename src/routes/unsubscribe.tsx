import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { localeFromSearch } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/unsubscribe")({
  component: Unsubscribe,
  head: ({ match }) => {
    const locale = localeFromSearch(match.search);
    return seoHead({
      locale,
      path: "/unsubscribe",
      ...getMessages(locale).seo.unsubscribe,
      noindex: true,
    });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
});

function Unsubscribe() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"loading" | "done" | "invalid" | "already">("loading");

  useEffect(() => {
    (async () => {
      if (!token) return setState("invalid");
      try {
        const res = await fetch("/api/public/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = (await res.json()) as { ok: boolean; already?: boolean };
        if (!body.ok) return setState("invalid");
        setState(body.already ? "already" : "done");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  return (
    <main className="grid min-h-screen place-items-center bg-ivory px-6 py-24">
      <div className="w-full max-w-lg rounded-[2rem] border border-plum/10 bg-bone/60 p-10 text-center soft-shadow">
        <div className="text-[10px] uppercase tracking-[0.32em] text-burgundy">Newsletter</div>
        <h1 className="mt-3 font-display text-4xl text-plum">
          {state === "loading" && "Just a moment…"}
          {state === "done" && "You've been unsubscribed"}
          {state === "already" && "You're already unsubscribed"}
          {state === "invalid" && "This link is invalid"}
        </h1>
        <p className="mt-4 text-sm text-ink">
          {state === "done" &&
            "You won't receive any more emails from us. We're grateful you spent time with us."}
          {state === "already" && "No further action needed — you're removed from our list."}
          {state === "invalid" &&
            "The unsubscribe link may have expired or been mistyped. If you meant to unsubscribe, reply to any email and we'll take care of it."}
          {state === "loading" && "Processing your request."}
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-burgundy px-6 py-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ivory hover:bg-terracotta"
        >
          Return to site
        </a>
      </div>
    </main>
  );
}
