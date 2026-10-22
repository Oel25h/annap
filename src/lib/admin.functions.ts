import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Bootstrap the very first admin account. Signup is disabled globally, so
// this server fn uses the admin API to create the user. It refuses to run
// once at least one admin already exists, and requires ADMIN_SETUP_SECRET.
export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({
        email: z.string().email().max(320),
        password: z.string().min(8).max(200),
        setupSecret: z.string().min(1).max(200),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_SETUP_SECRET;
    if (!expected || data.setupSecret !== expected) {
      throw new Error("Setup is disabled.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("Admin already exists. Sign in instead.");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true };
  });

export const hasAnyAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return { exists: (count ?? 0) > 0 };
});
