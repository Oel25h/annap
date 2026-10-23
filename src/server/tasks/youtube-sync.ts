/** Every hour: bring in the channel's newest videos and hide the ones gone from YouTube. */
import { defineTask } from "nitro/task";

export default defineTask({
  meta: { name: "youtube:sync", description: "Sync the YouTube channel's videos" },
  async run() {
    const { syncYouTube } = await import("../youtube-sync.server");
    const result = await syncYouTube("cron");
    if (result.problem !== "not_connected") {
      console.log(`[youtube] ${result.ok ? "synced" : "not synced"}: ${result.message}`);
    }
    return { result };
  },
});
