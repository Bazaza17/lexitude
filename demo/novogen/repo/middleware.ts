// NovoGen Health — edge middleware.
// Intended to add security headers and session handling, but most of it is commented out.

import { NextResponse } from "next/server";

export function middleware() {
  const res = NextResponse.next();

  // Wide-open CORS with credentials — applies to every route including /api/patients/*.
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  // TODO: session timeout / automatic logoff (HIPAA §164.312(a)(2)(iii))
  // TODO: content-security-policy
  // TODO: strict-transport-security

  return res;
}

export const config = {
  matcher: "/:path*",
};
