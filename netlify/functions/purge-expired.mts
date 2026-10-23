/** Daily at 03:17 UTC: delete expired personal data and tokens. A Netlify Scheduled Function. */
import { runScheduledTask } from "../../src/server/tasks/scheduled.server";

export default async () => {
  await runScheduledTask("purge:expired");
};

export const config = { schedule: "17 3 * * *" };
