/** Every 5 minutes: send the emails waiting in the outbox. */
import { defineTask } from "nitro/task";

export default defineTask({
  meta: { name: "outbox:drain", description: "Send queued emails through Resend" },
  async run() {
    const { drainOutbox } = await import("../email/drain.server");
    const result = await drainOutbox();
    if (result.status === "done" && result.sent + result.retrying + result.failed > 0) {
      console.log(
        `[outbox] sent ${result.sent}, retrying ${result.retrying}, failed ${result.failed}`,
      );
    }
    return { result };
  },
});
