import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { saveSubscription } from "@/app/lib/pushStore";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { ok: false, error: "Subscription data mancante o incompleta" },
        { status: 400 }
      );
    }

    // Ottieni userId dalla sessione se disponibile (opzionale)
    const cookieStore = await cookies();
    const sess = cookieStore.get("sess")?.value;
    const session = readSession(sess);
    const validated = validateSessionUser(session);
    const userId = validated?.userId;

    const subscription = saveSubscription({
      endpoint: String(endpoint),
      keys: {
        p256dh: String(keys.p256dh),
        auth: String(keys.auth),
      },
      userId,
      createdAt: Date.now(),
    });

    console.log("[push/subscribe] Subscription registrata:", {
      endpoint: subscription.endpoint.substring(0, 50) + "...",
      userId: userId || "anonimo",
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[push/subscribe] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

