/** Daily: delete what the privacy policy says is kept only for a while. */
import { defineTask } from "nitro/task";

export default defineTask({
  meta: { name: "purge:expired", description: "Remove expired personal data and tokens" },
  async run() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("purge_expired");
    if (error) throw new Error(`Purge: ${error.message}`);
    return { result: data };
  },
});
