import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./config";
import { readSessionToken } from "./session";

export async function requireApiSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { session: null, error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  const session = await readSessionToken(token);
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Session expired." }, { status: 401 }) };
  }
  return { session, error: null };
}
