import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useLocale, useT } from "@/lib/i18n/context";
import { startCheckout } from "@/lib/payments.functions";
import { Icon } from "./Icon";

/** Buy here: straight to Stripe Checkout, returning to this page if the reader backs out. */
export function CheckoutButton({
  kind,
  id,
  label,
  small = false,
}: {
  kind: "book_format" | "product";
  id: string;
  label: string;
  small?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  return (
    <>
      <button
        type="button"
        className={`btn btn-primary${small ? " btn-sm" : ""}`}
        aria-disabled={state === "sending" || undefined}
        onClick={async () => {
          if (state === "sending") return;
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
            setState("error");
          }
        }}
      >
        {state === "sending" ? t.sections.forms.sending : label}
      </button>
      {state === "error" && (
        <span className="field-error" role="status">
          <Icon name="alert" />
          {t.sections.forms.error}
        </span>
      )}
    </>
  );
}
