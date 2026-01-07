import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { deleteAllSubscriptions, listAllSubscriptions } from "@/app/lib/pushStore";

export async function POST() {
  try {
    // Verifica autenticazione tech
    const cookieStore = await cookies();
    const sess = cookieStore.get("sess")?.value;
    const session = readSession(sess);
    const validated = validateSessionUser(session);

    if (!validated || validated.role !== "tech") {
      return NextResponse.json(
        { ok: false, error: "Non autorizzato: solo utenti tech" },
        { status: 403 }
      );
    }

    const count = listAllSubscriptions().length;
    deleteAllSubscriptions();

    console.log("[push/clear] Tutte le subscription eliminate:", count);

    return NextResponse.json({
      ok: true,
      deleted: count,
      message: `${count} subscription eliminate. Riabilita le notifiche per crearne di nuove.`,
    });
  } catch (error: any) {
    console.error("[push/clear] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

