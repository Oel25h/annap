/**
 * Full-length audio on Cloudflare R2. The studio uploads straight to R2
 * with a presigned PUT (the file never passes through this server), and the
 * homepage player reads the public address. R2 answers Range requests, so
 * seeking works in the audio element.
 *
 * The bucket must allow the studio origins to PUT. In the R2 dashboard, CORS:
 *   AllowedOrigins: http://localhost:8080 and the live site origin
 *   AllowedMethods: PUT, GET, HEAD
 *   AllowedHeaders: content-type
 */
import { AwsClient } from "aws4fetch";

/** One recording, Greek or English. Headroom over a high-bitrate hour. */
export const AUDIO_MAX_BYTES = 2 * 1024 * 1024 * 1024;

const AUDIO_MIME = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
} as const;

export type AudioMime = keyof typeof AUDIO_MIME;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

function config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = process.env.R2_BUCKET?.trim() ?? "";
  const publicUrl = (process.env.R2_PUBLIC_URL?.trim() ?? "").replace(/\/+$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "Audio storage is not set up. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL.",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

function client(cfg: R2Config): AwsClient {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(cfg: R2Config, key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${encoded}`;
}

/** Public address the player uses. R2 serves ranges on this host. */
export function audioPlaybackUrl(key: string): string {
  const cfg = config();
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${cfg.publicUrl}/${encoded}`;
}

export function isAudioMime(value: string): value is AudioMime {
  return value in AUDIO_MIME;
}

/** A one-hour presigned PUT for one new recording. The key is chosen here. */
export async function presignAudioPut(mime: AudioMime): Promise<{
  id: string;
  key: string;
  uploadUrl: string;
  playbackUrl: string;
  contentType: AudioMime;
}> {
  const cfg = config();
  const id = crypto.randomUUID();
  const key = `audio/${id}/original.${AUDIO_MIME[mime]}`;
  const url = new URL(objectUrl(cfg, key));
  url.searchParams.set("X-Amz-Expires", "3600");
  const signed = await client(cfg).sign(
    new Request(url, { method: "PUT", headers: { "content-type": mime } }),
    { aws: { signQuery: true } },
  );
  return {
    id,
    key,
    uploadUrl: signed.url,
    playbackUrl: audioPlaybackUrl(key),
    contentType: mime,
  };
}

/** Remove an object this module created. Ignores anything outside `audio/<id>/`. */
export async function deleteAudioObject(key: string): Promise<void> {
  if (!/^audio\/[0-9a-f-]{36}\/original\.(mp3|m4a|aac)$/.test(key)) return;
  const cfg = config();
  const signed = await client(cfg).sign(new Request(objectUrl(cfg, key), { method: "DELETE" }));
  const response = await fetch(signed);
  if (!response.ok && response.status !== 404) {
    throw new Error("The recording could not be removed from audio storage.");
  }
}
