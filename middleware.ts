import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NOTE: Next.js middleware runs on the Edge runtime.
// The Edge runtime does NOT support Node.js built-in modules like `crypto`.
// For the prototype we only gate access by checking if the session cookie exists.
// Real verification is performed server-side in pages / route handlers.

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permetti accesso a pagine pubbliche
  if (pathname === "/" || pathname === "/loginhost-tech" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Per /app/* richiede sessione
  if (pathname.startsWith("/app/")) {
    const sess = req.cookies.get("sess")?.value;
    if (!sess) {
      // NON usare req.nextUrl.clone() perché su Render contiene l'URL interno (localhost:10000)
      // Costruisci sempre l'URL manualmente usando gli header del proxy
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
      const protocol = req.headers.get('x-forwarded-proto') || 'https';
      
      if (host) {
        const absoluteUrl = `${protocol}://${host}/?next=${encodeURIComponent(pathname)}`;
        return NextResponse.redirect(absoluteUrl);
      }
      // Fallback: usa il path relativo (meglio che crashare)
      return NextResponse.redirect(`/?next=${encodeURIComponent(pathname)}`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
}