# Deploying

Production is **Cloudflare Workers**, deployed from `main` by GitHub Actions.
Media is **R2** (zero egress — see `spec/decisions/`).

## One-time setup

Two things need a human, because neither is available through the API:

**1. Enable R2 in the dashboard.** A fresh account returns
`Please enable R2 through the Cloudflare Dashboard` on any R2 call. Dashboard → R2 → enable.
Then create the bucket (or let the MCP do it) and uncomment the `r2_buckets` block in
`wrangler.jsonc`.

**2. Add two GitHub repo secrets** — Settings → Secrets and variables → Actions:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Dashboard → My Profile → API Tokens → Create → **Edit Cloudflare Workers** template |
| `CLOUDFLARE_ACCOUNT_ID` | Dashboard → Workers & Pages → right sidebar |

That's it. The next push to `main` deploys.

## What the pipeline does

| Trigger | Job | Effect |
|---|---|---|
| push / PR | `test` | interpolation unit tests + fixture conformance. Gates everything |
| pull request | `preview` | `wrangler versions upload` → a **preview URL**, not promoted |
| push to `main` | `deploy` | `wrangler deploy` → production |

**The preview job is the review mechanism, not a nicety.** Craft is the differentiator
(`decisions/0009`), and craft cannot be reviewed from a diff. Every PR that changes anything
visual should say in its description which story to open and what to look at.

## Local

```bash
npm run dev        # Next dev server — fastest feedback
npm run preview    # build + run in the workerd runtime (what production actually is)
npm run deploy     # build + deploy from your machine (needs wrangler auth)
```

`dev` runs in Node; `preview` runs in `workerd`. **Verify anything runtime-sensitive with
`preview`** — that's the difference that bites.

## Alternative: Workers Builds

Instead of GitHub Actions, the repo can be connected directly in the Cloudflare dashboard
(Workers & Pages → Create → connect a repo). Cloudflare then builds and deploys on push, and
opens a configuration PR automatically.

Either works. Actions is here because it needs no dashboard OAuth and lives in version control;
if Workers Builds is connected later, delete the `preview` and `deploy` jobs so they don't both
deploy.

## ⚠ The filesystem is a build-time capability

The renderer originally read `fixtures/` with `node:fs` on each request. That works in
`next dev` (Node) and **fails silently in production** — `workerd` has no filesystem, so the
index came up empty and every story 404'd, while the build logs looked perfectly healthy.

Trips are now baked into the bundle by `scripts/build-trips.ts` (wired to `prebuild`/`predev`).

**The general rule: anything the renderer needs at request time must be in the bundle, or in
R2/KV/D1.** `npm run preview` (or `wrangler dev`) runs the real `workerd` runtime and catches
this class of bug; `npm run dev` does not.

## Notes

- Build output: `.open-next/worker.js` + `.open-next/assets` (~4.8 MB of assets today).
  Worker bundle is far under the 10 MB paid-plan limit.
- `compatibility_flags: ["nodejs_compat"]` is required by the adapter, along with a
  compatibility date of 2024-09-23 or later.
- Every route is static today, so there is no server-side work in production yet.
