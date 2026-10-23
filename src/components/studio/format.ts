/**
 * Words for the studio's states: save lines, errors, sizes, durations and
 * dates. Plain functions, the same on every machine.
 */
import type { MediaRow } from "@/lib/media-upload";

/** "Saved just now" / "Saved 2 min ago", ticking quietly. */
export function savedWords(at: number | null, now: number): string {
  if (!at) return "";
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "Saved just now";
  if (minutes < 60) return `Saved ${minutes} min ago`;
  return "Saved";
}

/** Errors from Supabase or a server function, in words. */
export function errorText(e: unknown, fallback = "Something went wrong. Try again."): string {
  if (e instanceof Error && e.message) {
    if (/studio:signed_out|JWT|jwt/.test(e.message))
      return "You've been signed out. Sign in again.";
    if (/studio:needs_2fa/.test(e.message)) return "Enter your six-digit code to continue.";
    if (/duplicate key/.test(e.message)) return "Another item already uses that web address.";
    return e.message;
  }
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string")
    return errorText(new Error(e.message), fallback);
  return fallback;
}

/** Format bytes as "1.2 MB". */
export function fileSize(bytes: number | null | undefined): string {
  const b = Number(bytes ?? 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/** Seconds as "4:05" or "1:02:09". */
export function clock(seconds: number | string | null | undefined): string {
  const s = Math.round(Number(seconds ?? 0));
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

/** A date as "23 Oct 2026", the same on every machine (UTC). */
export function day(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function mediaName(row: Pick<MediaRow, "alt" | "original_name" | "id">): string {
  return row.alt?.trim() || row.original_name || "Untitled file";
}

export function mediaMeta(row: MediaRow): string {
  const parts: string[] = [];
  if (row.kind === "image" && row.width && row.height) parts.push(`${row.width} × ${row.height}`);
  if (row.duration_seconds) parts.push(clock(row.duration_seconds));
  parts.push(fileSize(row.bytes));
  return parts.join(" · ");
}
