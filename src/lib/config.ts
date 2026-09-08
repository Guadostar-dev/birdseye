import { createHash, timingSafeEqual } from "crypto";
import { PORTAL_PASSWORD, PORTAL_USERNAME, SESSION_COOKIE, SESSION_SECRET } from "./constants";

export { PORTAL_PASSWORD, PORTAL_USERNAME, SESSION_COOKIE, SESSION_SECRET };

export function passwordsMatch(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
