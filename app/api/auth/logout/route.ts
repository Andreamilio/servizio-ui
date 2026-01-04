import { NextResponse } from "next/server";
import { readSession } from "@/app/lib/session";

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