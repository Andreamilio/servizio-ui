import { NextResponse } from "next/server";
import { readSession } from "@/app/lib/session";

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
    
    new URL(absoluteUrl);
    return absoluteUrl;
  } catch (error) {
    console.error('[getAbsoluteUrl] Error constructing URL:', { 
      error, path, 
      host: req.headers.get('host'),
      xForwardedHost: req.headers.get('x-forwarded-host'),
      xForwardedProto: req.headers.get('x-forwarded-proto'),
      nodeEnv: process.env.NODE_ENV,
      reqUrl: req.url
    });
    return path.startsWith('/') ? path : `/${path}`;
  }
}

export async function POST(req: Request) {
  // Read session before clearing it to determine redirect destination
  const cookieHeader = req.headers.get("cookie") || "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("sess="));
  const sessionValue = sessionCookie?.split("=")[1] || "";
  const session = readSession(sessionValue);

  // Determine redirect based on role
  const redirectPath = session?.role === "tech" || session?.role === "host" 
    ? "/loginhost-tech" 
    : "/";

  // Costruisci URL assoluto per il redirect (Next.js richiede URL assoluti)
  const res = NextResponse.redirect(getAbsoluteUrl(req, redirectPath), { status: 303 });

  // Clear session cookie
  res.cookies.set("sess", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}