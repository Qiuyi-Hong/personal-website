# Railway deployment and domain cutover

Research for [#9](https://github.com/Qiuyi-Hong/personal-website/issues/9) (map: [#2](https://github.com/Qiuyi-Hong/personal-website/issues/2)). Gathered 2026-10-16 from Railway docs, Railpack source, GitHub Pages docs, Namecheap docs and live DNS. Nothing was created or changed on Railway or in DNS.

## Recommendations

| Question | Recommendation |
| --- | --- |
| Topology | **One service.** Express serves the API and the built `frontend/dist`. |
| Build | Root directory `/`. Build command `npm run ci:all && npm run build`. Start command `npm start`. |
| Watch paths | None for v1. Every push to `main` rebuilds, which is what one service needs. |
| Cost | About **$5/month flat** on Hobby. Expected usage is about $1–2, which the $5 subscription covers. |
| PR environments | Turn them on. Keep a Railway-provided domain on the production service so PR environments get URLs. |
| Canonical host | Keep `www.qiuyihong.com` canonical, as it is today. `qiuyihong.com` returns 301 to www. |
| Apex DNS | Namecheap **ALIAS** record on `@`. Don't use a CNAME on `@` because it breaks the email-forwarding MX records. |
| Old Pages site | Remove the custom domain, unpublish, and archive the repo. Keep the `_github-pages-challenge` TXT record. |

## Current state (measured)

`dig` against the authoritative nameservers and the GitHub Pages API on 2026-10-16:

- **DNS provider and registrar: Namecheap BasicDNS.** The NS records are `dns1/dns2.registrar-servers.com`, and `whois` gives the registrar as NameCheap, Inc. No DNSSEC (no DS record).
- `qiuyihong.com`: four `A` records → `185.199.108–111.153` (GitHub Pages). No AAAA. TTL 1799 s.
- `www.qiuyihong.com`: `CNAME` → `qiuyi-hong.github.io.` TTL 1799 s.
- **Email forwarding is live on the apex.** MX → `eforward1–5.registrar-servers.com`, TXT `v=spf1 include:spf.efwd.registrar-servers.com ~all`. The cutover must not break these.
- `_github-pages-challenge-qiuyi-hong.qiuyihong.com` TXT is present, which means the domain is verified on the GitHub account.
- Pages API (`repos/Qiuyi-Hong/personal-portfolio-website/pages`): `cname: www.qiuyihong.com`, `protected_domain_state: verified`, `https_enforced: true`, certificate for `www.qiuyihong.com` + `qiuyihong.com` until 2027-01-03, legacy build from `main` `/`.
- Live behaviour: `https://qiuyihong.com` → `301` → `https://www.qiuyihong.com/`, which serves `200` from GitHub.com.
- Railway account `qiuyi-hong` has one personal workspace with one project (`menucee`). The MCP API doesn't show the plan tier. Check that it is **Hobby** (or Pro) in the dashboard before relying on the limits below.

## 1. One service or two

| | One service (Express serves `dist` + `/api`) | Two services (static frontend + Express API) |
| --- | --- | --- |
| Cost | One container: Node idle RAM only. | Two containers. Railpack serves a Vite SPA with Caddy ([Railpack Node docs](https://railpack.com/languages/node)), so a second always-on process. Still under $5 on Hobby (see §3). |
| CORS | None. Same origin. | The frontend at `www` calls the API at another host (e.g. `api.qiuyihong.com` or `*.up.railway.app`), so the backend needs a CORS allow-list per environment, including PR env URLs. Browsers can't use the private network ([Domains: private domain scope](https://docs.railway.com/networking/domains/working-with-domains#private-domain-scope)). |
| Custom domains | Hobby allows **2 custom domains per service** ([Domains: important considerations](https://docs.railway.com/networking/domains/working-with-domains#important-considerations)): exactly apex + www. | Frontend uses its 2 for apex + www. The API needs a third domain on the second service. |
| CDN / caching | Railway's CDN is per service and free on all plans ([CDN](https://docs.railway.com/networking/cdn)). Hashed `assets/*` are cached by content type even with no headers. HTML is cached only if Express sends `max-age`/`s-maxage` (Auto mode). JSON is cached only with an explicit `max-age`/`s-maxage`. One service gives one place to tune, and the default "purge HTML on each successful deploy" keeps the new HTML in step with the new asset hashes. | The same CDN is available on both services. Nothing extra is gained for a site this size. |
| Deploys | One deploy, so API and UI versions never drift. | Two deploys, which can drift. Watch paths become necessary. |
| PR environments | One service per PR env. | Two per PR env, and the frontend needs the PR API URL wired in through a reference variable. |

**Recommendation: one service.** It needs no CORS, fits the Hobby domain limit, and keeps one deploy and one cache to reason about. Express should send `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` (Vite hashed files) and a short `s-maxage` with `stale-while-revalidate` for the contributions JSON. Railway's guide shows this pattern ([Cache headers + CDN guide](https://docs.railway.com/guides/cache-headers-cdn#complete-example-express-with-per-route-cache-headers)). Enable **CDN Caching** under Settings → Edge.

## 2. Build and start commands

Facts:

- Railway builds with **Railpack** by default ([Build configuration](https://docs.railway.com/builds/build-configuration)). For Node, Railpack runs the root `build` script and starts with the root `start` script, then `main`, then `index.js` ([Railpack Node docs](https://railpack.com/languages/node)).
- With no lockfile override, the npm install step runs **`npm install`** at the root, not `npm ci` ([railpack `package_manager.go`](https://github.com/railwayapp/railpack/blob/main/core/providers/node/package_manager.go), "we default to npm install to avoid build failures"). It does **not** install `frontend/` or `backend/`.
- Build env sets `NODE_ENV=production` **and** `NPM_CONFIG_PRODUCTION=false` ([railpack `node.go` `GetNodeEnvVars`](https://github.com/railwayapp/railpack/blob/main/core/providers/node/node.go)). In npm, `production === false` puts `dev` back into the include list ([npm `definitions.js` `buildOmitList`](https://github.com/npm/cli/blob/latest/workspaces/config/lib/definitions/definitions.js)), so the `--prefix` installs still get devDependencies (`vite`, `typescript`).
- Root directory: when set, all build and deploy commands run inside it ([Build configuration: root directory](https://docs.railway.com/builds/build-configuration#set-the-root-directory)). One service needs both folders, so it stays `/`. A non-root directory only makes sense for the two-service option (`/frontend`, `/backend`, the "isolated monorepo" in [Deploying a monorepo](https://docs.railway.com/deployments/monorepo)).
- Watch paths are gitignore-style patterns that skip a deploy when nothing matching changed. They always match from `/`, even with a root directory set ([Build configuration: watch paths](https://docs.railway.com/builds/build-configuration#configure-watch-paths)). They matter only with two services.
- **Config as Code (`railway.json` / `railway.toml`) is deprecated.** New services can't opt in, and the files stop being read on 2026-12-01. The replacement is IaC in `.railway/railway.ts`, applied by the CLI (`railway config plan/apply`) ([Infrastructure as Code](https://docs.railway.com/infrastructure-as-code)). Set the commands in **service settings** or in `.railway/railway.ts`, not in `railway.json`.

Root `package.json` scripts to add (`install:all` already exists per #2):

```json
{
  "scripts": {
    "install:all": "npm --prefix frontend install && npm --prefix backend install",
    "ci:all": "npm --prefix frontend ci && npm --prefix backend ci",
    "build": "npm --prefix frontend run build && npm --prefix backend run build",
    "start": "npm --prefix backend start"
  },
  "engines": { "node": "22.x" }
}
```

Railway service settings:

| Setting | Value |
| --- | --- |
| Root directory | `/` (default) |
| Build command | `npm run ci:all && npm run build` |
| Start command | `npm start` (Railpack would pick it anyway) |
| Watch paths | empty |
| Healthcheck path | `/api/health` (or whatever the backend exposes) |
| Node version | from `engines.node`, else `RAILPACK_NODE_VERSION` ([Railpack Node docs](https://railpack.com/languages/node)) |

`backend` `start` should run the compiled server, e.g. `node dist/index.js`. Express serves `../frontend/dist` and falls back to `index.html` for SPA routes. Commit `package-lock.json` in the root, `frontend/` and `backend/` so `npm ci` is deterministic.

**Risk to verify on the first deploy:** Railpack copies the dependency layer from `/app/node_modules` only, and copies the build output with the exclude pattern `node_modules` ([railpack `node.go`](https://github.com/railwayapp/railpack/blob/main/core/providers/node/node.go), `GetInstallFolder` in `package_manager.go`). BuildKit excludes match like `.dockerignore`, so a bare `node_modules` matches only at the root and `backend/node_modules` should survive into the image. I read this in the source but did not test it. If the app crashes at start with `Cannot find module 'express'`, use either fix:

- bundle the backend into one file (`esbuild`/`tsup`) so it needs no runtime `node_modules`;
- add a small `Dockerfile`, which Railway always prefers over Railpack ([Config as Code: builder](https://docs.railway.com/config-as-code/reference#specify-the-builder)).

## 3. Estimated monthly cost (Hobby)

Pricing ([Pricing plans](https://docs.railway.com/pricing/plans)):

- Hobby is a $5/month subscription that includes $5 of usage. You pay `max($5, usage)`.
- RAM $10/GB/month, CPU $20/vCPU/month, egress $0.05/GB.
- **Builds are free.**
- CDN cache hits don't reach the service and don't incur egress ([CDN](https://docs.railway.com/networking/cdn#how-caching-works)).

Estimate for one Express service on a low-traffic personal site:

| Resource | Assumption | $/month |
| --- | --- | --- |
| RAM | ~0.12 GB average (Node + Express idle) | ~$1.20 |
| CPU | ~0.01 vCPU average | ~$0.20 |
| Egress | ~2 GB, much of it absorbed by the CDN | ~$0.10 |
| PR envs | a few PRs open for a day or two each | ~$0.10 |
| **Usage** | | **~$1.60** |
| **Bill** | usage < $5 included | **$5.00** |

Two services would add about $0.5–1 of usage for the Caddy container and still bill **$5**. The bill exceeds $5 only if usage passes $5, for example with RAM held near 0.4 GB around the clock or heavy uncached traffic. Set a usage limit in the dashboard as a guard.

**Serverless (app sleeping)** is not recommended. The bill is already the $5 floor, and the first request after sleep can be slow or return `502` ([Serverless caveats](https://docs.railway.com/deployments/serverless#caveats)). A recruiter would be the one to hit that request. Outbound calls to GitHub would also keep the service awake.

## 4. PR environments

From [Environments: PR environments](https://docs.railway.com/environments#pr-environments):

- Enable in **Project Settings → Environments**. Railway creates a temporary environment when a PR opens and deletes it when the PR is merged or closed.
- **Domains:** PR env services get a domain automatically **only if** the base-environment service has a Railway-provided domain. Keep the `*.up.railway.app` domain on production alongside the custom domains.
- Variables are copied from the base environment and stay scoped to the PR env ([Managing secrets: preview environments](https://docs.railway.com/guides/managing-secrets-on-railway#how-railway-handles-secrets-in-preview-environments)). Give the GitHub token a read-only scope.
- PRs from users outside the workspace don't deploy. Bot PRs (Dependabot, Claude Code, …) need the **Enable Bot PR Environments** toggle.
- "Focused PR environments" (deploy only affected services) is early access and irrelevant with one service.
- Cost: each open PR runs a copy of the service. With one small service that is cents per PR-day.

## 5. Domain cutover (zero or low downtime)

How Railway custom domains work ([Working with domains](https://docs.railway.com/networking/domains/working-with-domains#custom-domains)):

- Adding a custom domain gives you a **CNAME target** (e.g. `abc123.up.railway.app`) **and a TXT record**. Both are required, and the domain returns `404` until the TXT verifies.
- Railway issues a Let's Encrypt certificate automatically after DNS points at it, "within an hour". Railway doesn't accept external certificates.
- For the apex, Railway supports CNAME flattening and dynamic ALIAS records, and names Namecheap among the providers that support it ([Adding a root domain](https://docs.railway.com/networking/domains/working-with-domains#adding-a-root-domain)).
- Namecheap says **not** to put a CNAME on `@` because it breaks MX/email ([Namecheap: CNAME](https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/)).
- Namecheap's **ALIAS** record "can coexist with other records on that name", has a TTL of 1 or 5 min, and conflicts with A/CNAME/URL-redirect records on the same host ([Namecheap: ALIAS](https://www.namecheap.com/support/knowledgebase/article.aspx/10128/2237/how-to-create-an-alias-record/)).
- Namecheap's URL Redirect record can't redirect HTTPS on the same domain ([Namecheap: URL redirect](https://www.namecheap.com/support/knowledgebase/article.aspx/385/2237/how-to-redirect-a-url-for-a-domain/)), so it isn't used for the apex.

Today GitHub serves www and 301s the apex to it ([GitHub Pages: managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)). Keep that shape: **www canonical, apex → 301 → www.**

### Steps

1. **A day before, lower the TTLs.** In Namecheap Advanced DNS, set the `www` CNAME and the four apex `A` records to 1 min (currently 1799 s). Wait at least 30 min (the old TTL) before step 4.
2. **Deploy and test on Railway's own domain.** Generate the `*.up.railway.app` domain, deploy `main`, and check pages, `/api/*`, the CDN (`x-cache: HIT` on a second request for `/assets/...`) and healthchecks.
3. **Add both custom domains in Railway**, without touching traffic yet: `www.qiuyihong.com` and `qiuyihong.com`, target port = the Express port. Copy each CNAME target and TXT record.
4. **Add only the two Railway TXT records** in Namecheap. They don't affect traffic. Wait for Railway to show the TXT as verified, if it reports that before the CNAME.
5. **Switch www.** Edit the `www` CNAME from `qiuyi-hong.github.io.` to the Railway target. Visitors with cached DNS keep getting the GitHub site until the 1-min TTL runs out. Watch Railway until the domain shows a green check and the certificate is issued (expected minutes, at most ~1 h). The gap is HTTPS errors for new visitors on www between the DNS flip and certificate issuance. Do it at a quiet hour.
6. **Switch the apex.** Delete the four `A` records and add an `ALIAS` `@` → the apex's Railway target (TTL 1 min). **Leave the MX and SPF TXT records alone.** Until Railway's apex certificate is issued, apex HTTPS fails, while www works.
7. **Redirect apex → www on Railway.** Use an Edge Rule: `http.host eq qiuyihong.com` → `redirect` `host: www.qiuyihong.com`, `301`, keep path and query ([Edge rules](https://docs.railway.com/networking/edge-rules#choose-an-action)). Edge rules need "a plan with an edge-rule allowance", and I could not confirm the Hobby allowance. If the editor shows 0, use a one-line Express middleware instead: `if (req.hostname === 'qiuyihong.com') return res.redirect(301, 'https://www.qiuyihong.com' + req.originalUrl)`.
8. **Verify.** Run `curl -sI https://qiuyihong.com` (301 → www), `curl -sI https://www.qiuyihong.com` (200, no `server: GitHub.com`), `dig MX qiuyihong.com` (still eforward), and send a test email to the forwarded address.
9. **Raise the TTLs back** to Automatic (30 min) once stable.

**Rollback:** while the TTLs are 1 min, point `www` back at `qiuyi-hong.github.io.` and restore the four `A` records. Do this before step 10, because the old Pages site still has the custom domain configured and its certificate valid until 2027-01-03.

Optional zero-gap variant: Railway can't pre-issue a certificate before DNS points at it. Moving DNS to Cloudflare with the proxy on ([Adding a root domain with www to Cloudflare](https://docs.railway.com/networking/domains/working-with-domains#adding-a-root-domain-with-www-subdomain-to-cloudflare)) would avoid the certificate gap. It means migrating the nameservers and the email forwarding, which is more risk than a few minutes of possible TLS errors on a personal site. Not recommended.

## 6. The old GitHub Pages site

After step 8 has been stable for a day or two:

1. **Remove the custom domain** in `personal-portfolio-website` → Settings → Pages → Custom domain → **Remove**, and delete the `CNAME` file from the repo. Otherwise GitHub still claims `www.qiuyihong.com`. The docs warn that a disabled Pages site that still has a custom domain configured is at risk of domain takeover ([Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)).
2. **Unpublish** with Pages → "Unpublish site". This removes the deployment and leaves the repo content untouched ([Unpublishing a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site)). `qiuyi-hong.github.io/personal-portfolio-website` then stops serving. If anything links there, leave the site published without the custom domain and replace its `index.html` with a meta-refresh to `https://www.qiuyihong.com`.
3. **Keep the `_github-pages-challenge-qiuyi-hong` TXT record.** Verification "stops other GitHub users from taking over your custom domain", and the docs say to keep the TXT so it stays verified ([Verifying your custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)).
4. **Archive the repo.** It stays the source for publications, CV PDF and avatar per #2.

## Could not determine

- **The account's current Railway plan.** `whoami` and `list-workspaces` don't expose it. The 2-domains-per-service limit and the $5 math assume Hobby.
- **Whether Hobby includes any Edge Rules.** The docs say only "a plan with an edge-rule allowance". The Express redirect fallback covers it.
- **Whether `backend/node_modules` survives Railpack's deploy layer.** I read the source but did not test it. See the risk note in §2.
- **Whether Railway's domain check shows green for a Namecheap ALIAS.** Railway says ALIAS is supported. Its UI checks for the CNAME target, so the indicator may lag even while traffic and the certificate work.
