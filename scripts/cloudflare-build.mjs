#!/usr/bin/env node
/**
 * Cloudflare Workers Builds runs `npm run build` then `npx wrangler deploy`.
 * OpenNext's CLI also invokes `npm run build` to compile Next.js.
 *
 * On Workers CI this script produces `.open-next/worker.js` so the default
 * wrangler deploy command can find it. When OpenNext re-enters this script,
 * we only run `next build` to avoid recursion.
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

if (process.env.WORKERS_CI === "1") {
  console.log("Workers CI: building OpenNext worker for wrangler deploy");
  run(bin("opennextjs-cloudflare"), ["build"], { OPEN_NEXT_WORKER_BUILD: "1" });
}

run(bin("next"), ["build"]);
