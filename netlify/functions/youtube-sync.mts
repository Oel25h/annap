/** Every hour: sync the YouTube channel's videos. A Netlify Scheduled Function. */
import { runScheduledTask } from "../../src/server/tasks/scheduled.server";

export default async () => {
  await runScheduledTask("youtube:sync");
};

export const config = { schedule: "0 * * * *" };
