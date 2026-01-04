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

// Helper per costruire URL assoluti usando gli header della richiesta
function getAbsoluteUrl(req: Request, path: string): string {
  try {
    // NON usare req.url perché su Render contiene l'URL interno (localhost:10000)
    // Usa sempre gli header per costruire l'URL pubblico corretto
    
    // Preferisci x-forwarded-host (set da proxy/reverse proxy come Render)
    const xForwardedHost = req.headers.get('x-forwarded-host');
    const hostHeader = req.headers.get('host');
    const host = xForwardedHost || hostHeader;
    
    if (!host) {
      throw new Error('No host header available');
    }
    
    // Se l'host è localhost o 127.0.0.1, preferisci sempre x-forwarded-host
    // (su Render potrebbe esserci un problema di configurazione)
    if ((host.includes('localhost') || host.includes('127.0.0.1')) && !xForwardedHost) {
      console.warn('[getAbsoluteUrl] Host è localhost ma x-forwarded-host non disponibile:', { host, reqUrl: req.url });
    }
    
    // Preferisci x-forwarded-proto, poi assumi https in produzione (Render usa sempre https)
    const xForwardedProto = req.headers.get('x-forwarded-proto');
    const protocol = xForwardedProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const absoluteUrl = `${protocol}://${host}${cleanPath}`;
    
    // Valida l'URL costruito
    new URL(absoluteUrl);
    return absoluteUrl;
  } catch (error) {
    console.error('[getAbsoluteUrl] Error constructing URL:', { 
      error, 
      path, 
      host: req.headers.get('host'),
      xForwardedHost: req.headers.get('x-forwarded-host'),
      xForwardedProto: req.headers.get('x-forwarded-proto'),
      nodeEnv: process.env.NODE_ENV,
      reqUrl: req.url
    });
    // Fallback: ritorna il path relativo (meglio che crashare)
    return path.startsWith('/') ? path : `/${path}`;
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
      // Costruisci URL assoluto per il redirect
      const redirectPath = next ? `/loginhost-tech?err=auth&next=${encodeURIComponent(next)}` : "/loginhost-tech?err=auth";
      return NextResponse.redirect(getAbsoluteUrl(req, redirectPath), { status: 303 });
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
    // Costruisci URL assoluto per il redirect (Next.js richiede URL assoluti)
    const res = NextResponse.redirect(getAbsoluteUrl(req, redirectTo), { status: 303 });
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
    return NextResponse.redirect(getAbsoluteUrl(req, "/loginhost-tech?err=server"), { status: 303 });
  }
}
