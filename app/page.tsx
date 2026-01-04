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
    // Usa path relativo per il redirect
    const redirectUrl = next ? `/?err=pin&next=${encodeURIComponent(next)}` : "/?err=pin";
    return NextResponse.redirect(redirectUrl);
  }

  const session = createSession(
    { role: rec.role, aptId: rec.aptId },
    60 * 60 * 6 // 6 ore
  );

  // Usa un path relativo - Next.js risolverà automaticamente l'URL corretto
  const res = NextResponse.redirect(next);
  res.cookies.set("sess", session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return res;
}