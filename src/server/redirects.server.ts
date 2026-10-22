/**
 * Redirects kept in the studio (a changed page path or slug adds one). Looked
 * up only when a path has no page, so normal pages never pay for it.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { publicDb } from "./supabase-public.server";

export type Redirect = { to: string; status: 301 | 302 };

/** The redirect for an English site path, if one is switched on. */
export async function findRedirect(path: string): Promise<Redirect | null> {
  const from = path.toLowerCase().replace(/\/+$/, "") || "/";
  if (!/^\/[a-z0-9/_.-]*$/.test(from)) return null;
  const { data } = await publicDb()
    .from("redirects")
    .select("id, to_path, status_code, hits")
    .eq("from_path", from)
    .maybeSingle();
  if (!data) return null;
  const to = data.to_path.trim();
  // Only site paths and https addresses, never back to itself.
  if (to === from || !(/^\/(?!\/)/.test(to) || /^https:\/\//i.test(to))) return null;
  // Counting is best effort; a failed count never blocks the redirect.
  void supabaseAdmin
    .from("redirects")
    .update({ hits: data.hits + 1, last_hit_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(
      () => undefined,
      () => undefined,
    );
  return { to, status: data.status_code === 302 ? 302 : 301 };
}
