// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function middleware(req: NextRequest) {
  // Only protect certain paths:
  const protectedPaths = ["/dashboard"];
  const { pathname } = req.nextUrl;

  if (!protectedPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  try {
    const cookieHeader = req.headers.get("cookie") || undefined;
    const res = await fetch(`${BACKEND?.replace(/\/+$/, "")}/session/me`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      // Edge runtime: no credentials option; we pass cookies manually
      cache: "no-store",
    });

    if (!res.ok) throw new Error("auth check failed");
    const data = await res.json();
    if (!data?.authenticated) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // authenticated
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard"],
};
