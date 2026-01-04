import Link from "next/link";

export default function LoginPage({ searchParams }: any) {
  const next = typeof searchParams?.next === "string" ? searchParams.next : "";
  const err = typeof searchParams?.err === "string" ? searchParams.err : "";

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-6">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Accesso Guest / Cleaner</h1>

        {err === "pin" && (
          <div className="rounded-xl bg-red-500/15 border border-red-500/20 p-3 text-sm">
            PIN non valido o scaduto
          </div>
        )}

        <form action="/api/auth/pin" method="post" className="space-y-3">
          <input type="hidden" name="next" value={next} />

          <input
            name="pin"
            inputMode="numeric"
            placeholder="Inserisci PIN"
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
          />

          <button className="w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-3 font-semibold">
            Entra
          </button>
        </form>

        <div className="text-xs opacity-60 text-center pt-4 border-t border-white/10">
          <div>Host/Tech? <Link href="/loginhost-tech" className="text-cyan-400 hover:text-cyan-300 underline">Accedi qui</Link></div>
        </div>
      </div>
    </main>
  );
}

import { NextResponse } from "next/server";
import { consumePin } from "@/app/lib/store";
import { createSession } from "@/app/lib/session";

function safeNextPath(input: unknown) {
  const next = typeof input === "string" ? input : "";
  // allow only internal app paths
  if (!next.startsWith("/")) return "/app";
  if (!next.startsWith("/app")) return "/app";
  return next;
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

  let pin = "";
  let next = "/app";

  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => null);
    pin = (body?.pin ?? "").toString().trim();
    next = safeNextPath(body?.next);
  } else {
    // Handles HTML <form method=\"post\"> submissions
    const form = await req.formData().catch(() => null);
    pin = (form?.get("pin") ?? "").toString().trim();
    next = safeNextPath(form?.get("next"));
  }

  const rec = consumePin(pin);
  if (!rec) {
    // Costruisci URL assoluto per il redirect
    const redirectPath = next ? `/?err=pin&next=${encodeURIComponent(next)}` : "/?err=pin";
    return NextResponse.redirect(getAbsoluteUrl(req, redirectPath));
  }

  const session = createSession(
    { role: rec.role, aptId: rec.aptId },
    60 * 60 * 6 // 6 ore
  );

  // Costruisci URL assoluto per il redirect (Next.js richiede URL assoluti)
  const res = NextResponse.redirect(getAbsoluteUrl(req, next));
  res.cookies.set("sess", session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return res;
}