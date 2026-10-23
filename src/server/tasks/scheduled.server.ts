/**
 * The site's scheduled work. Netlify Scheduled Functions (netlify/functions)
 * run these on their timetable; each returns a small summary for the logs.
 *
 * - outbox:drain, every 5 minutes: send the emails waiting in the outbox.
 * - purge:expired, daily at 03:17 UTC: delete what the privacy policy keeps only for a while.
 * - youtube:sync, hourly: bring in the channel's newest videos, hide the ones gone from YouTube.
 */

export type ScheduledTask = "outbox:drain" | "purge:expired" | "youtube:sync";

async function outboxDrain() {
  const { drainOutbox } = await import("../email/drain.server");
  const result = await drainOutbox();
  if (result.status === "done" && result.sent + result.retrying + result.failed > 0) {
    console.log(
      `[outbox] sent ${result.sent}, retrying ${result.retrying}, failed ${result.failed}`,
    );
  }
  return result;
}

async function purgeExpired() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("purge_expired");
  if (error) throw new Error(`Purge: ${error.message}`);
  return data;
}

async function youtubeSync() {
  const { syncYouTube } = await import("../youtube-sync.server");
  const result = await syncYouTube("cron");
  if (result.problem !== "not_connected") {
    console.log(`[youtube] ${result.ok ? "synced" : "not synced"}: ${result.message}`);
  }
  return result;
}

const TASKS: Record<ScheduledTask, () => Promise<unknown>> = {
  "outbox:drain": outboxDrain,
  "purge:expired": purgeExpired,
  "youtube:sync": youtubeSync,
};

/** Runs one task. A failure is logged and rethrown, so the function's run shows as failed. */
export async function runScheduledTask(name: ScheduledTask): Promise<unknown> {
  try {
    return await TASKS[name]();
  } catch (error) {
    console.error(`[${name}]`, error);
    throw error;
  }
}
