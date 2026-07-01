import { NextResponse } from "next/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "./lib/session";

export async function middleware(req) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = await verifySessionCookie(cookie);

  if (!isValid) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/events/:path*", "/api/worker-status"],
};
