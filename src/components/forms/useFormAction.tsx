/**
 * Shared behaviour for public forms: sending state, error messages, the
 * honeypot and Cloudflare Turnstile, plus the one pattern every form follows
 * (DESIGN.md §9 Free eBook form and Form fields):
 *
 * - Fields are checked on submit, then again as each one loses focus. Focus
 *   moves to the first invalid field; whatever was typed stays.
 * - Sending changes the button's label and sets `aria-busy`; the fields keep
 *   their values.
 * - Success replaces the form in place and focuses its heading (`doneRef`);
 *   the text is mirrored into a `role="status"` region.
 * - A server error or being offline shows one inline message above the
 *   button, which stays ready: pressing it again sends again. Offline, the
 *   form also sends itself once the connection is back.
 *
 * Turnstile runs only when its keys are set in the studio, and its script
 * loads on the first focus inside a form, so pages carry no third-party code
 * until someone starts filling one in.
 */
import { getRouteApi } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
} from "react";
import { Icon } from "@/components/site/Icon";
import { useLocale, useT } from "@/lib/i18n/context";

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

/** The theme the page shows: the reader's choice, else the system's. */
function pageTheme(): "light" | "dark" {
  const html = document.documentElement.classList;
  if (html.contains("dark")) return "dark";
  if (html.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useTurnstile() {
  const siteKey = root.useLoaderData({ select: (shell) => shell.turnstileSiteKey });
  const locale = useLocale();
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
          // In the page's language and theme; compact where 300px won't fit.
          language: locale,
          theme: pageTheme(),
          size: window.matchMedia("(max-width: 359px)").matches ? "compact" : "flexible",
          callback: (value: string) => settle(value),
          "expired-callback": () => (token.current = null),
          "error-callback": () => settle(null),
        });
      })
      .catch(() => {
        widget.current = null;
        settle(null);
      });
  }, [siteKey, locale]);

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
  | { step: "idle" | "sending" }
  | { step: "done"; result: R }
  | { step: "error"; message: string; offline?: boolean };

/** A client check: the message to show when the value is wrong, or nothing when it is fine. */
export type FieldCheck = (value: string, fields: FormData) => string | null | undefined | false;

export type FormOptions = {
  /** Checks by field name, run on submit and then on blur. A failing check stops the send. */
  checks?: Record<string, FieldCheck>;
  /**
   * After an offline failure, send again by itself once the connection is
   * back (default). Off for forms that leave the page, such as giving.
   */
  retryOnReconnect?: boolean;
};

const offlineNow = () => typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * Wires a form to a server function. `send` gets the form's fields and the
 * Turnstile token; the honeypot field is named "website". `extraMessages`
 * maps the server's error codes to what the reader sees.
 */
export function useFormAction<T extends { ok: true } | { ok: false; error: string }>(
  send: (fields: FormData, turnstile: string | undefined) => Promise<T>,
  extraMessages: Record<string, string> = {},
  options: FormOptions = {},
) {
  const t = useT();
  const id = useId();
  const turnstile = useTurnstile();
  const [state, setState] = useState<FormState<Extract<T, { ok: true }>>>({ step: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Fields are checked on blur only after the first submit. */
  const submitted = useRef(false);
  /** The submit button, when sending took focus from it (a disabled button can't keep it). */
  const refocus = useRef<HTMLElement | null>(null);
  /** The form last submitted, for the retry on reconnect. */
  const lastForm = useRef<HTMLFormElement | null>(null);
  /**
   * Set as a send starts, before any re-render: a second submit in the same
   * moment (a double press, or two retries on reconnect) never sends twice.
   */
  const inFlight = useRef(false);
  const retryOnReconnect = options.retryOnReconnect ?? true;
  /** The success heading: focused when the form is replaced. */
  const done = useRef<HTMLElement | null>(null);
  const doneRef = useCallback((node: HTMLElement | null) => {
    done.current = node;
  }, []);

  useEffect(() => {
    if (state.step === "done") done.current?.focus();
    if (state.step === "error" && refocus.current) {
      const active = document.activeElement;
      if (!active || active === document.body) refocus.current.focus();
    }
    if (state.step !== "sending") refocus.current = null;
  }, [state]);

  // Offline: the button stays ready, and the form also sends itself once the connection is back.
  useEffect(() => {
    if (state.step !== "error" || !state.offline || !retryOnReconnect) return;
    const retry = () => {
      if (lastForm.current?.isConnected) lastForm.current.requestSubmit();
    };
    window.addEventListener("online", retry, { once: true });
    return () => window.removeEventListener("online", retry);
  }, [state, retryOnReconnect]);

  /**
   * Runs the checks, shows their messages and returns the names that failed.
   * With `only`, checks one field; `clearOnly` lets it lose a message but not gain one.
   */
  const validate = (form: HTMLFormElement, only?: string, clearOnly = false) => {
    const all = options.checks;
    if (!all) return [];
    const data = new FormData(form);
    const found: Record<string, string> = {};
    for (const [name, check] of Object.entries(all)) {
      if (only && name !== only) continue;
      const message = check(field(data, name), data);
      if (message) found[name] = message;
    }
    setErrors((current) => {
      if (!only) return found;
      const next = { ...current };
      if (found[only] && !clearOnly) next[only] = found[only];
      else if (!found[only]) delete next[only];
      return next;
    });
    return Object.keys(found);
  };

  /** Focus the first of these fields in the form's own order. */
  const focusFirst = (form: HTMLFormElement, names: string[]) => {
    const first = Array.from(form.elements).find(
      (element): element is HTMLElement =>
        names.includes((element as HTMLInputElement).name) && element instanceof HTMLElement,
    );
    first?.focus();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || state.step === "sending") return;
    const form = event.currentTarget;
    lastForm.current = form;
    submitted.current = true;
    const invalid = validate(form);
    if (invalid.length > 0) {
      setState({ step: "idle" });
      focusFirst(form, invalid);
      return;
    }
    // A retry on reconnect has no submitter: fall back to the form's own button.
    const submitter =
      (event.nativeEvent as SubmitEvent).submitter ??
      form.querySelector<HTMLElement>("[type=submit]");
    if (submitter && submitter === document.activeElement) refocus.current = submitter;
    inFlight.current = true;
    setState({ step: "sending" });
    const messages: Record<string, string> = {
      invalid: t.sections.forms.invalid,
      busy: t.sections.forms.busy,
      verify: t.sections.forms.verify,
      offline: t.sections.forms.offline,
      server: t.sections.forms.server,
      ...extraMessages,
    };
    try {
      // Offline, Turnstile can't answer: send at once and let the request fail.
      const token = offlineNow() ? undefined : await turnstile.getToken();
      const result = await send(new FormData(form), token);
      if (result.ok) {
        setState({ step: "done", result: result as Extract<T, { ok: true }> });
        return;
      }
      const code = (result as { error: string }).error;
      // The server's own check: point at the fields when the client can say which.
      const fields = code === "invalid" ? validate(form) : [];
      if (fields.length > 0) {
        refocus.current = null;
        setState({ step: "idle" });
        focusFirst(form, fields);
        return;
      }
      setState({
        step: "error",
        message: messages[code] ?? t.sections.forms.server,
        offline: code === "offline" || undefined,
      });
    } catch {
      const offline = offlineNow();
      setState({
        step: "error",
        message: offline ? t.sections.forms.offline : t.sections.forms.server,
        offline: offline || undefined,
      });
    } finally {
      inFlight.current = false;
      turnstile.reset();
    }
  };

  const errorId = (name: string) => `${id}-${name}-error`;
  const alertId = `${id}-alert`;
  const alert = state.step === "error" ? state.message : null;
  const sending = state.step === "sending";

  return {
    state,
    sending,
    onSubmit,
    /** Spread on the form: loads Turnstile on first focus. */
    formProps: { onSubmit, onFocusCapture: turnstile.activate },
    /** Place inside the form; empty unless Turnstile is configured. */
    turnstileSlot: turnstile.enabled ? <div ref={turnstile.slot} className="turnstile" /> : null,

    /** Field messages from the checks, by field name. */
    errors,
    errorId,
    /**
     * Spread on an input, select or textarea: its name, `aria-invalid`, and
     * `aria-describedby` with the given hint ids plus its message while shown.
     * Checks it again on blur once the form has been submitted, and clears its
     * message while typing once the value is right.
     */
    fieldProps: (name: string, ...hints: (string | undefined)[]) => ({
      name,
      "aria-invalid": errors[name] ? (true as const) : undefined,
      "aria-describedby":
        [...hints, errors[name] && errorId(name)].filter(Boolean).join(" ") || undefined,
      onBlur: (event: FocusEvent<HTMLElement & { form: HTMLFormElement | null }>) => {
        const form = event.currentTarget.form;
        if (submitted.current && form) validate(form, name);
      },
      // A message goes as soon as the value is right, so fixing a field never
      // moves the button under the pointer when focus leaves it.
      onInput: (event: FormEvent<HTMLElement & { form: HTMLFormElement | null }>) => {
        const form = event.currentTarget.form;
        if (errors[name] && form) validate(form, name, true);
      },
    }),
    /** The field's message slot, right under it. */
    fieldError: (name: string) => <FieldError id={errorId(name)} message={errors[name]} />,
    /** The form-wide message (server error, offline, busy, verify), above the button. */
    alert,
    alertId,
    alertSlot: alert ? <FormAlert id={alertId} message={alert} /> : null,
    /** Spread on the submit button: disabled and `aria-busy` while sending. */
    submitProps: {
      type: "submit" as const,
      disabled: sending,
      "aria-busy": sending || undefined,
      "aria-describedby": alert ? alertId : undefined,
    },
    /** Attach to the success heading (`tabIndex={-1}`): it takes focus when the form is done. */
    doneRef,
    /** A polite live region that mirrors success and the form-wide message. Keep it outside the part that is replaced. */
    statusSlot: (doneText: string) => (
      <p className="sr-only" role="status">
        {state.step === "done" ? doneText : (alert ?? "")}
      </p>
    ),
  };
}

/** A field's message: Berry with the alert icon; hidden until there is one. */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  return (
    <p id={id} className="field-error" hidden={!message}>
      <Icon name="alert" />
      <span>{message}</span>
    </p>
  );
}

/** The one message for the whole form, above its button. */
export function FormAlert({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="form-alert">
      <Icon name="alert" />
      <span>{message}</span>
    </p>
  );
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

/** The usual email check: something@something.something. */
export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
