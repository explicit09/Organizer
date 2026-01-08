import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  getSubscriptionsForUser,
} from "../../../lib/pushNotifications";

// GET /api/push - Get VAPID public key and subscription status
export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "vapid-key") {
    return NextResponse.json({ vapidPublicKey: getVapidPublicKey() });
  }

  if (action === "status") {
    const subscriptions = getSubscriptionsForUser({ userId });
    return NextResponse.json({
      subscribed: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
    });
  }

  return NextResponse.json({
    vapidPublicKey: getVapidPublicKey(),
    subscriptions: getSubscriptionsForUser({ userId }),
  });
}

// POST /api/push - Subscribe to push notifications
export async function POST(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subscription, action } = body;

    if (action === "unsubscribe" && subscription?.endpoint) {
      removeSubscription(subscription.endpoint);
      return NextResponse.json({ success: true, message: "Unsubscribed" });
    }

    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 }
      );
    }

    const saved = saveSubscription(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      { userId }
    );

    return NextResponse.json({
      success: true,
      subscription: saved,
    });
  } catch (error) {
    console.error("Push subscription error:", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

// DELETE /api/push - Unsubscribe from push notifications
export async function DELETE(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");

  if (endpoint) {
    removeSubscription(endpoint);
    return NextResponse.json({ success: true });
  }

  // Remove all subscriptions for user
  const subscriptions = getSubscriptionsForUser({ userId });
  for (const sub of subscriptions) {
    removeSubscription(sub.endpoint);
  }

  return NextResponse.json({
    success: true,
    removed: subscriptions.length,
  });
}
