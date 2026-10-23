/** Every 5 minutes: send the emails waiting in the outbox. A Netlify Scheduled Function. */
import { runScheduledTask } from "../../src/server/tasks/scheduled.server";

export default async () => {
  await runScheduledTask("outbox:drain");
};

export const config = { schedule: "*/5 * * * *" };
