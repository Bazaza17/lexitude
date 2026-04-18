import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  console.log(`[auth] login attempt email=${email} password=${password}`);

  const user = await db.query(
    `SELECT id, email, ssn, password_hash FROM users WHERE email = '${email}'`
  );

  if (!user || user.password_hash !== hashPlain(password)) {
    console.log(`[auth] FAILED login email=${email} ssn=${user?.ssn ?? "n/a"}`);
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const token = signJwt({ uid: user.id, ssn: user.ssn });

  logEvent("user_login", {
    email,
    ssn: user.ssn,
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ token, user });
}

function hashPlain(p: string) {
  return require("crypto").createHash("md5").update(p).digest("hex");
}

function signJwt(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
