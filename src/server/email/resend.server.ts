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
