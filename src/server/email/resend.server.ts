/**
 * Sends one email through Resend's REST API. The outbox id is the
 * idempotency key, so a retry after a timeout never sends twice. Errors keep
 * Resend's reason but never an address.
 */
import { apiBase } from "../api-base.server";

export type Outgoing = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
  idempotencyKey: string;
};

export class SendError extends Error {
  constructor(
    message: string,
    /** Whether trying again later could help (rate limits, outages, timeouts). */
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const ADDRESS = /[^\s@<>"']+@[^\s@<>"']+/g;

/** An error message safe to store: no addresses, one line, short. */
export function scrubError(message: string): string {
  return message.replace(ADDRESS, "[address]").replace(/\s+/g, " ").slice(0, 300);
}

export async function sendWithResend(apiKey: string, email: Outgoing): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${apiBase("RESEND_API_BASE", "https://api.resend.com")}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: JSON.stringify({
        from: email.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new SendError(scrubError(`Network: ${(error as Error).message}`), true);
  }
  const json = (await response.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    message?: string;
  };
  if (response.ok && json.id) return json.id;
  const reason = scrubError(`${response.status} ${json.name ?? ""} ${json.message ?? ""}`.trim());
  // 429 and 5xx pass; a key, sender or domain problem may be fixed in the studio, so
  // those are retried too, with backoff, until the attempts run out.
  const message = json.message ?? "";
  const permanent =
    response.status === 422 &&
    /`to`|recipient/i.test(message) &&
    !/`from`|sender|domain/i.test(message);
  throw new SendError(reason, !permanent);
}

export type BatchResult = { id: string } | { error: string; retryable: boolean };

/**
 * Sends up to 100 emails in one request (Resend's batch endpoint), checked
 * one by one: an address Resend refuses fails alone, the rest go out. The
 * key covers the whole batch, so a retried request never sends twice.
 */
export async function sendBatchWithResend(
  apiKey: string,
  emails: Outgoing[],
  idempotencyKey: string,
): Promise<BatchResult[]> {
  if (emails.length === 0) return [];
  if (emails.length > 100) throw new SendError("A batch holds at most 100 emails", false);
  let response: Response;
  try {
    response = await fetch(`${apiBase("RESEND_API_BASE", "https://api.resend.com")}/emails/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        "x-batch-validation": "permissive",
      },
      body: JSON.stringify(
        emails.map((email) => ({
          from: email.from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
          ...(email.headers ? { headers: email.headers } : {}),
        })),
      ),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new SendError(scrubError(`Network: ${(error as Error).message}`), true);
  }
  const json = (await response.json().catch(() => ({}))) as {
    data?: { id?: string }[];
    errors?: { index?: number; message?: string }[];
    name?: string;
    message?: string;
  };
  if (!response.ok || !Array.isArray(json.data)) {
    const reason = scrubError(`${response.status} ${json.name ?? ""} ${json.message ?? ""}`.trim());
    throw new SendError(reason, true);
  }
  // Permissive mode: `data` holds the ids of the emails that were accepted, in
  // order; `errors` names the refused ones by their index in the request.
  const refused = new Map<number, string>();
  for (const e of json.errors ?? []) {
    if (typeof e.index === "number") refused.set(e.index, scrubError(e.message ?? "Refused"));
  }
  const ids = json.data.map((d) => d.id ?? "");
  let next = 0;
  return emails.map((_email, index) => {
    const reason = refused.get(index);
    if (reason !== undefined) return { error: reason, retryable: false };
    const id = ids[next++];
    return id ? { id } : { error: "No id returned", retryable: true };
  });
}
