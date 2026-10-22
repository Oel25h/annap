/**
 * Server-side crypto through Web Crypto (works on Workers and Node).
 *
 * APP_ENCRYPTION_KEY is 32 random bytes in base64. From it we derive, with
 * HKDF, one AES-256-GCM key for stored secrets and one HMAC key for hashing
 * rate-limit keys, so the raw key is never used for two purposes.
 */
const KEY_VERSION = 1;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** 32 random bytes, base64url: for download, confirm and preview links. */
export function randomToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Tokens are stored only as their SHA-256. */
export const hashToken = sha256Hex;

/** A token from a URL: base64url, 43 characters. */
export function isToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

type Keys = { aes: CryptoKey; hmac: CryptoKey };
let keysPromise: Promise<Keys> | null = null;

function keys(): Promise<Keys> {
  keysPromise ??= (async () => {
    const raw = process.env.APP_ENCRYPTION_KEY;
    if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set");
    const bytes = fromBase64(raw.trim());
    if (bytes.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes in base64");
    const base = await crypto.subtle.importKey("raw", bytes, "HKDF", false, ["deriveKey"]);
    const derive = (
      info: string,
      algorithm: AesKeyGenParams | HmacKeyGenParams,
      usages: KeyUsage[],
    ) =>
      crypto.subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode(info) },
        base,
        algorithm,
        false,
        usages,
      );
    const [aes, hmac] = await Promise.all([
      derive(`ap:aes:v${KEY_VERSION}`, { name: "AES-GCM", length: 256 }, ["encrypt", "decrypt"]),
      derive(`ap:hmac:v${KEY_VERSION}`, { name: "HMAC", hash: "SHA-256", length: 256 }, ["sign"]),
    ]);
    return { aes, hmac };
  })();
  keysPromise.catch(() => {
    keysPromise = null;
  });
  return keysPromise;
}

export type Sealed = { ciphertext: string; iv: string; v: number };

/** Encrypts JSON with a fresh 12-byte IV; `context` is bound as additional data. */
export async function seal(value: unknown, context: string): Promise<Sealed> {
  const { aes } = await keys();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(`${context}:${KEY_VERSION}`) },
    aes,
    encoder.encode(JSON.stringify(value)),
  );
  return { ciphertext: toBase64(new Uint8Array(data)), iv: toBase64(iv), v: KEY_VERSION };
}

export async function open<T>(sealed: Sealed, context: string): Promise<T> {
  const { aes } = await keys();
  const data = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(sealed.iv),
      additionalData: encoder.encode(`${context}:${sealed.v ?? KEY_VERSION}`),
    },
    aes,
    fromBase64(sealed.ciphertext),
  );
  return JSON.parse(decoder.decode(data)) as T;
}

/** A keyed hash for rate-limit keys, so stored keys reveal no IPs or emails. */
export async function keyedHash(value: string): Promise<string> {
  const { hmac } = await keys();
  return toHex(await crypto.subtle.sign("HMAC", hmac, encoder.encode(value)));
}
