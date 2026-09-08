# Birds Eye Project Portal

Private, login-protected workspace for tracking projects and editing Excel tables in the browser. The interface uses Birds Eye Foods brand colours: signature red `#CC2131`, leaf red `#E31837`, navy `#1A2B4A`, pack blue `#2B55A2`, and harvest gold `#D8B059`.

## Features

- Sign-in wall before any project data is reachable
- Create, search, update, and delete projects
- Starter tracker sheet on every new project
- Upload `.xlsx`, `.xls`, or `.csv` (drag and drop or file picker)
- Live cell editing with keyboard navigation, paste from Excel, sheet tabs, and autosave
- Download the current table back as `.xlsx`

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visits land on the login page.

### Default credentials

| Field | Value |
| --- | --- |
| Username | `admin` |
| Password | `BirdsEyePortal` |

Override these with environment variables (see `.env.example`):

```bash
PORTAL_USERNAME=admin
PORTAL_PASSWORD=choose-a-strong-password
SESSION_SECRET=replace-with-a-long-random-string
```

Copy `.env.example` to `.env.local` for local development.

## Production

```bash
npm run build
npm start
```

Set a unique `SESSION_SECRET` and a strong `PORTAL_PASSWORD` before exposing the app. Locally, data is stored as JSON files under `data/`. On Cloudflare Workers it is stored in KV (`PORTAL_KV`).

## Deploy to Cloudflare Workers

This app is built with OpenNext (`@opennextjs/cloudflare`). The Worker **must** be named `birdseye` so the `WORKER_SELF_REFERENCE` service binding points at the same script Cloudflare already created for this repo. A mismatch (for example binding `birdseye-portal` while deploying `birdseye`) fails with API code 10143.

Workers Builds defaults to `npm run build` then `npx wrangler deploy`. `npm run build` generates `.open-next/worker.js` so Wrangler deploys the portal, not Cloudflare’s default Hello World Worker.

The production URL `https://birdseye.guadostar.workers.dev` only updates when **main** deploys (`npx wrangler deploy`). Pull-request builds typically run `npx wrangler versions upload`, which creates a preview version and leaves the live Hello World Worker in place until main is updated.

Recommended dashboard commands:

- **Build command:** `npm run build`
- **Deploy command (production / main):** `npx wrangler deploy`
- **Non-production deploy command:** `npx wrangler deploy` if you want branch builds to replace the live Worker, or keep `npx wrangler versions upload` for previews only

Or from your machine (with Wrangler logged in):

```bash
npm run deploy
```

Set these as Worker environment variables / secrets:

- `PORTAL_USERNAME`
- `PORTAL_PASSWORD`
- `SESSION_SECRET`
