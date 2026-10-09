# Fork strip list: what a fork of chanhdai.com must delete or rewrite

Answers [#16](https://github.com/Qiuyi-Hong/personal-website/issues/16) (map: [#2](https://github.com/Qiuyi-Hong/personal-website/issues/2)). The keep-list it checks against is [#4](https://github.com/Qiuyi-Hong/personal-website/issues/4) (`docs/research/chanhdai-port-inventory.md`). Whether to delete or leave things dormant is [#15](https://github.com/Qiuyi-Hong/personal-website/issues/15)'s call, so every section records both: **what deleting X touches**, and **whether X can just be left unlinked**.

**Source:** the reference site's repo [ncdai/chanhdai.com](https://github.com/ncdai/chanhdai.com) at [`1951e21`](https://github.com/ncdai/chanhdai.com/tree/1951e213749f58787fc2211cb1cfdc4f386de033) (2026-09-27). It was cloned read-only on 2026-10-09 and never installed, built or run. Every count below comes from `git ls-files`, `grep` or a static import-graph walk over `src/` (it resolves `@/…` and relative imports, follows them transitively from the kept panels, and records which npm packages each file imports). Paths are relative to the repo root.

## TL;DR

- **The repo has 769 tracked files, 664 of them in `src/`.** A fork keeps about **110 `src/` files**: the transitive import closure of the 9 kept panels, theme toggle, ⌘K primitives and providers, before the analytics, sound and phone strip. **About 550 `src/` files go**, plus the 70 registry JSON files in `public/r/`.
- **Routes can't be left dormant.** Every file under `src/app/` is a public URL whether or not anything links to it, and `sitemap.ts` lists most of them. **61 of the 67 `src/app` files are out of scope.** Leaving them would publish his blog, components, game, vCard and OG images on qiuyihong.com. Non-route code (`src/features/*`, `src/registry/*`, most of `src/components/*`) *can* sit unlinked once nothing kept imports it. It still costs deps, lint, typecheck and the Bun registry build.
- **The work is the same either way: 12 kept files import out-of-scope areas.** `(app)/page.tsx`, `(app)/layout.tsx`, the root `layout.tsx`, `providers.tsx`, `site-header.tsx`, `command-menu.tsx`, `not-found.tsx`, `sitemap.ts`, `config/site.ts`, `globals.css`, `next.config.ts` and `package.json`. Whether the dead directories are then deleted or left only changes cleanup volume. It doesn't change which kept files get edited.
- **Kept panels reach into `src/registry/`.** `flip-sentences` → `text-flip`, `collapsible-animated` → `chevrons-up-down-icon`, and `copy-button` → registry `copy-button` → `icon-swap`. Move those 8 files out first, or deleting `src/registry/` breaks the profile header, every collapsible panel and every copy button.
- **Analytics loads on import.** `src/lib/openpanel.ts` runs `new OpenPanel({ clientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!, trackScreenViews: true })` at module level, and `trackEvent` reaches kept code through `copy-button.tsx`, `utils/copy.ts`, `email-item.tsx` and `keyboard-shortcuts.tsx`. Unsetting the env var isn't enough. Cut the imports.
- **Identity is wider than `TRADEMARK.md`'s checklist.** 85 non-MDX `src/` files match `chanhdai|ncdai` (141 with the 56 MDX docs). 102 tracked files point at `assets.chanhdai.com`. **14 files in the kept import closure carry identity** (2 are the marks, which get deleted; the rest get rewritten), plus the 404 game and about 12 root config/docs files. The favicons, OG image and avatar all live on his CDN, and `public/` holds nothing but `public/r/*.json`. So **we must supply our own favicon set, static OG image and avatar.**
- **Build and CI:** `build` is `pnpm registry:build && next build`, and `registry:build` is `bun run ./src/scripts/build-registry.mts && shadcn build`. **Drop the registry step, and `build` becomes `next build`.** There is no middleware or `proxy.ts`, and no `vercel.json`. `next.config.ts` has 6 rewrites and 42 redirects (12 literal plus 30 generated from a slug list), all for out-of-scope routes. CI installs Bun and runs `registry:validate`.
- **Deps:** 39 of 54 runtime deps and 16 of 41 dev deps become unused (table below). Two of them (`@number-flow/react`, `react-use`) are already imported by nothing.

## 1. Identity (everything `TRADEMARK.md` names, and what it misses)

`TRADEMARK.md` excludes from the MIT grant *"The names `chanhdai`, `ncdai`, and `chanhdai.com`"*, *"The `chanhdai` wordmark and mark, in any form, including their SVG source"*, *"Avatars, portraits, and other likenesses of me"* and *"Any presentation close enough to make a reader mistake your site for mine"*.

Its fork checklist names five places:

- `src/components/chanhdai-wordmark.tsx`
- `src/components/chanhdai-mark.tsx`
- the logotype paths in `src/components/site-footer-brand.tsx`
- `src/features/portfolio/data/`
- `src/config/site.ts`
- `src/app/manifest.webmanifest`

**Counts:**

| Measure | Count |
|---|---|
| `src/` files matching `chanhdai\|ncdai` (case-sensitive), excluding `.mdx` | **85** (39 of them in `src/registry/`) |
| …including the MDX docs | 141 (56 MDX) |
| All tracked files matching `chanhdai\|ncdai\|Chánh Đại\|Chanh Dai\|iamncdai` | 231 (70 of them `public/r/*.json`) |
| Tracked files referencing `assets.chanhdai.com` (his CDN) | 102 (91 in `src/`) |
| `src/` files mentioning `ChanhDai*` components (definitions + importers) | 18 |

**Identity-bearing files that survive the strip**, which must be rewritten rather than deleted (found by grepping the kept import closure plus the edited shell files):

| File | What's his |
|---|---|
| `src/features/portfolio/data/user.ts` | Name, bio, email/phone (base64), avatar, sketch avatar, OG image, pronunciation mp3 (8 CDN URLs) |
| `src/features/portfolio/data/{social-links,experiences,projects,awards}.ts(x)` | Handles; company logos on CDN (4 URLs in `experiences.tsx`); `ChanhDaiMark` as a project icon; his awards |
| `src/features/portfolio/data/{education,certifications,intellectual-property,tech-stack,recognition}.ts(x)` | His content (no name string, but his history) |
| `src/config/site.ts` | `SITE_INFO.url` fallback `https://chanhdai.com`, `LICENSE.url`, `SOURCE_CODE_GITHUB_*` (`ncdai/chanhdai.com`), `SPONSORSHIP_URL`, `UTM_PARAMS.utm_source: "chanhdai.com"`, `X_HANDLE`/`GITHUB_USERNAME` |
| `src/app/layout.tsx` | `authors: [{ name: "ncdai" }]`, `creator: "ncdai"`, 4 favicon/apple-touch URLs on `assets.chanhdai.com`, Twitter `site`/`creator` |
| `src/components/site-header.tsx` | Header logo `ChanhDaiMark`, wrapped in `BrandContextMenu` (copy his mark/wordmark SVG) |
| `src/components/command-menu.tsx` | `ChanhDaiMark` in Home item and footer; "Brand Assets" group (`getMarkSVG`, `getWordmarkSVG`, `/blog/chanhdai-brand`, `assets.chanhdai.com/chanhdai-brand.zip`) |
| `src/features/portfolio/components/profile-header.tsx` | Renders `ChanhDaiMarkIsometric` (his "CD" mark, the "Fig. 1." hero) |
| `src/components/icons.tsx` | `// Designed by @ncdai` (`TrustedRegistryIcon`, line 650) and his project icons |
| `src/styles/globals.css` | `@utility prose-ncdai` (line 206) |
| `src/utils/url.test.ts` | `chanhdai.com` fixtures (harmless, but they show up in a grep audit) |
| `src/components/not-found.tsx` → `src/components/daikanoid/*` | The 404 page is his "Daikanoid" game, whose `logos.ts` carries his brand |

**Deleted outright, not rewritten:** `chanhdai-mark.tsx`, `chanhdai-wordmark.tsx`, `brand-context-menu.tsx`, `site-footer-brand.tsx`, `site-footer.tsx`, `site-footer-cad.tsx`, `site-footer-built-by-spinner.tsx`, `features/portfolio/components/{chanhdai-mark-isometric,brand,profile-cover}.tsx`, `app/manifest.webmanifest`, `components/daikanoid/` and `app/game/`.

**Repo-root identity** (not in `src/`):

- `package.json`: `name: "chanhdai.com"`, `homepage`, `author`/`contributors` (`dai@chanhdai.com`), `repository`, deps `@ncdai/react-swipe-actions`, `@ncdai/react-wheel-picker`.
- `components.json`: `registries."@ncdai"`, plus `@shadcncraft` (license-key headers), `@kibo-ui`, `@react-bits`, `@soundcn` and `@bklit`.
- `next.config.ts`: `images.remotePatterns` host `assets.chanhdai.com`; `allowedDevOrigins: ["ncdai.localhost", "ncdai.local"]`.
- `portless.json`: `"name": "ncdai"`.
- `pnpm-workspace.yaml`: `minimumReleaseAgeExclude: '@ncdai/*'`.
- `eslint.config.mjs`: ignores `.ncdai/**`.
- `.gitignore`: `# ncdai` / `.ncdai`.
- `.github/FUNDING.yml`: `github: ncdai`.
- `.github/dependabot.yml`: reviewer `ncdai`.
- `README.md` (326 lines), `DEVELOPMENT.md`, `AGENTS.md`/`CLAUDE.md`, `CODE_OF_CONDUCT.md` and `TRADEMARK.md`: his docs, so rewrite or delete them.
- `LICENSE`: `Copyright (c) 2026 Chánh Đại`. **Keep it.** MIT requires the notice to stay with the copied code. `TRADEMARK.md` allows saying in plain text that the site is "based on, forked from, or inspired by chanhdai.com".

**Assets we must supply.** None exist locally: `public/` contains only `public/r/`. We need a favicon (`.ico` + light/dark SVG), an apple-touch icon, a static 1200×630 OG image (`SITE_INFO.ogImage` = `USER.ogImage` is a CDN URL; no `opengraph-image` file exists), an avatar, company logos and the CV PDF. `src/assets/fonts/*` is read only by the OG routes (`og/simple`, `og/domain` via `readFileSync`). `lib/fonts.ts` has those `localFont` calls commented out, so the fonts go with the OG routes.

**Can identity be "left unlinked"?** No. Every row above is rendered on the kept homepage, or is metadata (`layout.tsx`, `manifest`). Unlinked identity code (mark/wordmark components) can sit unused only after its 5 importers are cut: `site-header`, `command-menu`, `brand-context-menu`, `site-footer*` and `data/projects`. But `TRADEMARK.md` covers "their SVG source" wherever it lives, so keeping the files in our repo is itself a use. Delete them.

## 2. Content

| Content | Location | Count | Notes |
|---|---|---|---|
| Blog posts | `src/features/doc/content/blog/*.mdx` | **14** | Rendered by `(docs)/blog/[slug]`, RSS, llms, sitemap, ⌘K, header/bottom-nav `getAllDocs()` |
| Component docs | `src/features/doc/content/components/*.mdx` | **42** | Rendered by `(docs)/components/[slug]`, same consumers |
| Portfolio data | `src/features/portfolio/data/*` | **15 files, 2,448 lines** | In scope, so rewrite: `user` (65 lines), `social-links` (52), `tech-stack` (413), `experiences` (270), `education` (79), `projects` (158), `awards` (301), `certifications` (133), `intellectual-property` (63), `recognition` (58) and `recognition.test.ts` (52). Out of scope, so delete: `testimonials` (518, 54 CDN URLs), `timeline` (130), `insights` (148, reads OpenPanel secrets), `github-contributions` (8) |
| Site config | `src/config/site.ts` | 1 | Keep `META_THEME_COLORS`; rewrite `SITE_INFO` and `UTM_PARAMS` (or drop UTM); drop `MAIN_NAV`/`MOBILE_NAV` entries for removed routes, `LICENSE`, `SOURCE_CODE_*`, `SPONSORSHIP_URL` |
| Other data | `features/bookmark/data.tsx`, `features/craft/data.ts`, `features/sponsor/data.tsx`, `features/blocks/data/blocks.ts`, `config/registry.ts`, `config/ads.ts` | 6 | All out of scope; delete with their features |
| PWA manifest | `src/app/manifest.webmanifest` | 1 | His name, CDN icons and screenshots. Out of scope (PWA), so delete |

**Couplings inside content:**

- `recognition.test.ts` imports `AWARDS`, `CERTIFICATIONS` and `INTELLECTUAL_PROPERTY` and asserts on their union. If `recognition` is trimmed to `award | certificate` (#4's suggestion), the test and `data/recognition.ts` must drop `INTELLECTUAL_PROPERTY` together.
- `types/user.ts` imports the type `AvatarLightsVariants` from `components/avatar-lights.tsx` (an out-of-scope effect). Delete `avatarVariants` from `User`, or `avatar-lights.tsx` can't be deleted.
- `data/projects.tsx` imports `ChanhDaiMark`.
- `data/awards.tsx` imports `ClaudeIcon` and `VercelIcon` from `icons.tsx`.

## 3. Out-of-scope features

### 3a. Routes (`src/app/`, 67 files; 61 out of scope)

Kept (6): `layout.tsx`, `(app)/layout.tsx`, `(app)/page.tsx`, `not-found.tsx`, `robots.ts` and `sitemap.ts`. All except `robots.ts` need edits (section 6).

| Route group | Files | URLs it serves | Feature |
|---|---|---|---|
| `(app)/(docs)/` | 6 | `/blog/[slug]`, `/components/[slug]` (+ sidebar, layouts) | blog, component registry docs |
| `(app)/(pages)/` | 10 | `/blog`, `/bookmarks`, `/components`, `/craft`, `/insights`, `/sponsors`, `/testimonials`, `/timeline` (+ `component-item.tsx`, `layout.tsx`) | blog index, registry, bookmarks, craft, insights, sponsors, testimonials, timeline |
| `(app)/(blocks)/` | 8 | `/blocks`, `/blocks/[category]`, `/blocks/[category]/[name]`, `/components/showcase` | registry blocks |
| `(preview)/` | 13 | `/preview/[name]` (iframe previews, tweakcn themes, `dialkit`) | registry |
| `(llms)/` | 12 | `/llms.txt`, `/about.md`, `/blocks.md`, `/blog.md`, `/bookmarks.md`, `/components.md`, `/craft.md`, `/education.md`, `/experience.md`, `/projects.md`, `/recognition.md`, `/doc.md/[slug]` | llms.txt |
| `(rss)/` | 3 | `/blog/rss`, `/components/rss`, `/blocks/rss` | RSS |
| `og/` | 5 | `/og` (preview page), `/og/simple`, `/og/domain` (+ `params.ts`, `params.test.ts`) | dynamic OG |
| `game/` | 2 | `/game` | game |
| `vcard/` | 1 | `/vcard` (`vcard-creator` + `sharp`; emits phone/email) | vCard |
| `manifest.webmanifest` | 1 | `/manifest.webmanifest` | PWA |

**Deleting them touches:**

- `next.config.ts`: every rewrite and redirect (section 7).
- `sitemap.ts`: lists `/blog`, `/components`, `/components/showcase`, `/blocks`, `/craft`, `/bookmarks`, `/insights`, `/sponsors` and `/testimonials`, plus every post, doc, block category and block.
- `config/site.ts` `MAIN_NAV`: `/components`, `/blocks`, `/craft`, `/blog` and `/sponsors`, typed `NavItem<Route>[]`. **`typedRoutes: true` is on in `next.config.ts`, so `tsc` fails on these hrefs once the routes are gone**, until `MAIN_NAV` is edited.
- `command-menu.tsx` `MENU_LINKS`/`OTHER_LINK_ITEMS`: 8 page links plus `/vcard`, `/llms.txt` and `/rss`, typed `string`, so they don't fail tsc. They become silent 404s.
- `keyboard-shortcuts.tsx`: `g>c`, `g>b`, `g>r`, `g>l`, `g>s`, `g>m`, `g>i` and `g>t` push to removed routes.
- `site-footer-cad.tsx`: links `/llms.txt` and `/index.md`.

**Left unlinked?** No. App Router serves every `page.tsx`/`route.ts` by URL whether or not anything links to it. These routes render his MDX writing, his components, his OG card text, his game and (until `user.ts` is rewritten) his vCard. They are also listed in `sitemap.xml`. The only way to keep the files but not serve them is to move them out of `src/app/` (or behind `notFound()`), which is deleting with extra steps.

### 3b. Feature directories (`src/features/`, 202 files)

| Dir | Files | What | Imported by kept files? |
|---|---|---|---|
| `features/doc/` | 80 (56 MDX) | MDX loader (`gray-matter`, `fs`), doc layout, feedback → Discord, auto-type-table (`fumadocs-typescript`, `shiki`), llms text | **Yes**: `site-header.tsx` and `site-bottom-nav.tsx` (`getAllDocs`), `command-menu.tsx` (`ComponentIcon`, `DocPreview`), `sitemap.ts` (`getBlogPosts`, `getComponentDocs`) |
| `features/blocks/` | 18 | Block mockups and list | No (only `(blocks)` routes and portfolio `blocks/`) |
| `features/bookmark/` | 14 | Bookmarks list, `nuqs` filters, analytics | **Yes**: `site-header.tsx` and `site-bottom-nav.tsx` (`BOOKMARKS`, `sortBookmarksNewestFirst`), `command-menu.tsx` (`trackBookmarkClick`, `getBookmarkExternalHref`) |
| `features/blog/` | 6 | Post list and search (`nuqs`) | No |
| `features/craft/` | 5 | Craft gallery (videos on CDN) | No |
| `features/sponsor/` | 3 | Sponsor data | No (portfolio `sponsors*.tsx` only) |
| `features/portfolio/` (out-of-scope part) | **26** of 76 | Components: `avatar-electric-effect`, `avatar-lights-toggle`, `blocks/`, `blog`, `brand`, `components`, `components-showcase`, `duck-follower/` (2), `github-contributions/` (2), `insights/` (4), `profile-cover`, `sponsors`, `sponsors-carousel`, `testimonials`, `timeline/`. Data: `github-contributions`, `insights`, `testimonials`, `timeline`. Types: `testimonials`, `timeline` | **Yes**: `(app)/page.tsx` imports `Blocks`, `Blog`, `Components`, `GitHubContributions`, `Insights`, `Sponsors`, `SponsorsCarousel` and `Testimonials` |
| `features/portfolio/` (inside kept panels, strip per #4) | 5 | `chanhdai-mark-isometric`, `pronounce-my-name`, `verified-icon`, `overview/phone-item`, `avatar-lights` (type only) | **Yes**: `profile-header.tsx`, `overview/index.tsx`, `types/user.ts` |

**Left unlinked?** Only `blocks`, `blog`, `craft` and `sponsor` are free-standing today. `doc` and `bookmark` are imported by the header, the bottom nav, ⌘K and the sitemap. The out-of-scope portfolio panels are imported by `page.tsx`. Once those importers are edited (section 6), all six directories are dead code. Next's bundler won't ship them. But `tsconfig.json` `include: ["**/*.ts", "**/*.tsx"]`, ESLint and `vitest` (`src/**/*.test.ts`) still process them, so their deps must stay installed and their 5 tests keep running (doc 2, bookmark 3).

### 3c. Component registry (`src/registry/` 195 files, `public/r/` 70 files, plus generated root files)

- `src/registry/`: `components/` (85 files, 40 components), `examples/` (66), `blocks/` (30, 12 blocks), `hooks/` (4), `lib/` (5), `styles/` (1), `index.ts`, and the **generated** `__index__.tsx` and `__blocks__.json`.
- Generated and committed at the root: `registry.json` (1,960 lines) and `registry-stats.json` (`total: 69`). `public/r/*.json` (70 files) is served at `/r/<name>.json`, which is his `@ncdai` shadcn namespace.

**Kept panels import 4 registry items (8 files):**

- `src/registry/components/text-flip/{index.ts,text-flip.tsx}`, imported by `features/portfolio/components/flip-sentences.tsx`
- `src/registry/components/chevrons-up-down-icon/{index.ts,chevrons-up-down-icon.tsx}`, imported by `components/collapsible-animated.tsx` (used by experience, education, projects and recognition)
- `src/registry/components/copy-button/{index.ts,copy-button.tsx}`, imported by `components/copy-button.tsx` (used by `panel-title-copy`, `email-item` and ⌘K)
- `src/registry/components/icon-swap/{index.ts,icon-swap.tsx}`, imported by the registry `copy-button`

Also reached from kept code but stripped per #4: `src/registry/hooks/sound/use-sound.ts` and `src/registry/lib/sound/*` (2 files), through `pronounce-my-name.tsx`.

Other importers of the registry from shell files:

- `site-header.tsx` and `site-bottom-nav.tsx` import `@/registry/__blocks__.json` (⌘K Blocks group).
- `sitemap.ts` → `lib/blocks.ts` → dynamic `import("@/registry/__index__")`.
- `nav-mobile.tsx` → `@/registry/lib/haptic`.

**Deleting it touches:** the 3 import sites above (move the 8 files to e.g. `src/components/` first), `site-header`, `site-bottom-nav`, `sitemap` and the `lib/blocks.ts`, `lib/registry.ts`, `utils/registry.ts` helpers. Also `package.json` scripts `registry:build`/`registry:validate` and the `build` script, `tsconfig.json` (`include` lists `./src/scripts/build-registry.mts`), `.prettierignore` (`src/registry/__index__.tsx`, `src/registry/registry.autogenerated.json`), CI (`Validate registry`), `components.json` registries and `globals.css` `@import "./scroll-fade-effect.css"` / `"./style-preview.css"` (registry/preview styles).

**Left unlinked?** `src/registry/` source can. `public/r/` cannot: it's static and publicly served, so it must go. And `pnpm build` regenerates `public/r/*`, `registry.json`, `registry-stats.json`, `__index__.tsx` and `__blocks__.json` on every build through Bun. So leaving the registry dormant means keeping Bun in the build and re-publishing his namespace, unless `build` is changed to plain `next build`, at which point the registry source is dead weight.

### 3d. Shared components, hooks and libs used only by out-of-scope features

None of these are in the kept closure:

- **`src/components/`**: about 100 of 124 files go (about 23 stay: the 10 `ui/*` below, `collapsible-animated`, `collapsible-list`, `copy-button`, `heading`, `icons`, `inline-script`, `markdown`, `providers`, `theme-toggle`, plus the edited `command-menu`, `site-header`, `not-found`, `scroll-to-top`).
  - `charts/` (19, insights)
  - `daikanoid/` (10, game and 404)
  - `animated-icons/{mobius-loop,plus,sidebar}-icon` (3)
  - `kibo-ui/` (2: marquee, image-zoom)
  - `react-bits/` (2)
  - `duck-follower/`
  - Doc and code components: `callout`, `code-block-command`, `code-collapsible-wrapper`, `code-tabs`, `component-preview(-tabs)`, `component-source`, `embed`, `mdx`, `mdx-code-block`, `page-heading`, `toc`, `toc-inline`, `toc-minimap`, `registry-command-animated`, `registry-health`, `v0-open-button`, `remount-on-theme-change`
  - Shell and branding: `brand-context-menu`, `carbon-ads`, `floating-carbon-ads`, `github-stars`, `nav-item-github`, `nav`, `nav-desktop`, `nav-mobile`, `site-bottom-nav`, `site-footer*` (4), `keyboard-shortcuts`, `chanhdai-mark`, `chanhdai-wordmark`
  - 26 `ui/*` files: `alert`, `button-group`, `card`, `context-menu`, `dropdown-menu`, `empty`, `field`, `form`, `hover-card`, `input`, `input-group`, `label`, `popover`, `resizable`, `scroll-area`, `select`, `sheet`, `sidebar`, `skeleton`, `spinner`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `typography`
- **Kept `ui/*` (10):** `button`, `collapsible`, `command`, `dialog`, `icon-tile`, `kbd`, `separator`, `tag`, `toast`, `tooltip`.
- **`src/hooks/`** (8 go): `use-avatar-lights`, `use-config`, `use-is-in-viewport`, `use-is-scrolled` (only `scroll-to-top`), `use-media-query`, `use-mobile`, `use-package-manager`, `use-sidebar-open`, plus `soundcn/` (2) after the sound strip.
- **`src/lib/`** (21 of 24 go):
  - `auto-type-table`, `blocks(+test)`, `build-info`, `highlight-code`, `registry(+test)`, `rehype-code-block`, `rehype-npm-command`, `remark-code-import.js`, `remark-component`
  - `json-ld.tsx` (keep only if SEO wants JSON-LD)
  - `events.ts`, `openpanel.ts` and `libphonenumber.ts` after the strip
  - `soundcn/` (6)
  - Kept: `fonts.ts`, `utils.ts`, `rehype-add-query-params.ts` (only if UTM stays).
- **`src/utils/`**: `format.ts(+test)` and `registry.ts(+test)` go. `copy.ts` is only analytics wrappers. From `string.ts`, keep `decodeEmail` only: it imports `@/lib/libphonenumber`, and `escapeXml`/`toISODateSafe` serve RSS/llms.
- **`src/scripts/`** (12): `build-registry`, `capture*` (3, `puppeteer`), `craft-upload`, `sync-x-avatars` and `lib/` (6, including `r2.mts`).
- **`src/assets/`**: `libphonenumber.metadata.json` (phone strip) and `fonts/*` (6, OG routes only).
- **`src/config/`**: `ads.ts`, `registry.ts`, `json-ld.ts` (optional).
- **`src/styles/`**: `scroll-fade-effect.css` and `style-preview.css` (both `@import`ed by `globals.css`).
- **`src/types/nav.ts`**: only if `MAIN_NAV` goes.

**Left unlinked?** Yes, once the shell edits in section 6 are made. Same lint, typecheck and dep caveats as 3b.

## 4. Integrations and env vars

`.env.example` lists 19 vars. Cross-checked against every `process.env.*` read in `src/` and `next.config.ts`:

| Var | Read by | Integration | Verdict |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `config/site.ts` (`SITE_INFO.url`, fallback `https://chanhdai.com`), `lib/utils.ts` (`absoluteUrl`) | Site URL | **Keep**; change the fallback to `https://www.qiuyihong.com` |
| `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` | `lib/build-info.ts` → `site-footer-cad.tsx` | Footer "BUILD" field | Drop with the footer |
| `BUILD_TIMESTAMP` (set in `next.config.ts` `env`) | `lib/build-info.ts` | Footer | Drop with the footer |
| `NEXT_PUBLIC_REGISTRY_NAMESPACE`, `NEXT_PUBLIC_REGISTRY_NAMESPACE_URL` | `config/registry.ts` (fallback `@ncdai`, `https://chanhdai.com/r/{name}.json`) | shadcn registry | Drop |
| `GITHUB_API_TOKEN` | `components/nav-item-github.tsx` (`unstable_cache` star count) | GitHub stars in header | Drop |
| `NEXT_PUBLIC_GITHUB_CONTRIBUTIONS_API_URL` | `registry/components/github-contributions/lib/get-cached-contributions.ts` ← `features/portfolio/data/github-contributions.ts` | Contributions graph (jogruber API), **required at prerender** (CI sets it) | Drop |
| `NEXT_PUBLIC_DMCA_URL` | `site-footer.tsx`, `site-footer-cad.tsx` | DMCA badge | Drop |
| `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` | `lib/openpanel.ts` (module-level `new OpenPanel`) ← `lib/events.ts` ← 18 files | OpenPanel analytics | Drop; cut the imports (see TL;DR) |
| `OPENPANEL_PROJECT_ID`, `OPENPANEL_CLIENT_ID`, `OPENPANEL_CLIENT_SECRET` | `features/portfolio/data/insights.ts` | Insights panel (server-side OpenPanel API) | Drop |
| `NEXT_PUBLIC_GTM_ID` | `app/layout.tsx` (`<GoogleTagManager>` from `@next/third-parties`) | Google Tag Manager | Drop |
| `DISCORD_FEEDBACK_WEBHOOK_URL` | `features/doc/actions/send-doc-feedback.ts` | Doc "Was this helpful?" → Discord | Drop |
| `NEXT_PUBLIC_CARBON_ADS_SERVE`, `NEXT_PUBLIC_CARBON_ADS_PLACEMENT` | `config/ads.ts` → `(app)/page.tsx` `FloatingCarbonAds`, plus docs/blocks/bookmarks pages; `registry/examples/carbon-ads-demo.tsx` | Carbon Ads | Drop |
| `R2_S3_API`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | `src/scripts/lib/r2.mts` (Bun) ← `capture:sync`, `avatars:sync`, `craft:upload` | Cloudflare R2 uploads to his CDN | Drop |
| `URL` (not in `.env.example`) | `scripts/capture*.mts` | Screenshot scripts | Drop |
| `SHADCNCRAFT_LICENSE_KEY`, `SHADCNCRAFT_INSTANCE_NAME` (not in `.env.example`) | `components.json` registry headers | Paid registry | Drop the registry entry |

**c15t** (`@c15t/nextjs`) appears only in `src/registry/components/consent-manager/consent-manager.tsx`, a registry item. It's not mounted in any layout, so it needs no env and goes with the registry.

**After the strip, env is just `NEXT_PUBLIC_APP_URL`** (optional, given a correct fallback).

**Left unlinked?** Mostly. Each integration no-ops when its var is unset (Carbon renders nothing; GTM is guarded by `&&`; Discord logs to the console). The exceptions are OpenPanel (the client is constructed on import regardless) and the contributions graph (prerender needs the URL), and both are imported by kept files until section 6 is done.

## 5. Dependencies that become unused

Every package was mapped to its importing files, and each `package.json` entry with no `src/` importer was then checked against config files (`postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc`, `globals.css`, `reset.d.ts`). Packages marked **keep** are imported by the kept closure (per #4).

**Runtime `dependencies`** (54 total):

| Package | Only used by | Verdict |
|---|---|---|
| `@bprogress/next` | `providers.tsx`, `command-menu.tsx`, `keyboard-shortcuts.tsx` | Drop (swap `useRouter` for `next/navigation`) |
| `@c15t/nextjs` | `registry/components/consent-manager` | Drop |
| `@date-fns/tz` | `components/registry-health.tsx` | Drop |
| `@hookform/resolvers`, `react-hook-form` | `registry/examples/wheel-picker-form-demo.tsx`, `ui/form.tsx` | Drop |
| `@hugeicons/core-free-icons`, `@hugeicons/react` | `command-menu.tsx` (Craft icon), `recognition-item.tsx` (trademark/copyright icons) | Drop (strip per #4) |
| `@ncdai/react-swipe-actions`, `@ncdai/react-wheel-picker` | `registry/components/{swipe-actions,wheel-picker}` | Drop |
| `@next/third-parties` | `app/layout.tsx` (GTM) | Drop |
| `@number-flow/react` | **nothing** (no import anywhere) | Drop |
| `react-use` | **nothing** (no import anywhere) | Drop |
| `@openpanel/web` | `lib/openpanel.ts` | Drop |
| `@rexa-developer/tiks` | 9 files including kept `email-item.tsx`, `use-copy-to-clipboard.ts`, `command-menu.tsx` | Drop (strip per #4) |
| `web-haptics` | `hooks/use-copy-to-clipboard.ts` | Drop (strip per #4) |
| `@tabler/icons-react` | `features/doc/components/{component-icon,doc-page-actions}`, `(preview)/block-viewer` | Drop |
| `@visx/curve`, `@visx/event`, `@visx/grid`, `@visx/responsive`, `@visx/scale`, `@visx/shape`, `d3-array` | `components/charts/*` (insights) | Drop (7) |
| `dialkit` | `(preview)/preview/layout.tsx`, 2 registry examples | Drop |
| `fumadocs-core`, `fumadocs-typescript` | docs pages, `mdx.tsx`, `toc*`, auto-type-table | Drop |
| `hast-util-to-jsx-runtime` | `features/doc/.../auto-type-table.tsx` | Drop |
| `jotai` | `providers.tsx`, doc feedback, `use-avatar-lights`, `use-config`, `use-package-manager`, `use-sidebar-open`, `code-block-command` | Drop |
| `libphonenumber-js` | `lib/libphonenumber.ts` (via `utils/string.ts` ← `phone-item`, `vcard`) | Drop |
| `lru-cache` | `lib/highlight-code.ts`, `lib/registry.ts` | Drop |
| `next-mdx-remote` | `components/mdx.tsx` (also `next.config.ts` `transpilePackages`) | Drop |
| `nuqs` | `app/layout.tsx` (`NuqsAdapter`), blog/bookmark/preview search params | Drop |
| `p5` | `components/daikanoid/*`, `registry/blocks/not-found-01/*` | Drop |
| `react-fast-marquee` | `kibo-ui/marquee` (sponsors/testimonials) | Drop |
| `react-medium-image-zoom` | `kibo-ui/image-zoom` (docs) | Drop |
| `react-resizable-panels` | `ui/resizable.tsx`, `(preview)/block-viewer` | Drop |
| `sharp` | `app/vcard/route.ts`, `scripts/{craft-upload,sync-x-avatars}` | Drop (`next` already lists `sharp` as its own optional dep in the lockfile for image optimization) |
| `vcard-creator` | `app/vcard/route.ts` | Drop |
| `zod` | `lib/events.ts`, `lib/blocks.ts`, `(preview)`, `registry-health`, doc feedback, registry example | Drop |
| `schema-dts` | `app/layout.tsx`, `(app)/page.tsx`, `config/json-ld.ts`, `lib/json-ld.tsx`, docs/blocks pages | Keep only if SEO keeps JSON-LD |
| `next`, `react`, `react-dom`, `next-themes`, `@base-ui/react`, `class-variance-authority`, `cn`, `lucide-react`, `motion`, `cmdk`, `react-hotkeys-hook`, `date-fns`, `react-markdown`, `geist` | kept closure | **Keep** (14) |

That's **39 runtime deps dropped**, 14 kept and `schema-dts` optional. `@base-ui/react` stays, but only for the 10 kept `ui/*` primitives.

**`devDependencies`** (41 total):

| Package | Only used by | Verdict |
|---|---|---|
| `@types/bun` | `src/scripts/*.mts` | Drop |
| `@types/d3-array`, `@types/p5`, `@types/hast` | charts, daikanoid, doc auto-type-table | Drop |
| `@tailwindcss/typography` | `globals.css` `@plugin`, used only by `prose-ncdai` (`ui/typography.tsx` → blog) | Drop (and remove the `@plugin` line) |
| `gray-matter` | `features/doc/data/documents.ts` | Drop |
| `libphonenumber-metadata-generator` | `generate-libphonenumber-metadata` script | Drop |
| `puppeteer` | `scripts/capture*`, `craft-upload` | Drop |
| `rehype-pretty-code`, `rehype-slug`, `remark`, `remark-mdx`, `remark-rehype`, `shiki`, `strip-indent` | MDX / doc / code-highlight pipeline | Drop (7) |
| `rimraf` | `scripts/build-registry.mts` | Drop |
| `unist-util-visit`, `unist-builder` | `lib/rehype-add-query-params.ts`, `types/unist.ts` (plus doc remark plugins) | Keep only if `rehypeAddQueryParams` (UTM in Markdown) stays |
| `rehype-raw`, `rehype-external-links`, `remark-gfm` | kept `components/markdown.tsx` | **Keep** (runtime use, filed as dev) |
| `shadcn` | `globals.css` `@import "shadcn/tailwind.css"` | **Keep** |
| `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css`, `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@total-typescript/ts-reset`, `eslint`, `eslint-config-next`, `eslint-config-prettier`, `eslint-plugin-better-tailwindcss`, `@shadcn/lint`, `prettier`, `prettier-plugin-tailwindcss`, `@ianvs/prettier-plugin-sort-imports`, `vitest`, `husky`, `lint-staged` | build/lint/test tooling | Keep (`husky`/`lint-staged` optional) |

That's **16 dev deps dropped**, plus 2 more if UTM-in-Markdown goes.

`pnpm-workspace.yaml` `allowBuilds` (`puppeteer`, `sharp`, `core-js`, `msw`, `protobufjs`) and the `minimumReleaseAgeExclude` pins (`@ncdai/*`, `@next/third-parties@16.3.3`, …) can then be pruned. Regenerate `pnpm-lock.yaml`; don't hand-edit it.

**Left unlinked?** Dormant code keeps its deps in `package.json`, and tsc/eslint still need them installed. So deps only go once the code that imports them goes.

## 6. Couplings: kept files that import removed areas

This is the list that breaks the build if out-of-scope directories are deleted first. It was found by grepping the imports of each kept or shell file and walking the import graph from the 9 kept panels, `theme-toggle`, `ui/command`, `ui/dialog`, `providers` and `lib/fonts`.

| Kept file | Imports from out-of-scope / identity / stripped code | Fix |
|---|---|---|
| `src/app/(app)/page.tsx` | `Blocks`, `Blog`, `Components`, `GitHubContributions`, `Insights`/`InsightsSkeleton`, `Sponsors`, `SponsorsCarousel`, `Testimonials` (portfolio); `CARBON_ADS` + `FloatingCarbonAds`; `JsonLdScript` + `JSON_LD_ID` (schema-dts) | Remove those panels and their `Separator`s; add Publications |
| `src/app/(app)/layout.tsx` | `SiteFooterCad` (→ `package.json`, `registry-stats.json`, `chanhdai-mark`, `site-footer-brand` logotype, `build-info`, OpenPanel URL, `/llms.txt`, DMCA, `SOCIAL` X/GitHub/LinkedIn); `SiteBottomNav` (→ `getAllDocs`, `BOOKMARKS`, `__blocks__.json`, `CommandMenu`, `NavMobile` → `registry/lib/haptic`, `MOBILE_NAV`) | Drop both or rewrite. A footer isn't in the map's scope. The mobile bottom bar is the only ⌘K trigger below `sm`: the header hides it there with `max-sm:*:data-[slot=command-menu-trigger]:hidden` |
| `src/app/layout.tsx` | `@next/third-parties` GTM; `NuqsAdapter` (nuqs); `avatarLights` and `sidebarOpen` inline scripts; CDN favicons; `authors`/`creator: "ncdai"`; `X_HANDLE`; `personJsonLd` (`config/json-ld.ts` → `SOCIAL_LINKS`, `USER`) | Keep the theme-color/`os-macos` script and fonts; drop the rest; point icons at `/public` or `app/icon.*` |
| `src/components/providers.tsx` | `jotai` `Provider`, `@bprogress/next` `ProgressProvider`, `KeyboardShortcuts` (→ `trackEvent`, routes to removed pages) | Keep `ThemeProvider`, `TooltipProvider`, `Toaster` |
| `src/components/site-header.tsx` | `getAllDocs` (features/doc → `fs` + `gray-matter` reads all MDX at render), `BOOKMARKS`/`sortBookmarksNewestFirst`, `@/registry/__blocks__.json`, `BrandContextMenu`, `ChanhDaiMark`, `NavItemGitHub` (`GITHUB_API_TOKEN`), `NavDesktop` + `MAIN_NAV` | Our logo; `CommandMenu` without `docs`/`blocks`/`bookmarks` props; `ThemeToggle` |
| `src/components/command-menu.tsx` (761 lines) | `features/bookmark/lib/{analytics,bookmark-link}`, `features/bookmark/types`, `features/doc/components/component-icon` (→ `@tabler/icons-react`), `features/doc/types/document`, `chanhdai-mark`, `chanhdai-wordmark`, `@hugeicons/*`, `@bprogress/next`, `@rexa-developer/tiks`, `trackEvent`, `useClickSound`, `utils/copy`; 11 hard-coded links to removed routes | Cut to about 250 lines per #4; add `/#publications` |
| `src/app/not-found.tsx` → `src/components/not-found.tsx` | `Daikanoid` (10 files, `p5`, his logos) | Rewrite as a plain 404 |
| `src/app/sitemap.ts` | `blockCategories` (`config/registry`), `getAllBlockStaticParams` (`lib/blocks` → `registry/__index__`), `getBlogPosts`/`getComponentDocs` (features/doc), 9 hard-coded removed routes | Reduce to `[""]` (single page) |
| `src/config/site.ts` | imports `SOCIAL`, `USER` (fine); exports `MAIN_NAV`/`MOBILE_NAV` with removed `Route`s (**typedRoutes**), `LICENSE`, `SOURCE_CODE_*`, `SPONSORSHIP_URL` | Rewrite (section 1) |
| `src/features/portfolio/components/flip-sentences.tsx` | `@/registry/components/text-flip` | Repoint after moving the file |
| `src/components/collapsible-animated.tsx` | `@/registry/components/chevrons-up-down-icon`; `animated-icons/chevron-down-icon` (only for `CollapsibleChevronDownIcon`) | Repoint; drop the chevron-down variant per #4 |
| `src/components/copy-button.tsx` | `@/registry/components/copy-button` (→ `icon-swap`, `hooks/use-copy-to-clipboard` → `tiks`, `web-haptics`); `trackEvent` | Repoint; drop analytics/haptics/tiks |
| `src/features/portfolio/components/profile-header.tsx` | `ChanhDaiMarkIsometric` (→ `motion`, `lib/soundcn/metal-click`, `hooks/soundcn/use-sound`), `PronounceMyName` (→ `registry/hooks/sound`, `animated-icons/volume-icon`, `trackEvent`), `VerifiedIcon` | New figure/CV slot per #4 |
| `src/features/portfolio/components/overview/index.tsx` | `PhoneItem` → `utils/string` → `lib/libphonenumber` → `src/assets/libphonenumber.metadata.json` | Drop `PhoneItem`; copy only `decodeEmail` |
| `src/features/portfolio/components/overview/email-item.tsx` | `@rexa-developer/tiks`, `trackEvent`/`copyToClipboardWithEvent` | Strip |
| `src/features/portfolio/components/recognition/recognition-item.tsx` | `@hugeicons/*` | Strip per #4 |
| `src/components/theme-toggle.tsx` | `hooks/soundcn/use-click-sound` | Strip |
| `src/features/portfolio/types/user.ts` | type `AvatarLightsVariants` from `components/avatar-lights.tsx` | Drop the field |
| `src/features/portfolio/data/projects.tsx` | `ChanhDaiMark` | Rewritten anyway |
| `src/styles/globals.css` (676 lines) | `@import "./scroll-fade-effect.css"`, `@import "./style-preview.css"`, `@plugin "@tailwindcss/typography"`, `prose-ncdai`, chart/sidebar/`--dk-*` tokens | Delete the 2 imports **before** deleting the 2 CSS files, or the CSS build fails |

**Not couplings:** `robots.ts` (only `SITE_INFO`). The `theme-toggle.tsx` imports of `animated-icons/{moon,sun-medium}-icon` are commented out.

## 7. `package.json` scripts, build steps and config

**`package.json` `scripts`:**

| Script | Today | Change |
|---|---|---|
| `build` | `pnpm registry:build && next build` | → `next build` |
| `preview` | `pnpm registry:build && next build && next start` | → `next build && next start` (or delete) |
| `registry:build` | `bun run ./src/scripts/build-registry.mts && shadcn build` (writes `registry.json`, `registry-stats.json`, `src/registry/__index__.tsx`, `src/registry/__blocks__.json`, `public/r/*`) | Delete |
| `registry:validate` | `shadcn registry validate ./public/r/registry.json` | Delete |
| `capture`, `capture:sync`, `capture:cover` | Bun + puppeteer screenshots → R2 | Delete |
| `avatars:sync` | Bun, X avatars → R2 | Delete |
| `craft:upload` | Bun, craft media → R2 | Delete |
| `generate-libphonenumber-metadata` | regenerates the VN phone metadata | Delete |
| `dev`, `start`, `test`, `test:run`, `lint`, `lint:fix`, `check-types`, `format:check`, `format:write`, `upgrade:next`, `upgrade:tailwind`, `prepare` (husky) | | Keep |

There is no `prebuild`/`postbuild` hook. `prepare` only installs husky (`.husky/pre-commit` → `pnpm lint-staged`).

**`next.config.ts`:**

- `redirects()`: 12 literal redirects (`/blog|components/...` renames, `/wall-of-love` → `/testimonials`, `/llms-full.txt` → `/llms.txt`, `/(awards|certifications|intellectual-property).md` → `/recognition.md`, 5 `/blocks/content/*`, `/:section/:slug.mdx`) plus 30 generated from `LEGACY_BLOG_COMPONENT_SLUGS` (`/blog/<slug>` → `/components/<slug>`). All target removed routes, so **delete all**.
- `rewrites()`:
  - `beforeFiles`: `/:section(blog|components)/:slug.md` → `/doc.md/:slug`; the same path with `Accept: text/markdown`; `/index.md` → `/llms.txt`; and **`/` with `Accept: text/markdown` → `/llms.txt`**. That last one hijacks the homepage for markdown-accepting clients: if `(llms)` is deleted but the rewrite stays, they get a 404.
  - `afterFiles`: `/rss` → `/blog/rss`, `/registry/rss` → `/components/rss`.
  - **Delete all.**
- `transpilePackages: ["next-mdx-remote"]`: delete.
- `allowedDevOrigins: ["ncdai.localhost", "ncdai.local"]`: delete or replace.
- `experimental.optimizePackageImports` (`@hugeicons/*`, `@phosphor-icons/react`, `@remixicon/react`, the last two not even in `package.json`): delete.
- `images.remotePatterns` (`assets.chanhdai.com`, `images.unsplash.com`): delete; experience logos use `unoptimized` and will live in `/public`.
- `env.BUILD_TIMESTAMP`: delete with the footer.
- Keep `reactStrictMode`, `typedRoutes`, `devIndicators: false` and `compiler.removeConsole`.

**Sitemap / robots:** `sitemap.ts` enumerates blog posts, component docs, block categories, blocks and 9 hard-coded routes. Reduce it to `/`. `robots.ts` is fine as is (`SITE_INFO.url`).

**No middleware:** there is no `middleware.ts`/`proxy.ts`, `instrumentation.ts` or `vercel.json`.

**`tsconfig.json`:** `include` lists `./src/scripts/build-registry.mts` explicitly; remove it. `tsconfig.scripts.json` (scripts only): delete.

**Other config:**

- `vitest.config.ts`: unchanged.
- `.prettierignore`: drop the 2 registry lines.
- `.lintstagedrc.mjs`: `*.mdx` glob harmless.
- `eslint.config.mjs`: drop `.ncdai/**`.
- `components.json`: drop `registries`, keep `style: "base-nova"` + aliases.
- `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` (shadcn MCP): optional.

**CI (`.github/workflows/ci.yml`):**

- Remove the `NEXT_PUBLIC_GITHUB_CONTRIBUTIONS_API_URL` job env.
- Remove the `oven-sh/setup-bun` step.
- Remove the `Validate registry` step.
- Rename "Build (includes registry build via Bun)".
- `pnpm/action-setup` pins pnpm `11.5.3` while `packageManager` is `pnpm@12.4.2`; align them.
- `on.push.branches: [staging]` is his branch model.
- `.github/FUNDING.yml`: delete. `.github/dependabot.yml`: drop the `ncdai` reviewer.

**Tests:** 15 test files.

- 11 die with their areas: `og/params`, `bookmark` ×3, `doc` ×2, `lib/blocks`, `lib/registry`, `utils/registry`, `scripts/lib` ×2.
- `utils/format.test.ts` dies with `format.ts`, used only by removed code.
- `utils/string.test.ts` tests `escapeXml`/`toISODateSafe` (RSS/llms helpers), so it goes if `string.ts` is cut to `decodeEmail`.
- Kept: `features/portfolio/data/recognition.test.ts` (rewrite with data) and `utils/url.test.ts` (swap `chanhdai.com` fixtures).

## 8. Ordered strip plan

The order keeps the build green at every step. Steps 1–3 cut couplings while everything still exists, so #15's "leave dormant" option is simply stopping after step 4 and skipping steps 5–6.

1. **Fork at `1951e21` and fix the floor.** Keep `LICENSE` (MIT notice) and add a one-line credit ("based on chanhdai.com by Chánh Đại"), which `TRADEMARK.md` explicitly allows. Delete `TRADEMARK.md`, `.github/FUNDING.yml`, `portless.json`, and his `README.md`/`DEVELOPMENT.md`/`CODE_OF_CONDUCT.md` (or rewrite them).
2. **Build scripts first.** `build` → `next build`; delete `registry:*`, `capture*`, `avatars:sync`, `craft:upload`, `generate-libphonenumber-metadata` and `preview`'s registry step. Update CI: drop the Bun step, `registry:validate` and the contributions env. Remove `build-registry.mts` from `tsconfig.json` `include`.
3. **Cut every coupling in section 6, top to bottom.** That means `page.tsx`, both layouts, `providers`, `site-header`, `command-menu`, `not-found`, `sitemap`, `config/site.ts` and `globals.css` (drop the 2 `@import`s, the typography `@plugin`, `prose-ncdai`, and the chart/sidebar/`--dk-*` tokens). Also strip analytics, sound, haptics and phone from the kept panels.
4. **Move the 8 kept registry files** (`text-flip`, `chevrons-up-down-icon`, `copy-button`, `icon-swap`) to `src/components/` and repoint the 3 import sites. **Empty `next.config.ts`** of redirects, rewrites, `transpilePackages`, `optimizePackageImports`, `remotePatterns`, `allowedDevOrigins` and `env`. Checkpoint: `tsc`, `lint`, `test:run` and `next build` pass, and the homepage renders only kept panels.
5. **Delete routes:** the 61 `src/app` files in 3a, including `manifest.webmanifest`, and `public/r/` (70). This step isn't optional: the routes are public whether linked or not.
6. **Delete dead code:**
   - `src/registry/`, `registry.json`, `registry-stats.json`
   - `src/scripts/` (12)
   - `src/features/{doc,blog,bookmark,craft,sponsor,blocks}` (126)
   - the 26 + 5 portfolio files in 3b
   - the shared components/hooks/libs/utils/styles/assets/config in 3d, including `chanhdai-mark.tsx`, `chanhdai-wordmark.tsx`, `brand-context-menu.tsx`, `site-footer*.tsx` and `daikanoid/`
   - the 13 obsolete tests

   A re-run of the import walk from the kept roots should then reach every remaining `src/` file.
7. **Remove deps** (section 5: 39 runtime and 16 dev, plus `schema-dts`/`unist-*` depending on SEO/UTM decisions). Prune `pnpm-workspace.yaml`, then `pnpm install` to regenerate the lockfile.
8. **Swap identity:**
   - Rewrite `features/portfolio/data/*` from the content pack, and `config/site.ts`.
   - Root `layout.tsx` metadata: authors, creator, Twitter and icons. Add `/public` favicons, the apple-touch icon, the static OG image, the avatar, company logos and the CV PDF.
   - `package.json` name, homepage, author and repository.
   - `components.json` registries, `eslint`/`.gitignore` `.ncdai`, `dependabot` reviewer, the `icons.tsx` `@ncdai` icons and the `url.test.ts` fixtures.
   - Replace the header mark and the profile-header figure (our `light_logo.png` per the map).
9. **Add the publications panel** and the `/#publications` ⌘K entry (per #4's notes).
10. **Verify:**
    - `git grep -nIiE 'chanhdai|ncdai|Chánh Đại|Chanh Dai|iamncdai|assets\.chanhdai'` hits only `LICENSE` and the credit line.
    - `find src/app -name 'page.tsx' -o -name 'route.ts'` lists only the homepage (plus `not-found`, `sitemap`, `robots`).
    - `public/` holds only our assets.
    - `tsc`, `lint`, `test:run` and `next build` are green, and `/sitemap.xml` lists one URL.
