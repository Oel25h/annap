/**
 * Server side of studio sign-in checks. A studio function runs with the
 * caller's own token, so row-level security applies to every read and write,
 * and only after the database confirms the role and a live session
 * (is_admin / is_translator).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import { createSupabaseFetch } from "@/integrations/supabase/fetch";
import type { Database } from "@/integrations/supabase/types";
import { readServerPublicConfig } from "@/lib/public-config";

export type StudioCheck = "is_admin" | "is_translator";

/** Codes the studio understands: sign in again, or no access. */
export type StudioAuthCode = "signed_out" | "forbidden";

export class StudioAuthError extends Error {
  constructor(public code: StudioAuthCode) {
    super(`studio:${code}`);
  }
}

export type StudioContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  sessionId: string | null;
};

export async function studioContext(check: StudioCheck): Promise<StudioContext> {
  const header = getRequest()?.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.split(".").length !== 3) throw new StudioAuthError("signed_out");

  const { supabaseUrl, supabasePublishableKey } = readServerPublicConfig();
  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: {
      fetch: createSupabaseFetch(supabasePublishableKey),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub) throw new StudioAuthError("signed_out");

  const { data: allowed, error: roleError } = await supabase.rpc(check);
  if (roleError || allowed !== true) throw new StudioAuthError("forbidden");

  return {
    supabase,
    userId: claims.sub,
    sessionId: typeof claims.session_id === "string" ? claims.session_id : null,
  };
}
