import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "vault_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Security headers applied to all responses
  const res = NextResponse.next();

  res.headers.set("X-Content-Type-Options", "nosniff");
  if (pathname.startsWith("/admin")) {
    res.headers.set("X-Frame-Options", "DENY");
  }
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Strict-Transport-Security only in production
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // Content-Security-Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' fonts.gstatic.com",
    "connect-src 'self' https://auth.farcaster.xyz https://api.farcaster.xyz https://base-mainnet.g.alchemy.com https://eth-mainnet.g.alchemy.com https://sepolia.base.org https://mainnet.base.org https://*.neon.tech wss://*.neon.tech",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE);
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Check session validity by forwarding the cookie to the session API
    try {
      const sessionRes = await fetch(`${req.nextUrl.origin}/api/auth/session`, {
        headers: { cookie: `${SESSION_COOKIE}=${sessionCookie.value}` },
      });
      const json = await sessionRes.json();
      if (!json?.user || json.user.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Apply to all routes except static files, API routes, and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
