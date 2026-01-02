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
    default:
      return "/app";
  }
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

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

  // Demo pins (work also in production if set in Vercel env)
  const demoPins = {
    host: (process.env.DEMO_PIN_HOST || "").trim(),
    tech: (process.env.DEMO_PIN_TECH || "").trim(),
    cleaner: (process.env.DEMO_PIN_CLEANER || "").trim(),
    guest: (process.env.DEMO_PIN_GUEST || "").trim(),
  };

  function matchDemoPin(p: string) {
    if (demoPins.host && p === demoPins.host) return { role: "host" as const, aptId: "017" as const };
    if (demoPins.tech && p === demoPins.tech) return { role: "tech" as const, aptId: "017" as const };
    if (demoPins.cleaner && p === demoPins.cleaner) return { role: "cleaner" as const, aptId: "017" as const };
    if (demoPins.guest && p === demoPins.guest) return { role: "guest" as const, aptId: "017" as const };
    return null;
  }

  if (isDev) {
    console.log("[auth/pin]", {
      nodeEnv: process.env.NODE_ENV,
      pinReceived: pin,
      hasDemoPins: {
        host: Boolean(demoPins.host),
        tech: Boolean(demoPins.tech),
        cleaner: Boolean(demoPins.cleaner),
        guest: Boolean(demoPins.guest),
      },
      matchedRole: matchDemoPin(pin)?.role ?? null,
      contentType: ct,
    });
  }

  const rec = matchDemoPin(pin) ?? consumePin(pin);

  if (!rec) {
    if (isJson) {
      return NextResponse.json(
        { ok: false, error: "PIN non valido o scaduto" },
        { status: 401 }
      );
    }
    const url = new URL("/", req.url);
    url.searchParams.set("err", "pin");
    if (next) url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
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
      path: "/",
    });
    return res;
  } else {
    const res = NextResponse.redirect(new URL(redirectTo, req.url), { status: 303 });
    res.cookies.set("sess", session, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return res;
  }
}