import { NextResponse } from "next/server";
import { authenticateUser } from "@/app/lib/userStore";
import { createSession } from "@/app/lib/session";

function roleHome(role: string) {
  switch (role) {
    case "tech":
      return "/app/tech";
    case "host":
      return "/app/host";
    default:
      return "/app";
  }
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  
  try {

    let username = "";
    let password = "";
    let next = "";

    if (isJson) {
      const body = await req.json().catch(() => ({} as any));
      username = String(body?.username ?? "").trim();
      password = String(body?.password ?? "").trim();
      next = String(body?.next ?? "").trim();
    } else {
      const fd = await req.formData().catch(() => null);
      username = String(fd?.get("username") ?? "").trim();
      password = String(fd?.get("password") ?? "").trim();
      next = String(fd?.get("next") ?? "").trim();
    }

    const isDev = process.env.NODE_ENV !== "production";

    // Autentica user
    const user = authenticateUser(username, password);

    if (!user) {
      if (isJson) {
        return NextResponse.json(
          { ok: false, error: "Username o password non validi" },
          { status: 401 }
        );
      }
      // Usa path relativo per il redirect
      const redirectUrl = next ? `/loginhost-tech?err=auth&next=${encodeURIComponent(next)}` : "/loginhost-tech?err=auth";
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

  // Per host, serviamo l'aptId - per ora usiamo il primo apt del client
  // TODO: In futuro potremmo permettere all'host di selezionare l'apt, per ora usiamo "101" come default
  const aptId = user.role === "host" ? "101" : "101"; // Default per demo

  const session = createSession(
    { role: user.role, aptId, userId: user.userId },
    60 * 60 * 6 // 6 ore
  );

  const fallback = roleHome(user.role);
  const redirectTo = next && next.startsWith("/app") ? next : fallback;

  if (isJson) {
    const res = NextResponse.json({ ok: true, role: user.role, next: redirectTo });
    res.cookies.set("sess", session, {
      httpOnly: true,
      sameSite: "lax",
      secure: !isDev,
      path: "/",
    });
    return res;
  } else {
    // Usa un path relativo - Next.js risolverà automaticamente l'URL corretto
    // Questo funziona correttamente su Render senza configurazioni aggiuntive
    const res = NextResponse.redirect(redirectTo, { status: 303 });
    res.cookies.set("sess", session, {
      httpOnly: true,
      sameSite: "lax",
      secure: !isDev,
      path: "/",
    });
    return res;
  }
  } catch (error: any) {
    console.error("[auth/login] Error:", error);
    if (isJson) {
      return NextResponse.json(
        { ok: false, error: "Errore interno del server" },
        { status: 500 }
      );
    }
    return NextResponse.redirect("/loginhost-tech?err=server", { status: 303 });
  }
}
