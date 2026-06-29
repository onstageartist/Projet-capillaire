import crypto from "crypto";
import type { BillingProvider, CheckoutInput, Plan, WebhookEvent } from "./index";

const PLAN_VARIANT_IDS: Record<Plan, string> = {
  plus_monthly: process.env.LS_VARIANT_PLUS_MONTHLY ?? "",
  plus_annual: process.env.LS_VARIANT_PLUS_ANNUAL ?? "",
  pro: process.env.LS_VARIANT_PRO ?? "",
};

export class LemonSqueezyProvider implements BillingProvider {
  private apiKey = process.env.LEMONSQUEEZY_API_KEY ?? "";
  private storeId = process.env.LEMONSQUEEZY_STORE_ID ?? "";

  async createCheckout(input: CheckoutInput): Promise<{ url: string }> {
    const variantId = PLAN_VARIANT_IDS[input.plan];
    if (!variantId) throw new Error(`No variant for plan ${input.plan}`);

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: input.email,
              custom: { user_id: input.userId },
            },
          },
          relationships: {
            store: { data: { type: "stores", id: this.storeId } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lemon Squeezy checkout failed: ${text}`);
    }

    const json = await res.json();
    return { url: json.data.attributes.url };
  }

  async verifyWebhook(req: Request): Promise<WebhookEvent | null> {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
    // Sans secret configuré, on refuse tout : pas de webhook accepté en aveugle.
    if (!secret) {
      console.error("[LemonSqueezy] LEMONSQUEEZY_WEBHOOK_SECRET non configuré.");
      return null;
    }
    const body = await req.text();
    const sig = req.headers.get("x-signature") ?? "";

    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const hmacBuf = Buffer.from(hmac, "hex");
    // timingSafeEqual lève si les longueurs diffèrent : on garde-fou avant.
    if (sigBuf.length !== hmacBuf.length || !crypto.timingSafeEqual(sigBuf, hmacBuf)) {
      return null;
    }

    let payload: Record<string, unknown> & {
      meta?: { event_name?: string; custom_data?: { user_id?: string } };
      data?: { id?: string; attributes?: Record<string, unknown> };
    };
    try {
      payload = JSON.parse(body);
    } catch {
      console.error("[LemonSqueezy] Webhook JSON illisible.");
      return null;
    }
    const eventName = payload.meta?.event_name ?? "";
    const attrs = (payload.data?.attributes ?? {}) as {
      variant_id?: string | number;
      first_subscription_item?: { variant_id?: string | number };
      status?: string;
      customer_id?: string | number;
      renews_at?: string | null;
    };
    const customData = payload.meta?.custom_data ?? {};

    const planMap: Record<string, Plan> = {};
    for (const [plan, vid] of Object.entries(PLAN_VARIANT_IDS)) {
      if (vid) planMap[vid] = plan as Plan;
    }

    const variantId = String(attrs.variant_id ?? attrs.first_subscription_item?.variant_id ?? "");
    const plan = planMap[variantId] ?? "plus_monthly";

    const typeMap: Record<string, WebhookEvent["type"]> = {
      subscription_created: "subscription_created",
      subscription_updated: "subscription_updated",
      subscription_cancelled: "subscription_cancelled",
      subscription_expired: "subscription_expired",
      order_created: "subscription_created",
    };

    const type = typeMap[eventName];
    if (!type) return null;

    const statusMap: Record<string, WebhookEvent["status"]> = {
      active: "active",
      cancelled: "canceled",
      expired: "expired",
      on_trial: "active",
      paused: "canceled",
    };

    return {
      type,
      userId: customData.user_id ?? "",
      plan,
      status: statusMap[attrs.status ?? ""] ?? "active",
      providerCustomerId: String(attrs.customer_id ?? ""),
      providerSubscriptionId: String(payload.data?.id ?? ""),
      currentPeriodEnd: attrs.renews_at ?? null,
    };
  }
}
