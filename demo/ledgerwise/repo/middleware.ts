import { NextRequest, NextResponse } from "next/server";

// Allowed origins are pulled from env at boot (comma-separated). An empty
// list rejects all cross-origin requests — safer default than `*` during
// misconfiguration. PCI DSS 1.3.2 / 4.x: no open CORS on cardholder APIs.
const ALLOWED_ORIGINS = (process.env.LEDGERWISE_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | null): origin is string {
  return origin !== null && ALLOWED_ORIGINS.includes(origin);
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const origin = req.headers.get("origin");

  // Strict CORS: only echo back an origin we know about. No wildcard.
  if (isAllowedOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Idempotency-Key",
    );
  }

  // Baseline security headers (PCI DSS 6.4.x / defence in depth).
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; frame-ancestors 'none'",
  );

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
