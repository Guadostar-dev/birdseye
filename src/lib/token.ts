import { SignJWT, jwtVerify } from "jose";
import { SESSION_SECRET } from "./constants";

const encoder = new TextEncoder();

export type Session = {
  sub: string;
  username: string;
};

function secretKey() {
  return encoder.encode(SESSION_SECRET);
}

export async function signSession(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const username = typeof payload.username === "string" ? payload.username : payload.sub;
    if (!username) return null;
    return { sub: String(payload.sub || username), username };
  } catch {
    return null;
  }
}
