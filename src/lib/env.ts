/**
 * Typed environment accessors. Every secret is read server-side only via
 * `process.env`; nothing here is marked NEXT_PUBLIC.
 */
export const env = {
  get NODE_ENV() {
    return process.env.NODE_ENV ?? "development";
  },
  get APP_URL() {
    return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  },
  get DATABASE_URL() {
    return process.env.DATABASE_URL || null;
  },
  get RAPIDAPI_KEY() {
    return process.env.RAPIDAPI_KEY || null;
  },
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY || null;
  },
  get RAZORPAY_KEY_ID() {
    return process.env.RAZORPAY_KEY_ID || null;
  },
  get RAZORPAY_KEY_SECRET() {
    return process.env.RAZORPAY_KEY_SECRET || null;
  },
  get RAZORPAY_PLAN_ID_INR() {
    return process.env.RAZORPAY_PLAN_ID_INR || null;
  },
  get RAZORPAY_WEBHOOK_SECRET() {
    return process.env.RAZORPAY_WEBHOOK_SECRET || null;
  },
  get STRIPE_SECRET_KEY() {
    return process.env.STRIPE_SECRET_KEY || null;
  },
  get STRIPE_WEBHOOK_SECRET() {
    return process.env.STRIPE_WEBHOOK_SECRET || null;
  },
  get STRIPE_PRICE_ID_PRO() {
    return process.env.STRIPE_PRICE_ID_PRO || null;
  },
  get TELEGRAM_BOT_TOKEN() {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  },
  get WHATSAPP_TOKEN() {
    return process.env.WHATSAPP_TOKEN || null;
  },
  get WHATSAPP_PHONE_NUMBER_ID() {
    return process.env.WHATSAPP_PHONE_NUMBER_ID || null;
  },
  get CRON_SECRET() {
    return process.env.CRON_SECRET || null;
  },
  get SESSION_SECRET() {
    return process.env.SESSION_SECRET || null;
  },
  get BILLING_SECRET() {
    return (
      process.env.BILLING_SECRET ||
      process.env.SESSION_SECRET ||
      "fg-billing-dev-secret-change-me"
    );
  },
};

export const isProd = process.env.NODE_ENV === "production";

export function authFeatureStatus() {
  return {
    email: Boolean(env.RESEND_API_KEY),
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN),
    whatsapp: Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID),
  };
}

export function paymentsFeatureStatus() {
  return {
    razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
    razorpayPlan: Boolean(env.RAZORPAY_PLAN_ID_INR),
    razorpayWebhook: Boolean(env.RAZORPAY_WEBHOOK_SECRET),
    stripe: Boolean(env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(env.STRIPE_WEBHOOK_SECRET),
    rapidapi: Boolean(env.RAPIDAPI_KEY),
  };
}
