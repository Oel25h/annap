/**
 * Reading the YouTube Data API's answers: the uploads list, each video's
 * details, and its errors. Pure functions, so tests run them on recorded
 * answers and never call YouTube.
 */

export type Thumbnail = { url: string; width: number | null; height: number | null };

export type YouTubeVideo = {
  youtubeId: string;
  title: string;
  description: string;
  publishedAt: string | null;
  durationSeconds: number | null;
  thumbnail: Thumbnail | null;
  /** Public, processed and not a live or upcoming stream: the site may show it. */
  showable: boolean;
};

export type YouTubeProblem = "quota" | "key" | "disabled" | "channel" | "other";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
/** Largest first: the media library keeps the sharpest one YouTube has. */
const THUMBNAIL_SIZES = ["maxres", "standard", "high", "medium", "default"] as const;

type Json = Record<string, unknown>;
const obj = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** A channel's uploads playlist: its id with UC swapped for UU. */
export function uploadsPlaylistId(channelId: string): string | null {
  return CHANNEL_ID.test(channelId) ? `UU${channelId.slice(2)}` : null;
}

/** ISO 8601 durations as YouTube writes them ("PT1H2M3S", "P1DT2H", "P0D") → seconds. */
export function parseDuration(value: unknown): number | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(text(value));
  if (!match || value === "P" || value === "PT") return null;
  const [, d, h, m, s] = match.map((part) => Number(part ?? 0));
  const seconds = d * 86400 + h * 3600 + m * 60 + s;
  return seconds > 0 ? seconds : null;
}

/** playlistItems.list → the video ids in upload order, newest first, and the next page. */
export function parsePlaylistItems(json: unknown): { ids: string[]; nextPageToken: string | null } {
  const root = obj(json);
  const ids: string[] = [];
  for (const item of list(root.items)) {
    const id =
      text(obj(obj(item).contentDetails).videoId) ||
      text(obj(obj(obj(item).snippet).resourceId).videoId);
    if (VIDEO_ID.test(id) && !ids.includes(id)) ids.push(id);
  }
  return { ids, nextPageToken: text(root.nextPageToken) || null };
}

function bestThumbnail(thumbnails: unknown): Thumbnail | null {
  const all = obj(thumbnails);
  for (const size of THUMBNAIL_SIZES) {
    const t = obj(all[size]);
    const url = text(t.url);
    if (!/^https?:\/\//.test(url)) continue;
    const width = typeof t.width === "number" && t.width > 0 ? t.width : null;
    const height = typeof t.height === "number" && t.height > 0 ? t.height : null;
    return { url, width, height };
  }
  return null;
}

/** videos.list (snippet, contentDetails, status) → the videos YouTube returned. */
export function parseVideos(json: unknown): YouTubeVideo[] {
  const out: YouTubeVideo[] = [];
  for (const raw of list(obj(json).items)) {
    const item = obj(raw);
    const youtubeId = text(item.id);
    if (!VIDEO_ID.test(youtubeId)) continue;
    const snippet = obj(item.snippet);
    const status = obj(item.status);
    const published = Date.parse(text(snippet.publishedAt));
    const live = text(snippet.liveBroadcastContent);
    const upload = text(status.uploadStatus);
    out.push({
      youtubeId,
      title: text(snippet.title).trim().slice(0, 300) || youtubeId,
      description: text(snippet.description).trim().slice(0, 5000),
      publishedAt: Number.isFinite(published) ? new Date(published).toISOString() : null,
      durationSeconds: parseDuration(obj(item.contentDetails).duration),
      thumbnail: bestThumbnail(snippet.thumbnails),
      showable:
        text(status.privacyStatus) === "public" &&
        (live === "" || live === "none") &&
        (upload === "" || upload === "processed"),
    });
  }
  return out;
}

/** What went wrong, from the error body Google's APIs send, in words for the studio. */
export function parseApiError(
  httpStatus: number,
  json: unknown,
): { problem: YouTubeProblem; message: string } {
  const error = obj(obj(json).error);
  const reasons = [
    ...list(error.errors).map((e) => text(obj(e).reason)),
    ...list(error.details).map((d) => text(obj(d).reason)),
    text(error.status),
  ].filter(Boolean);
  const has = (...names: string[]) => reasons.some((r) => names.includes(r));

  if (has("quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded", "RATE_LIMIT_EXCEEDED"))
    return {
      problem: "quota",
      message:
        "YouTube's daily quota for this key is used up. The sync tries again after it resets at midnight Pacific time.",
    };
  if (has("keyInvalid", "API_KEY_INVALID", "keyExpired", "API_KEY_EXPIRED"))
    return {
      problem: "key",
      message: "YouTube didn't accept the API key. Check it in Google Cloud and save it again.",
    };
  if (has("accessNotConfigured", "SERVICE_DISABLED"))
    return {
      problem: "disabled",
      message: "The YouTube Data API isn't switched on for this key's Google Cloud project.",
    };
  if (
    has(
      "API_KEY_HTTP_REFERRER_BLOCKED",
      "API_KEY_IP_ADDRESS_BLOCKED",
      "API_KEY_SERVICE_BLOCKED",
      "forbidden",
      "ipRefererBlocked",
    )
  )
    return {
      problem: "key",
      message:
        "The API key is restricted in a way that blocks the site. Allow the YouTube Data API for it, without website restrictions.",
    };
  if (has("playlistNotFound", "channelNotFound") || httpStatus === 404)
    return {
      problem: "channel",
      message: "YouTube has no channel with that id. Check the channel id.",
    };
  return {
    problem: "other",
    message: `YouTube answered ${httpStatus}. The sync tries again next hour.`,
  };
}

/** When the daily quota resets: the next midnight in California. */
export function nextQuotaReset(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const elapsed = part("hour") * 3600 + part("minute") * 60 + part("second");
  return new Date(now.getTime() + (86400 - elapsed) * 1000 + 60_000);
}

export type Existing = { youtubeId: string; goneAt: string | null };

export type SyncPlan = {
  /** Show on the site, new or updated. */
  upsert: YouTubeVideo[];
  /** No longer on YouTube or no longer public: hide, never delete. */
  hide: string[];
};

/**
 * What a sync changes. `latest` is the newest uploads; `checked` is every
 * other known video, looked up by id. A video YouTube no longer returns, or
 * no longer shows publicly, is hidden.
 */
export function planSync(
  existing: Existing[],
  latest: YouTubeVideo[],
  checked: YouTubeVideo[],
): SyncPlan {
  const seen = new Map<string, YouTubeVideo>();
  for (const video of [...checked, ...latest]) seen.set(video.youtubeId, video);
  const known = new Set(existing.map((e) => e.youtubeId));

  const upsert = [...seen.values()].filter(
    (video) => video.showable && (known.has(video.youtubeId) || latest.includes(video)),
  );
  const hide = existing
    .filter((e) => !e.goneAt && !seen.get(e.youtubeId)?.showable)
    .map((e) => e.youtubeId);
  return { upsert, hide };
}
