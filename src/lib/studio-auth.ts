/**
 * Middleware for studio server functions. In the browser it attaches the
 * signed-in admin's token; on the server it checks the token, the role
 * and the session before the function runs. Public
 * functions never use it, so visitors never load the Supabase client.
 */
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { StudioCheck } from "@/server/studio-auth.server";

async function browserToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

function studioMiddleware(check: StudioCheck) {
  return createMiddleware({ type: "function" })
    .client(async ({ next }) => {
      const token = await browserToken();
      return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
    })
    .server(async ({ next }) => {
      const { studioContext } = await import("@/server/studio-auth.server");
      return next({ context: await studioContext(check) });
    });
}

/** Admins only. */
export const requireAdmin = studioMiddleware("is_admin");
/** Greek readers and admins. */
export const requireTranslator = studioMiddleware("is_translator");
