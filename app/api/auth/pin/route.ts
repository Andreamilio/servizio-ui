import { NextResponse } from "next/server";
import { consumePin } from "@/app/lib/store";
import { createSession } from "@/app/lib/session";

function roleHome(role: string) {
  switch (role) {
    case "cleaner":
      return "/app/cleaner";
    case "tech":
      return "/app/tech";
    case "guest":
      return "/app/guest";
    case "host":
      return "/app/host";
    default:
      return "/app";
  }
}

// Helper per costruire URL assoluti usando gli header della richiesta
function getAbsoluteUrl(req: Request, path: string): string {
  try {
    if (req.url) {
      try {
        const baseUrl = new URL(req.url);
        const url = new URL(path, baseUrl.origin);
        return url.toString();
      } catch {
        // Se req.url è malformato, continua con la costruzione manuale
      }
    }
    
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (!host) {
      throw new Error('No host header available');
    }
    
    const protocol = req.headers.get('x-forwarded-proto') || 
                     (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const absoluteUrl = `${protocol}://${host}${cleanPath}`;
    
    new URL(absoluteUrl);
    return absoluteUrl;
  } catch (error) {
    console.error('[getAbsoluteUrl] Error constructing URL:', { 
      error, path, 
      host: req.headers.get('host'),
      xForwardedHost: req.headers.get('x-forwarded-host'),
      xForwardedProto: req.headers.get('x-forwarded-proto'),
      nodeEnv: process.env.NODE_ENV
    });
    return path.startsWith('/') ? path : `/${path}`;
  }
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  
  try {
    let pin = "";
    let next = "";

    const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, "");

    if (isJson) {
      const body = await req.json().catch(() => ({} as any));
      pin = norm(body?.pin ?? body?.code ?? body?.otp);
      next = String(body?.next ?? "").trim();
    } else {
      // iPhone/Safari spesso manda form-urlencoded o formData se submitti un <form>
      const fd = await req.formData().catch(() => null);
      pin = norm(fd?.get("pin") ?? fd?.get("code") ?? fd?.get("otp"));
      next = String(fd?.get("next") ?? "").trim();
    }

    const isDev = process.env.NODE_ENV !== "production";

  // Demo pins: solo per guest/cleaner (host/tech ora usano username/password)
  const demoPins = {
    cleaner: String(process.env.DEMO_PIN_CLEANER ?? "444444").trim(),
    guest: String(process.env.DEMO_PIN_GUEST ?? "333333").trim(),
  };

  function matchDemoPin(p: string) {
    // I PIN demo nello store hanno aptId "101" (vedi store.ts seed)
    if (demoPins.cleaner && p === demoPins.cleaner) return { role: "cleaner" as const, aptId: "101" as const };
    if (demoPins.guest && p === demoPins.guest) return { role: "guest" as const, aptId: "101" as const };
    return null;
  }

  console.log("[auth/pin]", {
    nodeEnv: process.env.NODE_ENV,
    contentType: ct,
    isJson,
    pinLen: pin.length,
    demoPinsPresent: {
      cleaner: Boolean(demoPins.cleaner),
      guest: Boolean(demoPins.guest),
    },
    matchedRole: matchDemoPin(pin)?.role ?? null,
    nextProvided: Boolean(next),
  });

  const rec = matchDemoPin(pin) ?? consumePin(pin);

  if (!rec) {
    if (isJson) {
      return NextResponse.json(
        { ok: false, error: "PIN non valido o scaduto" },
        { status: 401 }
      );
    }
    // Costruisci URL assoluto per il redirect
    const redirectPath = next ? `/?err=pin&next=${encodeURIComponent(next)}` : "/?err=pin";
    return NextResponse.redirect(getAbsoluteUrl(req, redirectPath), { status: 303 });
  }

  const session = createSession(
    { role: rec.role, aptId: rec.aptId },
    60 * 60 * 6
  );

  const fallback = roleHome(rec.role);
  const redirectTo = next && next.startsWith("/app") ? next : fallback;

  // ✅ Risposta diversa per fetch(JSON) vs submit(Form)
  if (isJson) {
    const res = NextResponse.json({ ok: true, role: rec.role, next: redirectTo });
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
    console.error("[auth/pin] Error:", error);
    if (isJson) {
      return NextResponse.json(
        { ok: false, error: "Errore interno del server" },
        { status: 500 }
      );
    }
    return NextResponse.redirect(getAbsoluteUrl(req, "/?err=server"), { status: 303 });
  }
}