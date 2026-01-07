import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { getUser, verifyPassword, updateUserPassword } from "@/app/lib/userStore";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sess = cookieStore.get("sess")?.value;
    const session = readSession(sess);
    const me = validateSessionUser(session);

    if (!me || !me.userId) {
      return NextResponse.json(
        { ok: false, error: "Sessione non valida" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({})) as { currentPassword?: string; newPassword?: string; confirmPassword?: string };
    const currentPassword = String(body?.currentPassword ?? "").trim();
    const newPassword = String(body?.newPassword ?? "").trim();
    const confirmPassword = String(body?.confirmPassword ?? "").trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "Tutti i campi sono obbligatori" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "Le password non corrispondono" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "La nuova password deve essere di almeno 6 caratteri" },
        { status: 400 }
      );
    }

    const user = getUser(me.userId);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Utente non trovato" },
        { status: 404 }
      );
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { ok: false, error: "Password corrente non corretta" },
        { status: 401 }
      );
    }

    const updated = updateUserPassword(me.userId, newPassword);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Errore durante l'aggiornamento della password" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Password aggiornata con successo" });
  } catch (error) {
    console.error("[auth/change-password] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Errore interno del server" },
      { status: 500 }
    );
  }
}


