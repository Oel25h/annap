import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ token: z.string().uuid() });

export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ ok: false, reason: "invalid" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("subscribers")
          .update({ status: "unsubscribed" })
          .eq("unsubscribe_token", parsed.token)
          .neq("status", "unsubscribed")
          .select("id");
        if (error) {
          return new Response(JSON.stringify({ ok: false, reason: "invalid" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        // If no row was updated, either the token is bad or the subscriber
        // is already unsubscribed. Distinguish the two without leaking data.
        if (!data || data.length === 0) {
          const { data: existing } = await supabaseAdmin
            .from("subscribers")
            .select("id")
            .eq("unsubscribe_token", parsed.token)
            .limit(1);
          if (!existing || existing.length === 0) {
            return new Response(JSON.stringify({ ok: false, reason: "invalid" }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ ok: true, already: true }), {
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, already: false }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
