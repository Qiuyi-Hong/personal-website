# Moving qiuyihong.com from GitHub Pages to Vercel without downtime

Research for issue #5 (map: #2). Researched 2026-10-09. Nothing was changed: all DNS and GitHub data below comes from read-only queries.

## TL;DR

- **DNS host:** Namecheap is the registrar, and DNS is served by Namecheap BasicDNS (`dns1/dns2.registrar-servers.com`). Keep DNS there. Moving the nameservers would put Namecheap email forwarding (MX + SPF) at risk and gains us nothing.
- **Records:** apex `@` gets an **A record** set to the IP on the Vercel domain card (often `76.76.21.21`; newer projects may get another, e.g. `216.198.79.1`). `www` gets a **CNAME** to the **project-specific** target on the card (e.g. `d1d4fc829fe7bc7c.vercel-dns-017.com`). Delete all four GitHub A records. Copy values from the card, not from guides.
- **Zero downtime:** lower the TTLs to 1 min, then add both hosts to the Vercel project while DNS still points at GitHub. Next, **pre-generate the TLS cert** through DNS-01 TXT records and check it with `curl --resolve`. Only then flip the A and CNAME records. Leave the old Pages site alone until the flip is confirmed, because it is the rollback.
- **Canonical:** keep **www**. It is Vercel's own recommendation and is already our canonical (GitHub 301s apex to www today), so URLs and the search index don't change. On Vercel, set `qiuyihong.com` to redirect to `www.qiuyihong.com` with a permanent code (308 or 301).
- **Old repo:** after cutover, remove the custom domain from the old repo's Pages settings (or unpublish Pages). **Keep** the `_github-pages-challenge-qiuyi-hong` TXT record forever, so the domain stays verified to our GitHub account and can't be taken over.

## 1. Current state (observed)

| Item | Value | Source |
|---|---|---|
| Registrar | NameCheap, Inc. (IANA 1068), created 2024-08-17, expires 2027-08-17, `clientTransferProhibited` | `whois qiuyihong.com` |
| Nameservers | `dns1.registrar-servers.com`, `dns2.registrar-servers.com` (Namecheap BasicDNS) | `dig NS qiuyihong.com` |
| Apex A | `185.199.108–111.153`, TTL **1799** at authoritative NS | `dig @dns1.registrar-servers.com qiuyihong.com A` |
| www | CNAME `qiuyi-hong.github.io.`, TTL **1799** | same |
| AAAA | none | `dig AAAA` |
| CAA | none, so Let's Encrypt isn't restricted | `dig CAA` |
| MX | `eforward1–5.registrar-servers.com` (Namecheap email forwarding) | `dig MX` |
| TXT @ | `v=spf1 include:spf.efwd.registrar-servers.com ~all` | `dig TXT` |
| GitHub verification | `_github-pages-challenge-qiuyi-hong` TXT `32fcf83f…` | `dig TXT _github-pages-challenge-qiuyi-hong.qiuyihong.com` |
| Old Pages config | repo `Qiuyi-Hong/personal-portfolio-website`, `build_type: legacy` (branch `main` `/`), `cname: www.qiuyihong.com`, `protected_domain_state: verified`, `https_enforced: true`, LE cert for apex+www expires 2027-01-03 | `gh api repos/Qiuyi-Hong/personal-portfolio-website/pages` |
| HTTP behaviour | `http://` and `https://qiuyihong.com` → 301 → `https://www.qiuyihong.com/`. No HSTS header. | `curl -sI` |

TTL 1799/1800 is Namecheap's "Automatic" default of 30 min. BasicDNS lets you pick TTLs of 1, 5, 20, 30 or 60 min ([Namecheap: host records](https://www.namecheap.com/support/knowledgebase/article.aspx/434/2237/how-do-i-set-up-host-records-for-a-domain), [Namecheap: BasicDNS](https://www.namecheap.com/support/knowledgebase/article.aspx/923/10/what-is-the-difference-between-your-basic-and-backupdns)).

No HSTS and no CAA means there are no browser-pinning or CA-restriction surprises during the flip.

## 2. What Vercel wants

- **Apex domains use an A record and subdomains use a CNAME.** "Each project has a unique CNAME record e.g. `d1d4fc829fe7bc7c.vercel-dns-017.com`" ([Vercel: Add a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)).
- **A value:** "for most projects" it is `76.76.21.21`, but "Always use the value shown in your project's domain card". Newer projects may get a pooled address such as `216.198.79.1`. Older guides list other IPs, so don't use those ([Vercel KB: A record and CAA](https://vercel.com/kb/guide/a-record-and-caa-with-vercel)).
- **Remove conflicting records.** "Check for conflicting A, AAAA, or CNAME records for the same hostname", and "Make sure to remove any outdated records" ([Add a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Troubleshooting](https://vercel.com/docs/domains/troubleshooting)). In practice that means all four GitHub A records have to go. A mixed set would round-robin between GitHub and Vercel.
- **IPv6:** Vercel can't be the target of an AAAA record from a third-party DNS host ([Troubleshooting: IPv6](https://vercel.com/docs/domains/troubleshooting#ipv6-support)). We have none, so nothing to do.
- **Nameservers aren't required.** "Changing only the website's A or CNAME record at your current DNS provider does not require moving the rest of your DNS records" ([Add a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)). Vercel nameservers are only needed for wildcard certs, which we don't need.
- **Certificates:** Let's Encrypt. Non-wildcard domains use **HTTP-01**, so a cert is normally issued only *after* DNS points at Vercel ([Vercel: Working with SSL](https://vercel.com/docs/domains/working-with-ssl)). That leaves a short window where HTTPS to Vercel has no valid cert. The fix is **pre-generation** through DNS-01 TXT challenges ([Vercel: Pre-generate SSL certs](https://vercel.com/docs/domains/pre-generating-ssl-certs), [`vercel certs`](https://vercel.com/docs/cli/certs)).
- **TTL:** "we recommend updating your existing DNS record to 'lower' the TTL (for example 60 seconds) and waiting for the old TTL to expire" ([Troubleshooting: propagation](https://vercel.com/docs/domains/troubleshooting#dns-record-propagation-times)).
- **Domain redirects:** set these per domain in Project → Settings → Domains → Edit → "Redirect to" ([Deploying & redirecting](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting)). The status code can be 301, 302, 307 or 308 (`redirectStatusCode` in the [REST API](https://vercel.com/docs/rest-api/projects/add-a-domain-to-a-project)).
- **Assignment:** a domain added to a project "is automatically applied to your latest production deployment" ([Deploying & redirecting](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting)). The API refuses to add a domain "because the latest production deployment for the project was not successful", so a green production deploy has to exist first.

## 3. Cutover sequence

Before you start, the Next.js site should be deployed to production on Vercel and checked on its `*.vercel.app` URL.

**T-1 day or more: preparation (no user impact)**

1. **Snapshot the zone.** In Namecheap → Domain List → Manage → Advanced DNS, screenshot every host record. That snapshot is the rollback plan. Never touch the MX, SPF TXT, or `_github-pages-challenge-qiuyi-hong` TXT records.
2. **Lower the TTLs.** Set the apex `A` ×4 and the `www` CNAME to **1 min**. Then wait at least **30 min** (the old 1800 s TTL) before any flip. Check that the authoritative answer shows `60`:
   ```bash
   dig @dns1.registrar-servers.com qiuyihong.com A +noall +answer
   dig @dns1.registrar-servers.com www.qiuyihong.com CNAME +noall +answer
   ```
3. **Add the domains in Vercel.** In Project → Settings → Domains, add `www.qiuyihong.com`, then add `qiuyihong.com` and set it to **Redirect to `www.qiuyihong.com`, 308** (or 301 to match GitHub). Both will show "Invalid Configuration", which is expected and doesn't affect live traffic. **Copy the exact A IP and CNAME target off the domain cards.** If Vercel asks for a `_vercel` TXT, the domain is claimed by another Vercel account, so add that TXT first ([Add a domain: verify access](https://vercel.com/docs/domains/working-with-domains/add-a-domain#verify-domain-access)).
4. **Pre-generate the TLS cert (DNS-01).** You can use the dashboard: team Domains → `qiuyihong.com` → SSL Certificates → "Pre-generate SSL certificates". That option only shows up when no cert exists yet and the domain belongs to a team. Or use the CLI:
   ```bash
   vercel certs issue www.qiuyihong.com qiuyihong.com --challenge-only   # prints TXT challenges
   # add them in Namecheap: hosts "_acme-challenge" and "_acme-challenge.www", TTL 1 min
   dig TXT _acme-challenge.qiuyihong.com +short
   dig TXT _acme-challenge.www.qiuyihong.com +short
   vercel certs issue www.qiuyihong.com qiuyihong.com                    # issues the cert
   vercel certs ls
   ```
   Sources: [Pre-generate SSL certs](https://vercel.com/docs/domains/pre-generating-ssl-certs), [KB: zero-downtime migration](https://vercel.com/kb/guide/zero-downtime-migration).
5. **Test Vercel before touching DNS.** Use `--resolve` to bypass DNS:
   ```bash
   VIP=76.76.21.21            # replace with the IP on the apex domain card
   curl -sI https://qiuyihong.com     --resolve qiuyihong.com:443:$VIP       # expect 308 -> https://www.qiuyihong.com/
   curl -sI https://www.qiuyihong.com --resolve www.qiuyihong.com:443:$VIP   # expect 200, server: Vercel
   ```
   Any TLS error here means you stop and don't flip.

**T-0: the flip (one sitting in Namecheap Advanced DNS)**

6. **Change `www` first, then the apex.** Edit `www` CNAME `qiuyi-hong.github.io.` to `<card CNAME target>` (1 min TTL). Delete all four `185.199.x.153` A records and add `A @ <card IP>` (1 min TTL). Doing both within a minute or two is fine. While resolvers still have old answers cached they keep hitting GitHub, which still serves the old site, so either answer gives a valid page and valid TLS.
7. **Verify** that the authoritative servers answer first, then public resolvers, then HTTP:
   ```bash
   dig @dns1.registrar-servers.com qiuyihong.com A +short
   dig @dns1.registrar-servers.com www.qiuyihong.com CNAME +short
   dig @1.1.1.1 qiuyihong.com A +short;  dig @8.8.8.8 www.qiuyihong.com +short
   curl -sI http://qiuyihong.com        # 308 -> https://qiuyihong.com/ or www, server: Vercel
   curl -sI https://qiuyihong.com       # 308 -> https://www.qiuyihong.com/
   curl -sI https://www.qiuyihong.com   # 200, server: Vercel, x-vercel-id present
   echo | openssl s_client -connect www.qiuyihong.com:443 -servername www.qiuyihong.com 2>/dev/null \
     | openssl x509 -noout -issuer -subject -ext subjectAltName
   ```
   The Vercel domain cards should both show "Valid Configuration".
8. **Rollback, if needed.** Put the snapshot records back. With a 1 min TTL that takes effect within minutes, and GitHub Pages is still configured.

**T+1 day or more: clean up**

9. **Put the TTLs back** to Automatic (30 min). Delete the `_acme-challenge*` TXT records only once the domain cards show valid. After that, renewals use HTTP-01 through Vercel, which needs no TXT. (Vercel's guidance only says keep `_acme-challenge` NS delegations, which are for wildcards. Plain TXT challenge leftovers aren't needed.)
10. **Retire the old Pages site.** See §4.

## 4. The old repo's GitHub Pages and CNAME, and takeover protection

- **Order matters.** Remove the custom domain from GitHub only **after** DNS has moved and been verified. If you remove it first, GitHub returns 404 for any visitor still resolving to GitHub IPs, which is downtime, and it also throws away the rollback path.
- **How to remove it.** In `personal-portfolio-website` → Settings → Pages → Custom domain → **Remove**. For branch-based (legacy) builds the custom-domain setting is backed by the `CNAME` file in the source branch. GitHub commits that file when you save a domain ([GitHub: Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)), so check the `CNAME` file is gone afterwards, or delete it yourself. Then either unpublish Pages or archive the repo, and update the repo's `homepageUrl` (it currently says `https://www.qiuyihong.com`).
- **Takeover risk.** GitHub warns: "If your GitHub Pages site is disabled but has a custom domain set up, it is at risk of a domain takeover", and takeovers can happen "after any other change which unlinks the custom domain or disables GitHub Pages while the domain remains configured for GitHub Pages and is not verified" ([GitHub: Verifying your custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)). The real danger is any DNS record still pointing at GitHub while no repo claims the name. After step 6 none remain, but **all four** GitHub A records must be gone, along with any leftover `*.github.io` CNAMEs.
- **Keep the verification TXT.** `qiuyihong.com` is already verified on the GitHub account (`protected_domain_state: verified`). Verification "stops other GitHub users from taking over your custom domain" and "any immediate subdomains are also included". GitHub's instruction: "To make sure your custom domain remains verified, keep the TXT record in your domain's DNS configuration". So **keep `_github-pages-challenge-qiuyi-hong` TXT** after the migration. It costs nothing and protects against a future DNS mistake.
- **Never add a wildcard** (`*.qiuyihong.com`) record. GitHub notes that wildcards leave deeper subdomains open to takeover even when the domain is verified.

## 5. Apex or www as canonical

| | **www canonical** (apex → www) | **apex canonical** (www → apex) |
|---|---|---|
| DNS for the serving host | CNAME to Vercel, so Vercel can re-steer traffic (DDoS, performance) without our DNS changing | A record pinned to an anycast IP. Vercel supports it fully but has "less control over incoming traffic" |
| Vercel's position | **Recommended**: "We recommend using the `www` subdomain as your primary domain" ([Deploying & redirecting](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting)) | Supported |
| Continuity with today | **Same as now.** GitHub already 301s apex → www, so indexed URLs, backlinks and canonical tags stay as they are | Reverses the existing 301. Search engines must re-learn the canonical, and the old www → apex hop gets added to every existing link |
| Cookies | Scoped to `www` by default, so they don't leak to other subdomains | Cookies set on the apex with `Domain=` reach every subdomain |
| UX | Chrome hides `www` anyway. Apex visitors pay one cached 308 hop | Shorter URL, no hop for apex typers |

**Recommendation: keep `www.qiuyihong.com` canonical.** It matches Vercel's guidance and the current setup, so the migration doesn't change any public URL. On Vercel, make `qiuyihong.com` a domain redirect to `www.qiuyihong.com` with a permanent code: 308, or 301 to match GitHub exactly. In the Next.js app, set `metadataBase` and the canonical URLs to `https://www.qiuyihong.com`.

## Open items and caveats

- The exact A IP and CNAME target are only known once the Vercel project exists. Read them from the domain card.
- Dashboard pre-generation needs the domain to sit under a team, and Hobby accounts are teams. If the button is missing, use `vercel certs issue … --challenge-only`.
- Stay on Namecheap BasicDNS. Namecheap email forwarding (MX `eforward*`) depends on it, and moving the nameservers to Vercel would require recreating those records ([Add a domain warning](https://vercel.com/docs/domains/working-with-domains/add-a-domain)).
