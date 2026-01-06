import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { listAllSubscriptions } from "@/app/lib/pushStore";
import { configureWebPush, getVapidPublicKey } from "@/app/lib/vapidKeys";
import webpush from "web-push";

// Configura webpush (assicuriamoci che sia sempre configurato)
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

    console.log("[push/test] Subscription trovate:", subscriptions.length);

    if (subscriptions.length === 0) {
      console.log("[push/test] Nessuna subscription registrata");
      return NextResponse.json(
        { ok: false, error: "Nessuna subscription registrata. Abilita le notifiche prima di testare." },
        { status: 400 }
      );
    }

    // Ri-configura webpush prima di ogni invio (per sicurezza)
    configureWebPush();

    const payload = JSON.stringify({
      title,
      body: message,
      tag: "test-push",
    });

    // Log per debug
    console.log("[push/test] VAPID public key:", getVapidPublicKey().substring(0, 50) + "...");

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Verifica se è endpoint Apple
          const isApple = sub.endpoint.includes('web.push.apple.com');
          console.log("[push/test] Invio a:", isApple ? "Apple" : "Altro", sub.endpoint.substring(0, 60));
          
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payload,
            {
              // Opzioni aggiuntive per Apple
              headers: isApple ? {} : undefined,
            }
          );
          console.log("[push/test] Notifica inviata con successo a:", sub.endpoint.substring(0, 50));
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error("[push/test] Errore invio a subscription:", {
            endpoint: sub.endpoint.substring(0, 50),
            statusCode: error.statusCode,
            message: error.message,
            body: error.body,
          });
          // Se la subscription è invalida (410 Gone), la rimuoviamo
          if (error.statusCode === 410 || error.statusCode === 404) {
            const { deleteSubscription } = await import("@/app/lib/pushStore");
            deleteSubscription(sub.endpoint);
            console.log("[push/test] Subscription rimossa (invalida):", sub.endpoint.substring(0, 50));
          }
          return { 
            success: false, 
            endpoint: sub.endpoint, 
            error: error.message || `Errore ${error.statusCode || 'sconosciuto'}` 
          };
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - successful;

    const failedResults = results
      .filter((r) => r.status === "fulfilled" && !r.value.success)
      .map((r) => r.status === "fulfilled" ? r.value.error : "Unknown error");

    console.log("[push/test] Test push completato:", {
      total: subscriptions.length,
      successful,
      failed,
      errors: failedResults,
    });

    return NextResponse.json({
      ok: true,
      sent: successful,
      total: subscriptions.length,
      failed,
      errors: failedResults.length > 0 ? failedResults : undefined,
    });
  } catch (error: any) {
    console.error("[push/test] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

