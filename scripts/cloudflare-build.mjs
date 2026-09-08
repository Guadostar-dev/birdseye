#!/usr/bin/env node
/**
 * Cloudflare Workers Builds runs `npm run build` then `npx wrangler deploy`.
 * OpenNext's CLI also invokes `npm run build` to compile Next.js.
 *
 * This script always produces `.open-next/worker.js` so Wrangler deploys the
 * portal instead of Cloudflare's default "Hello world" Worker. When OpenNext
 * re-enters this script, we only run `next build` to avoid recursion.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const bin = (name) => path.join(process.cwd(), "node_modules", ".bin", name);

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

const invokedByOpenNext =
  process.env.NEXT_PRIVATE_STANDALONE === "true" || process.env.OPEN_NEXT_WORKER_BUILD === "1";

if (invokedByOpenNext) {
  run(bin("next"), ["build"]);
}

console.log("Building OpenNext worker for Cloudflare");
run(bin("opennextjs-cloudflare"), ["build"], { OPEN_NEXT_WORKER_BUILD: "1" });
