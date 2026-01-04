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
      try {
        const url = req.nextUrl.clone();
        // Redirect a login appropriato basato sul path (per ora sempre /)
        url.pathname = "/";
        url.searchParams.set("next", pathname);
        
        // Verifica che l'URL sia valido (su Render potrebbe essere malformato)
        const urlString = url.toString();
        try {
          new URL(urlString);
          return NextResponse.redirect(url);
        } catch {
          // Se l'URL clonato è malformato, costruiscilo manualmente
          const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
          const protocol = req.headers.get('x-forwarded-proto') || 'https';
          if (host) {
            const absoluteUrl = `${protocol}://${host}/?next=${encodeURIComponent(pathname)}`;
            return NextResponse.redirect(absoluteUrl);
          }
          // Fallback: usa il path relativo (meglio che crashare)
          return NextResponse.redirect(`/?next=${encodeURIComponent(pathname)}`);
        }
      } catch (error) {
        // Se anche il clone fallisce, costruisci manualmente
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        if (host) {
          const absoluteUrl = `${protocol}://${host}/?next=${encodeURIComponent(pathname)}`;
          return NextResponse.redirect(absoluteUrl);
        }
        // Ultimo fallback
        return NextResponse.redirect(`/?next=${encodeURIComponent(pathname)}`);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
}