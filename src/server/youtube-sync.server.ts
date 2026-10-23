/**
 * The YouTube sync, run hourly by the cron and on demand from the studio's
 * keys screen. It reads the channel's newest uploads with the studio's API
 * key, adds or updates them in `videos` (title, description, length, date)
 * and saves each new thumbnail to the media library. A video YouTube no
 * longer shows is hidden, never deleted. After a quota error the cron waits
 * for the daily reset. The key goes in a header, never a URL, and is never
 * logged; the outcome is kept on the integration row for the studio.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { apiBase, isLocalSite } from "./api-base.server";
import { readIntegration } from "./secrets.server";
import {
  nextQuotaReset,
  parseApiError,
  parsePlaylistItems,
  parseVideos,
  planSync,
  uploadsPlaylistId,
  type YouTubeProblem,
  type YouTubeVideo,
} from "./youtube-parse.server";

/** How many of the newest uploads each run reads (one page). */
const LATEST = 50;
const MAX_THUMBNAIL_BYTES = 4 * 1024 * 1024;

export type SyncOutcome = {
  ok: boolean;
  at: string;
  /** Who started it: the hourly cron or the studio's button. */
  trigger: "cron" | "manual";
  added: number;
  updated: number;
  hidden: number;
  message: string;
  problem?: YouTubeProblem | "not_connected" | "no_channel";
};

class YouTubeError extends Error {
  constructor(
    message: string,
    readonly problem: YouTubeProblem,
  ) {
    super(message);
  }
}

async function youtube(path: string, params: Record<string, string>, key: string) {
  const base = apiBase("YOUTUBE_API_BASE", "https://www.googleapis.com/youtube/v3");
  const url = `${base}${path}?${new URLSearchParams(params)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "X-Goog-Api-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new YouTubeError("YouTube couldn't be reached. The sync tries again next hour.", "other");
  }
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const { problem, message } = parseApiError(response.status, json);
    throw new YouTubeError(message, problem);
  }
  return json;
}

/** Details for up to 50 ids per call (1 quota unit each). */
async function videoDetails(ids: string[], key: string): Promise<YouTubeVideo[]> {
  const out: YouTubeVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const json = await youtube(
      "/videos",
      { part: "snippet,contentDetails,status", id: chunk.join(","), maxResults: "50" },
      key,
    );
    out.push(...parseVideos(json));
  }
  return out;
}

/** Thumbnails come only from YouTube's image hosts (or a local stand-in in tests). */
function trustedImage(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol === "https:" && /(^|\.)ytimg\.com$/.test(hostname)) return true;
    return isLocalSite() && (hostname === "127.0.0.1" || hostname === "localhost");
  } catch {
    return false;
  }
}

/** Saves a video's thumbnail to the media library; null if it can't be fetched. */
async function saveThumbnail(video: YouTubeVideo): Promise<string | null> {
  const thumb = video.thumbnail;
  if (!thumb || !trustedImage(thumb.url)) return null;
  try {
    const response = await fetch(thumb.url, { signal: AbortSignal.timeout(15_000) });
    const mime = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!response.ok || !/^image\/(jpeg|png|webp)$/.test(mime)) return null;
    const body = await response.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_THUMBNAIL_BYTES) return null;

    const extension = mime === "image/jpeg" ? "jpg" : mime.slice(6);
    const path = `youtube/${video.youtubeId}/original.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("media")
      .upload(path, body, { contentType: mime, upsert: true, cacheControl: "31536000" });
    if (uploadError) throw new Error(uploadError.message);

    const { data, error } = await supabaseAdmin
      .from("media_assets")
      .upsert(
        {
          kind: "image",
          bucket: "media",
          path,
          original_name: `${video.youtubeId}.${extension}`,
          mime,
          bytes: body.byteLength,
          width: thumb.width,
          height: thumb.height,
          variants: thumb.width
            ? [{ w: thumb.width, path, bytes: body.byteLength }]
            : ([] as Json[]),
          alt: video.title.slice(0, 300),
          caption: "",
          status: "ready",
        },
        { onConflict: "bucket,path" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  } catch (failure) {
    console.warn(
      "[youtube] thumbnail not saved:",
      failure instanceof Error ? failure.message : "unknown",
    );
    return null;
  }
}

async function record(outcome: SyncOutcome, extra: { lockedUntil?: string | null } = {}) {
  const { error } = await supabaseAdmin
    .from("integration_secrets")
    .update({
      checked_at: outcome.at,
      last_result: outcome as unknown as Json,
      last_error: outcome.ok ? null : outcome.message,
      ...(outcome.ok ? { synced_at: outcome.at } : {}),
      ...("lockedUntil" in extra ? { locked_until: extra.lockedUntil } : {}),
    })
    .eq("provider", "youtube");
  if (error) console.error("[youtube] could not record the sync:", error.message);
}

const counts = { added: 0, updated: 0, hidden: 0 };

/**
 * One sync. After a quota error the cron waits for the reset; the studio's
 * button always tries.
 */
export async function syncYouTube(trigger: SyncOutcome["trigger"]): Promise<SyncOutcome> {
  const at = new Date().toISOString();
  const youtubeKeys = await readIntegration("youtube");
  if (!youtubeKeys?.secrets.apiKey) {
    return {
      ok: false,
      at,
      trigger,
      ...counts,
      problem: "not_connected",
      message: "Add the YouTube API key first.",
    };
  }
  const channelId =
    typeof youtubeKeys.config.channel_id === "string" ? youtubeKeys.config.channel_id : "";
  const playlist = uploadsPlaylistId(channelId);
  if (!playlist) {
    const outcome: SyncOutcome = {
      ok: false,
      at,
      trigger,
      ...counts,
      problem: "no_channel",
      message: "Add the channel id (it starts with UC).",
    };
    await record(outcome);
    return outcome;
  }

  if (trigger === "cron") {
    const { data } = await supabaseAdmin
      .from("integration_secrets")
      .select("locked_until")
      .eq("provider", "youtube")
      .maybeSingle();
    if (data?.locked_until && Date.parse(data.locked_until) > Date.now()) {
      return {
        ok: false,
        at,
        trigger,
        ...counts,
        problem: "quota",
        message: "Waiting for YouTube's daily quota to reset.",
      };
    }
  }

  const key = youtubeKeys.secrets.apiKey;
  try {
    const page = parsePlaylistItems(
      await youtube(
        "/playlistItems",
        { part: "contentDetails", playlistId: playlist, maxResults: String(LATEST) },
        key,
      ),
    );
    const latest = await videoDetails(page.ids, key);

    const { data: rows, error } = await supabaseAdmin
      .from("videos")
      .select("youtube_id, gone_at, thumbnail_media_id");
    if (error) throw new Error(`Videos: ${error.message}`);
    const existing = (rows ?? []).map((r) => ({ youtubeId: r.youtube_id, goneAt: r.gone_at }));
    const latestIds = new Set(latest.map((v) => v.youtubeId));
    const others = existing.map((e) => e.youtubeId).filter((id) => !latestIds.has(id));
    const checked = await videoDetails(others, key);
    const plan = planSync(existing, latest, checked);

    const byId = new Map((rows ?? []).map((r) => [r.youtube_id, r]));
    const outcome: SyncOutcome = { ok: true, at, trigger, ...counts, message: "" };
    for (const video of plan.upsert) {
      const row = byId.get(video.youtubeId);
      const fields = {
        title: video.title,
        description: video.description,
        published_at: video.publishedAt,
        duration_seconds: video.durationSeconds,
        synced_at: at,
      };
      if (!row) {
        const thumbnail = await saveThumbnail(video);
        const { error: e } = await supabaseAdmin
          .from("videos")
          .insert({ youtube_id: video.youtubeId, ...fields, thumbnail_media_id: thumbnail });
        if (e && e.code !== "23505") throw new Error(`Videos: ${e.message}`);
        if (!e) outcome.added += 1;
        continue;
      }
      const thumbnail = row.thumbnail_media_id ? null : await saveThumbnail(video);
      // A video the sync hid comes back; one the owner hid stays hidden.
      const back = row.gone_at ? { hidden: false, gone_at: null } : {};
      const { error: e } = await supabaseAdmin
        .from("videos")
        .update({ ...fields, ...back, ...(thumbnail ? { thumbnail_media_id: thumbnail } : {}) })
        .eq("youtube_id", video.youtubeId);
      if (e) throw new Error(`Videos: ${e.message}`);
      outcome.updated += 1;
    }
    if (plan.hide.length) {
      const { error: e } = await supabaseAdmin
        .from("videos")
        .update({ hidden: true, gone_at: at })
        .in("youtube_id", plan.hide)
        .is("gone_at", null);
      if (e) throw new Error(`Videos: ${e.message}`);
      outcome.hidden = plan.hide.length;
    }
    outcome.message = summary(outcome);
    await record(outcome, { lockedUntil: null });
    return outcome;
  } catch (failure) {
    const problem = failure instanceof YouTubeError ? failure.problem : "other";
    const message =
      failure instanceof YouTubeError
        ? failure.message
        : "The sync couldn't save the videos. It tries again next hour.";
    if (!(failure instanceof YouTubeError)) {
      console.error("[youtube] sync failed:", failure instanceof Error ? failure.message : "?");
    }
    const outcome: SyncOutcome = { ok: false, at, trigger, ...counts, problem, message };
    await record(
      outcome,
      problem === "quota" ? { lockedUntil: nextQuotaReset(new Date()).toISOString() } : {},
    );
    return outcome;
  }
}

function summary(o: SyncOutcome): string {
  const parts = [
    o.added ? `${o.added} new` : "",
    o.updated ? `${o.updated} checked` : "",
    o.hidden ? `${o.hidden} hidden (gone from YouTube)` : "",
  ].filter(Boolean);
  return parts.length ? `${parts.join(", ")}.` : "No videos on the channel yet.";
}
