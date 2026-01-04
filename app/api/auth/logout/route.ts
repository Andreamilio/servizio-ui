import { NextResponse } from "next/server";
import { readSession } from "@/app/lib/session";

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

  // Usa path relativo - Next.js risolverà automaticamente l'URL corretto
  const res = NextResponse.redirect(redirectPath, { status: 303 });

  // Clear session cookie
  res.cookies.set("sess", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}