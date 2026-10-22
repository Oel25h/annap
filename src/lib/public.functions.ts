import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RATE_WINDOW_MS = 10 * 60 * 1000;

const ContactInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  enquiry_type: z.enum(["General", "Speaking", "Media", "Partnerships"]),
  message: z.string().trim().min(1).max(5000),
  website: z.string().max(200).optional(), // honeypot
});

const SubscribeInput = z.object({
  email: z.string().trim().email().max(320),
  source: z.string().max(200).nullable().optional(),
  website: z.string().max(200).optional(), // honeypot
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ContactInput.parse(d))
  .handler(async ({ data }) => {
    if (data.website?.trim()) {
      return { ok: true as const }; // bot — pretend success
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("email", data.email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      throw new Error("Too many messages from this email. Please try again later.");
    }
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      enquiry_type: data.enquiry_type,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const subscribeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubscribeInput.parse(d))
  .handler(async ({ data }) => {
    if (data.website?.trim()) {
      return { ok: true as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("email", data.email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      throw new Error("Too many signup attempts. Please try again later.");
    }
    const { error } = await supabaseAdmin.from("subscribers").insert({
      email: data.email,
      source: data.source ?? null,
    });
    // Unique email race: treat as success so UX stays friendly
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true as const };
  });
