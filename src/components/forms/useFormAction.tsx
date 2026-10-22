/**
 * Shared behaviour for public forms: sending state, error messages, the
 * honeypot and Cloudflare Turnstile.
 *
 * Turnstile runs only when its keys are set in the studio, and its script
 * loads on the first focus inside a form, so pages carry no third-party code
 * until someone starts filling one in.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { useT } from "@/lib/i18n/context";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

const root = getRouteApi("__root__");

function useTurnstile() {
  const siteKey = root.useLoaderData({ select: (shell) => shell.turnstileSiteKey });
  const slot = useRef<HTMLDivElement | null>(null);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef<((value: string | null) => void)[]>([]);

  const settle = (value: string | null) => {
    token.current = value;
    for (const resolve of waiting.current.splice(0)) resolve(value);
  };

  const activate = useCallback(() => {
    if (!siteKey || widget.current || !slot.current) return;
    widget.current = "loading";
    loadTurnstile()
      .then((api) => {
        if (!slot.current) return;
        widget.current = api.render(slot.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          callback: (value: string) => settle(value),
          "expired-callback": () => (token.current = null),
          "error-callback": () => settle(null),
        });
      })
      .catch(() => {
        widget.current = null;
        settle(null);
      });
  }, [siteKey]);

  /** The current token, waiting up to 15 seconds for one. */
  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!siteKey) return undefined;
    activate();
    if (token.current) return token.current;
    const value = await new Promise<string | null>((resolve) => {
      waiting.current.push(resolve);
      setTimeout(() => resolve(null), 15_000);
    });
    return value ?? undefined;
  }, [siteKey, activate]);

  const reset = useCallback(() => {
    token.current = null;
    if (widget.current && widget.current !== "loading") window.turnstile?.reset(widget.current);
  }, []);

  return { enabled: !!siteKey, slot, activate, getToken, reset };
}

export type FormState<R> =
  { step: "idle" | "sending" } | { step: "done"; result: R } | { step: "error"; message: string };

/**
 * Wires a form to a server function. `send` gets the form's fields and the
 * Turnstile token; the honeypot field is named "website".
 */
export function useFormAction<T extends { ok: true } | { ok: false; error: string }>(
  send: (fields: FormData, turnstile: string | undefined) => Promise<T>,
  extraMessages: Record<string, string> = {},
) {
  const t = useT();
  const turnstile = useTurnstile();
  const [state, setState] = useState<FormState<Extract<T, { ok: true }>>>({ step: "idle" });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.step === "sending") return;
    const form = event.currentTarget;
    setState({ step: "sending" });
    try {
      const token = await turnstile.getToken();
      const result = await send(new FormData(form), token);
      if (result.ok) {
        setState({ step: "done", result: result as Extract<T, { ok: true }> });
      } else {
        const messages: Record<string, string> = {
          invalid: t.sections.forms.invalid,
          busy: t.sections.forms.busy,
          verify: t.sections.forms.verify,
          ...extraMessages,
        };
        const code = (result as { error: string }).error;
        setState({ step: "error", message: messages[code] ?? t.sections.forms.error });
      }
    } catch {
      setState({ step: "error", message: t.sections.forms.error });
    } finally {
      turnstile.reset();
    }
  };

  return {
    state,
    sending: state.step === "sending",
    onSubmit,
    /** Spread on the form: loads Turnstile on first focus. */
    formProps: { onSubmit, onFocusCapture: turnstile.activate },
    /** Place inside the form; empty unless Turnstile is configured. */
    turnstileSlot: turnstile.enabled ? <div ref={turnstile.slot} className="turnstile" /> : null,
  };
}

/** The hidden field bots fill and people never see. */
export function Honeypot() {
  return (
    <input className="sr-only" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
  );
}

export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}
