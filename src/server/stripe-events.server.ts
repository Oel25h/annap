/**
 * The Stripe events the webhook handles. The studio's keys screen lists them
 * for the owner to tick when she adds the endpoint in Stripe.
 */
export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
  "invoice.paid",
] as const;

export const WEBHOOK_PATH = "/api/stripe/webhook";
