import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { listAllSubscriptions } from "@/app/lib/pushStore";
import { configureWebPush, getVapidPublicKey } from "@/app/lib/vapidKeys";
import webpush from "web-push";

// Configura webpush una volta
configureWebPush();

export async function POST(req: Request) {
  try {
    // Verifica autenticazione tech
    const cookieStore = await cookies();
    const sess = cookieStore.get("sess")?.value;
    const session = readSession(sess);
    const validated = validateSessionUser(session);

    if (!validated || validated.role !== "tech") {
      return NextResponse.json(
        { ok: false, error: "Non autorizzato: solo utenti tech possono inviare test push" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const title = String(body?.title || "Test Push").trim() || "Test Push";
    const message = String(body?.message || "Questa è una notifica di test").trim() || "Questa è una notifica di test";

    const subscriptions = listAllSubscriptions();

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nessuna subscription registrata" },
        { status: 400 }
      );
    }

    const payload = JSON.stringify({
      title,
      body: message,
      tag: "test-push",
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payload
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error("[push/test] Errore invio a subscription:", sub.endpoint.substring(0, 50), error);
          // Se la subscription è invalida (410 Gone), la rimuoviamo
          if (error.statusCode === 410) {
            const { deleteSubscription } = await import("@/app/lib/pushStore");
            deleteSubscription(sub.endpoint);
          }
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - successful;

    console.log("[push/test] Test push inviato:", {
      total: subscriptions.length,
      successful,
      failed,
    });

    return NextResponse.json({
      ok: true,
      sent: successful,
      total: subscriptions.length,
      failed,
    });
  } catch (error: any) {
    console.error("[push/test] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

