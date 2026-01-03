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
      const url = req.nextUrl.clone();
      // Redirect a login appropriato basato sul path (per ora sempre /)
      url.pathname = "/";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
}