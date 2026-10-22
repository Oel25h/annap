/**
 * The visitor's view of the database, for public data functions on the server.
 * It uses the publishable key with no session, so row-level security decides
 * what it can read: published rows only.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseFetch } from "@/integrations/supabase/fetch";
import type { Database } from "@/integrations/supabase/types";
import { readServerPublicConfig } from "@/lib/public-config";

export type PublicDb = SupabaseClient<Database>;

let client: PublicDb | undefined;

export function publicDb(): PublicDb {
  if (client) return client;
  const { supabaseUrl, supabasePublishableKey } = readServerPublicConfig();
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set.");
  }
  client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: { fetch: createSupabaseFetch(supabasePublishableKey) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Public URL of an object in a public bucket. */
export function publicObjectUrl(bucket: string, path: string): string {
  const { supabaseUrl } = readServerPublicConfig();
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encoded}`;
}
