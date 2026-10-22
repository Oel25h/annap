import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useT } from "@/lib/i18n/context";
import { startCheckout } from "@/lib/payments.functions";
import { Icon } from "./Icon";

/**
 * Buy here: straight to Stripe Checkout, returning to this page if the reader
 * backs out. Primary by default; quiet inside a book's format rows, where
 * the Tangerine fill belongs to another action.
 */
export function CheckoutButton({
  kind,
  id,
  label,
  variant = "primary",
  small = false,
  icon,
}: {
  kind: "book_format" | "product";
  id: string;
  label: ReactNode;
  variant?: "primary" | "quiet";
  small?: boolean;
  icon?: "arrow-right";
}) {
  const t = useT();
  const locale = useLocale();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [state, setState] = useState<"idle" | "sending" | "error" | "offline">("idle");
  const sending = state === "sending";

  // Back from Stripe through the back/forward cache: the button is ready again.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => event.persisted && setState("idle");
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const start = async () => {
    if (sending) return;
    if (!navigator.onLine) return setState("offline");
    setState("sending");
    try {
      const result = await startCheckout({
        data: {
          kind,
          id,
          locale,
          returnPath: pathname.replace(/^\/el(?=\/|$)/, "") || "/",
        },
      });
      if (result.ok) window.location.assign(result.url);
      else setState("error");
    } catch {
      setState(navigator.onLine ? "error" : "offline");
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn btn-${variant}${small ? " btn-sm" : ""}`}
        disabled={sending}
        aria-busy={sending || undefined}
        onClick={start}
      >
        <span>{sending ? t.sections.books.checkout : label}</span>
        {icon && <Icon name={icon} />}
      </button>
      {(state === "error" || state === "offline") && (
        <p className="field-error" role="alert">
          <Icon name="alert" />
          <span>{state === "offline" ? t.sections.books.offline : t.sections.forms.error}</span>
        </p>
      )}
    </>
  );
}
