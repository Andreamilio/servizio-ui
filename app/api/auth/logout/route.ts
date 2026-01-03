import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Use the current request origin so it works both locally and on Vercel
  const url = new URL(req.url);
  url.pathname = "/";
  url.search = "";
  url.hash = "";

  const res = NextResponse.redirect(url, { status: 303 });

  // Clear session cookie
  res.cookies.set("sess", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}