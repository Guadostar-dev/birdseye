import { NextResponse } from "next/server";
import { PORTAL_PASSWORD, PORTAL_USERNAME, passwordsMatch } from "@/lib/config";
import { setSessionCookie, signSession } from "@/lib/session";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const password = body.password || "";

  if (!username || !password) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  }

  if (!passwordsMatch(username, PORTAL_USERNAME) || !passwordsMatch(password, PORTAL_PASSWORD)) {
    return NextResponse.json({ error: "Those details don’t match our records." }, { status: 401 });
  }

  const token = await signSession(PORTAL_USERNAME);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, username: PORTAL_USERNAME });
}
