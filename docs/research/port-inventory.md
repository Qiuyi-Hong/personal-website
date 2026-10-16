# Port inventory: chanhdai.com → Vite + React

Answers [#8](https://github.com/Qiuyi-Hong/personal-website/issues/8) (child of map [#2](https://github.com/Qiuyi-Hong/personal-website/issues/2)). Facts only; nothing is ported here.

- **Reference:** [ncdai/chanhdai.com](https://github.com/ncdai/chanhdai.com) at `1951e213749f58787fc2211cb1cfdc4f386de033` (merge of PR #1465, 2026-09-27). Every path below is relative to `src/` at that SHA.
- **Method:** a static import walk (regex over `import`/`export from`/`import()`/CSS `@import`, resolving `@/` → `src/`) starting from the v1 entry points: `app/layout.tsx`, `app/(app)/layout.tsx`, and the ten `features/portfolio/components/*` sections that `app/(app)/page.tsx` renders for v1. The walk stopped at `command-menu`, `brand-context-menu`, `registry/__blocks__.json`, `features/bookmark`, `features/doc`, and `registry-stats.json`, because they only serve out-of-scope pages. **Result: 136 source files, ~10.9k lines.** About 1.8k of those lines are personal data and types, and 1.3k are CSS.
- **Section mapping:** About = `hello.tsx`. Certifications = `recognition/` (it merges awards, certifications and IP; v1 keeps only the certifications source). Publications has no counterpart in the reference.

## 1. Files to copy

### 1a. Copy as-is (or nearly)

| Group | Files |
|---|---|
| Styles / tokens | `styles/globals.css` (676 lines: theme tokens, `@custom-variant dark`, `screen-line-*`, `stripe-divider`, etc.), `styles/typeset.css`, `styles/scroll-fade-effect.css`, `styles/style-preview.css` |
| UI primitives (Base UI + cva) | `components/ui/{button,collapsible,icon-tile,kbd,popover,separator,tag,toast,tooltip}.tsx` |
| Shared components | `components/{collapsible-animated,collapsible-list,copy-button,heading,icons,markdown,scroll-to-top}.tsx`, `components/animated-icons/{chevron-down,moon,sun-medium,volume}-icon.tsx` |
| Theme toggle | `components/theme-toggle.tsx`, `hooks/use-meta-color.ts` (both use `next-themes`, which is kept, see §2) |
| Registry components | `registry/components/{contribution-graph,copy-button,chevrons-up-down-icon,icon-swap,text-flip}/*`, `registry/hooks/sound/use-sound.ts`, `registry/lib/{haptic,sound}/*` |
| Hooks | `hooks/{use-copy-to-clipboard,use-is-client,use-is-scrolled,use-media-query}.ts`, `hooks/soundcn/{use-sound,use-click-sound}.ts` |
| Lib / utils / types | `lib/utils.ts` (edit `absoluteUrl`), `lib/rehype-add-query-params.ts`, `lib/soundcn/{click-soft,metal-click,sound-engine,sound-types}.ts`, `utils/{copy,format,string,url}.ts`, `types/{nav,unist}.ts` |
| Portfolio sections | `features/portfolio/components/{panel,panel-title-copy,social-links,social-link-icons,tech-stack,hello,hello-title,flip-sentences,verified-icon,handwritten-note,pronounce-my-name}.tsx`, plus the folders `education/`, `experiences/`, `projects/`, `recognition/`, `overview/`, `github-contributions/` |
| Portfolio types | `features/portfolio/types/*.ts` (9 files; `user.ts` type-imports `avatar-lights.tsx`, so copy that file or inline the type) |

### 1b. Copy and edit (Next.js or brand coupling)

| File | Change |
|---|---|
| `app/layout.tsx` | Becomes `index.html` (meta, icons, the pre-paint script) plus `main.tsx` (CSS import, `<Providers>`). Drop GTM, `NuqsAdapter`, and the `avatarLights` and `sidebarOpen` scripts. |
| `app/(app)/layout.tsx` | Becomes `App.tsx`. `next/dynamic(ScrollToTop)` becomes a plain import. Drop `SiteBottomNav`. |
| `app/(app)/page.tsx` | Body of `App.tsx`: the v1 sections plus the local `Separator`. Drop `JsonLdScript`, Carbon ads and out-of-scope sections. |
| `components/providers.tsx` | Keep `ThemeProvider`, `TooltipProvider` and `Toaster`. Drop `@bprogress/next` `ProgressProvider`, the `jotai` Provider (nothing in v1 uses it) and `KeyboardShortcuts`. |
| `components/site-header.tsx` | Drop `CommandMenu`, `BrandContextMenu`, `NavDesktop` (every `MAIN_NAV` entry is an out-of-scope page), and the docs/bookmarks/blocks data. Keep: mark, `NavItemGitHub` (or a plain GitHub link), `ThemeToggle`. `next/link` becomes `<a>`. |
| `components/site-footer-cad.tsx` | Drop `registry-stats.json` and the OpenPanel/"Inspired by" rows. Swap `ChanhDaiMark`. Add the "Design based on chanhdai.com" credit and the MIT notice. `next/link` becomes `<a>`. Build info is covered below. |
| `components/site-footer-brand.tsx` | The logotype SVG paths are his wordmark. Keep the motion gradient mechanics and replace the paths. |
| `components/nav-item-github.tsx`, `components/github-stars.tsx` | Async server component calling `unstable_cache` and the GitHub API with `GITHUB_API_TOKEN`. Either drop the star count (link only) or fetch it from the backend. |
| `lib/fonts.ts` | Replace with Fontsource imports (§2). |
| `lib/build-info.ts` | Reads `VERCEL_*` env and `package.json` on the server. Replace with Vite `define` values set at build time. |
| `config/site.ts` | Remove the `Route` type from `next`. Rewrite `SITE_INFO`, `LICENSE` (keep it pointing at his MIT text), `MAIN_NAV`/`MOBILE_NAV` (empty or anchors), `SOURCE_CODE_*`, `SPONSORSHIP_URL` and `UTM_PARAMS`. |
| `features/portfolio/components/experiences/experience-item.tsx` | `next/image` (already `unoptimized`) becomes `<img width={24} height={24}>`. |
| `features/portfolio/components/github-contributions/index.tsx` + `data/github-contributions.ts` | Remove `server-only`. Pass a promise from `fetch('/api/contributions')` that is created once (module scope or memoised); see Risks. |
| `features/portfolio/components/profile-header.tsx` | Swap the `ChanhDaiMarkIsometric` cover and the avatars. `PronounceMyName` only renders when `namePronunciationUrl` is set. |
| `features/portfolio/components/overview/index.tsx` | There is no CV item. Add one `IntroItem` + `IntroItemLink` for the CV. Drop `PhoneItem` unless a phone number is wanted. |
| `features/portfolio/data/recognition.ts` | v1 is certifications only: drop `AWARDS` and `INTELLECTUAL_PROPERTY` from the merge, and the pinned keys. |
| `lib/events.ts`, `lib/openpanel.ts` | `trackEvent` is called from 6 files. Stub it as a no-op (this also drops `zod` and `@openpanel/web`), or wire whatever the analytics decision picks. |
| `components/inline-script.tsx` (used by `hello-title.tsx`) | A pre-hydration SSR trick that renders `type="text/plain"` on the client, so it does nothing in a SPA. Delete it; the `useSyncExternalStore` client snapshot already covers the greeting. |

### 1c. Replace with Qiuyi's content or identity (do not copy)

`components/chanhdai-mark.tsx`, `features/portfolio/components/chanhdai-mark-isometric.tsx` (297 lines; the profile cover), `features/portfolio/data/{user,social-links,experiences,education,projects,tech-stack,certifications}.ts(x)`, and `config/json-ld.ts`.

### 1d. Drop

`components/{site-bottom-nav,nav,nav-desktop,nav-mobile,keyboard-shortcuts}.tsx`; `features/portfolio/data/{awards,intellectual-property}`; `lib/libphonenumber.ts` and `assets/libphonenumber.metadata.json` (VN-only metadata, generated with `--countries VN`, so it must be regenerated if a non-VN phone number is shown); `lib/json-ld.tsx` (optional, can be reused for a static JSON-LD block in `index.html`).

## 2. Next.js APIs → Vite/React replacements

Counts are files within the 136-file closure.

| Next.js API | Files | Replacement |
|---|---|---|
| `"use client"` | 37 | Delete it, or leave it: it means nothing in a Vite SPA. Stripping it with sed keeps bundler logs quiet. |
| Server components with server-only work | 5: `nav-item-github` (async), `github-contributions/index`, `site-header`, `site-bottom-nav` (both read the docs registry), `site-footer-cad` (env + `package.json`) | All become client components. Data moves to the backend (§4) or is dropped with the nav/command menu. |
| `server-only` | 1 (`data/github-contributions.ts`) | Delete; fetch from the backend. |
| `next/cache` `unstable_cache` | 2 (`get-cached-contributions.ts`, `nav-item-github.tsx`) | Backend in-memory TTL cache (24 h, matching the reference's `revalidate: 86400`). |
| `next/link` | 4 (`site-header`, `site-footer-cad`, `nav`, `nav-mobile`) | `<a href>`. No router is needed for a one-page site. |
| `next/image` | 1 (`experience-item`) | `<img>`; it was already `unoptimized`. |
| `next/font/google` (IBM Plex Serif 400, Caveat 400/500) + `geist/font` (Geist Sans/Mono) | 1 (`lib/fonts.ts`) | Fontsource: `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `@fontsource/ibm-plex-serif/400.css`, `@fontsource-variable/caveat` (all 5.3.0 on npm). Import them in `main.tsx` and set `--font-sans/mono/serif/handwritten` on `:root` to `"Geist Variable"`, `"Geist Mono Variable"`, `"IBM Plex Serif"` and `"Caveat Variable"`. Variable family names carry the " Variable" suffix ([Fontsource FAQ](https://fontsource.org/docs/getting-started/faq)). The `geist` package has peer dependency `next >=13.2.0`, so it must go. |
| `next/dynamic` | 3 (`app/(app)/layout`, `site-header`, `site-bottom-nav`) | Plain imports. Every dynamic target except `ScrollToTop` is dropped. |
| `next/navigation` `usePathname` | 2 (`nav-desktop`, `nav-mobile`) | Dropped with them. |
| `next/script` | 1 (`app/layout`) | A plain `<script>` in `index.html` `<head>`. |
| `next-themes` | 3 (`providers`, `theme-toggle`, `use-meta-color`) | **Keep.** 0.4.6 peers only on `react`/`react-dom` (no `next`), and the README says it works outside Next since 0.3.0 ([context7: pacocoursey/next-themes](https://github.com/pacocoursey/next-themes)). Its anti-flash `ThemeScript` is injected through React, which does not run when the page renders client-side only. Put a blocking script in `index.html` that adds `class="dark"` and sets `color-scheme` from `localStorage.theme` or `prefers-color-scheme`. The reference's `darkModeScript` already does the same check for `meta[name=theme-color]`, so extend it. |
| Types from `next` (`Metadata`, `Viewport`, `Route`) | 5 (`app/layout`, `config/site`, `nav`, `nav-desktop`, `nav-mobile`) | Remove them; `NavItem<Route>` becomes `NavItem<string>`. |
| `metadata` / `viewport` exports | 1 (`app/layout`), plus `alternates.canonical` in `page.tsx` | Static tags in `index.html`: title, description, OG/Twitter, icons, `theme-color`, `viewport-fit=cover`, canonical. Prerendering is the open SEO question in #2. |
| `process.env.*` | 8 | `import.meta.env.VITE_*` for public values. `GITHUB_API_TOKEN` and the contributions API URL move to the backend. `VERCEL_*` and `BUILD_TIMESTAMP` become Vite `define` values. |
| `@bprogress/next` | 2 (`providers`, `keyboard-shortcuts`) | Drop; there are no route transitions. |
| `nuqs/adapters/next/app` | 1 | Drop; v1 does not use it. |
| `@next/third-parties` (GTM) | 1 | Drop; analytics is undecided (#2). |
| `next/og` `ImageResponse` | 0 in the closure; `app/og/simple/route.tsx`, `app/og/domain/route.tsx` | Out of the v1 frontend. Use satori (+ resvg) in the backend, or a static PNG (open question in #2). The routes read `src/assets/fonts/Geist-SemiBold.ttf` and `GeistMono-Regular.ttf` (Geist is OFL), and `simple` embeds **his mark** as an inline SVG path, which must be replaced. |

## 3. Dependencies

These are the packages that the 136-file closure actually imports.

- **Keep (runtime):** `react`, `react-dom` (ref pins 19.3.0), `@base-ui/react`, `motion`, `next-themes`, `lucide-react`, `@hugeicons/react` + `@hugeicons/core-free-icons` (MIT; used for 2 icons in `recognition-item`, so swapping them for lucide is an option), `class-variance-authority`, `cn` (MIT; replaces clsx + tailwind-merge), `date-fns`, `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-external-links`, `unist-util-visit`, `unist-builder`, `react-hotkeys-hook` (the theme "D" hotkey and email/phone copy), `@rexa-developer/tiks` (MIT, synthesised UI sounds), `web-haptics` (MIT).
- **Keep (build/CSS):** `tailwindcss` 4.x, `@tailwindcss/typography`, `tw-animate-css`, `shadcn` (only for `@import "shadcn/tailwind.css"` in `globals.css`), `typescript`, and `schema-dts` (types only, if JSON-LD is kept).
- **Add:** `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` (4.3.3; replaces `@tailwindcss/postcss` + `postcss.config.mjs`), and the four Fontsource packages from §2.
- **Drop (in the closure but unneeded):** `next`, `geist`, `@next/third-parties`, `@bprogress/next`, `nuqs`, `jotai`, `server-only`, `@openpanel/web` + `zod` (if `trackEvent` is stubbed), `libphonenumber-js` (if there is no phone item).
- **Drop (outside the closure, only for out-of-scope features):** `p5`, `@visx/*`, `d3-array`, `cmdk`, `fumadocs-*`, `next-mdx-remote`, `hast-util-to-jsx-runtime`, `react-fast-marquee`, `react-medium-image-zoom`, `react-resizable-panels`, `react-use`, `react-hook-form`, `@hookform/resolvers`, `@ncdai/react-wheel-picker`, `@ncdai/react-swipe-actions`, `@number-flow/react`, `@c15t/nextjs`, `@date-fns/tz`, `@tabler/icons-react`, `dialkit`, `lru-cache`, `sharp`, `vcard-creator`, and every devDependency tied to MDX, shiki, the registry or puppeteer.

## 4. Server-side work for the Express backend

| What | Reference behaviour | Backend |
|---|---|---|
| GitHub contributions | `unstable_cache` ~ `fetch(${NEXT_PUBLIC_GITHUB_CONTRIBUTIONS_API_URL}/${username}?y=last)` with `.env.example` value `https://github-contributions-api.jogruber.de/v4`. It returns `[]` on a non-OK response and caches for 86400 s. The shape is `{ contributions: Activity[] }` (`Activity` from `registry/components/contribution-graph`). | `GET /api/contributions` → `Activity[]`, in-memory 24 h cache, `[]` on upstream failure (matching the reference). `graph.tsx` renders nothing for `[]`. |
| GitHub star count (header) | `unstable_cache` ~ `api.github.com/repos/ncdai/chanhdai.com` with `GITHUB_API_TOKEN`, 24 h | Probably drop: there is no repo to star. If kept, `GET /api/stars` with the token in backend env. |
| OG images | `next/og` routes `/og/simple?title&description` and `/og/domain` | satori route or a static image (open in #2). |
| Build info in the footer | `VERCEL_GIT_COMMIT_SHA`, `VERCEL_ENV`, `BUILD_TIMESTAMP`, `package.json` versions | Not backend: Vite `define` at build time from the host's git-SHA env var. Confirm the Railway variable name in the Railway research. |
| Pre-paint scripts | Inline in `<head>` | `index.html`, not backend. |

## 5. Risks and effort

**Risks, highest first**

1. **Brand-excluded centrepieces need new designs.** These are not mechanical ports, and they depend on the identity ticket:
   - the profile cover (`chanhdai-mark-isometric.tsx`: his mark, motion springs, cursor-follow, metal-click sound);
   - the footer logotype (`site-footer-brand.tsx`);
   - the header and footer mark;
   - the avatars;
   - the favicons and OG image.
2. **Theme flash in a SPA.** `next-themes` cannot inject its script before first paint without SSR. Mitigate with a blocking `<head>` script (§2) and `disableTransitionOnChange` (already set).
3. **`use(promise)` + Suspense in `github-contributions/graph.tsx`.** The promise must be stable across renders: create it once at module scope or cache it. If it is created inside render, the component suspends forever. The fallback is already in `graph.tsx`.
4. **SEO and link previews.** All metadata becomes static `index.html` tags, and there is no per-route metadata (fine for one page). Prerendering is the open question in #2.
5. **Motion.** It is used in 13 closure files (`motion/react`), which are framework-agnostic, so the risk is low. All of them respect `useReducedMotion`.
6. **Sound.** Click and metal-click are inline base64 MP3 data URIs (license `CC0`, author `Kenney`, per each asset file), plus `@rexa-developer/tiks` synthesis. Web Audio needs a user gesture, as it does in the reference. Low risk.
7. **p5.** Not in the v1 closure (only out-of-scope pages use it). No risk.
8. **The header shrinks.** Every `MAIN_NAV` link and the command menu point at out-of-scope pages, so the header becomes mark + GitHub + theme toggle. Decide whether that is the "visual difference" or whether to add in-page anchors.
9. **New sections have no reference component.** Publications (new) and the CV link in Overview must be composed from the existing `Panel`, `CollapsibleList`, `IconTile`, `Tag` and `Markdown` pieces (the `projects/` and `recognition/` items are the closest templates).

**Effort (one developer, excluding content writing and identity design):**

| Task | Estimate |
|---|---|
| Vite + Tailwind v4 + Fontsource + theme scaffold | ~0.5 d |
| Copy ~110 files, strip Next APIs, fix imports and types | ~0.5–1 d |
| Header/footer rework | ~0.5 d |
| Contributions endpoint plus wiring | ~0.5 d |
| Data files rewritten with Qiuyi's content | ~0.5 d of mechanical work |
| **Total** | **~2.5–3 d** |

Replacing the cover, mark and logotype comes on top, and its size depends on the identity decision.

## 6. Brand assets and CDN references to replace

The [TRADEMARK.md](https://github.com/ncdai/chanhdai.com/blob/1951e213749f58787fc2211cb1cfdc4f386de033/TRADEMARK.md) "If you fork" list names `chanhdai-wordmark.tsx`, `chanhdai-mark.tsx`, the `site-footer-brand.tsx` paths, `features/portfolio/data/`, `config/site.ts` and `app/manifest.webmanifest`. Within the v1 closure:

| Where | Reference |
|---|---|
| `app/layout.tsx` | `assets.chanhdai.com/images/{favicon.ico,favicon.svg,favicon-dark.svg,apple-touch-icon.png}`; `authors`/`creator: "ncdai"` |
| `features/portfolio/data/user.ts` | `assets.chanhdai.com/images/{chanhdai-avatar-ghibli.webp,avatar-sketch.webp,avatar-{light,dark}-{on,off}.webp,screenshot-og-image-dark.png}`, `assets.chanhdai.com/audio/chanhdai.mp3`, name/username/keywords, `about` copy |
| `features/portfolio/data/experiences.tsx` | `assets.chanhdai.com/images/companies/{shadcncraft.svg,quaric.svg,simplamo.webp,tungtung.webp}` |
| `features/portfolio/data/projects.tsx` | `ChanhDaiMark` icon, `react-wheel-picker.chanhdai.com`, `github.com/ncdai/chanhdai.com` |
| `features/portfolio/data/social-links.ts` | `x.com/iamncdai`, `github.com/ncdai`, `linkedin.com/in/ncdai`, `youtube.com/@ncdai` |
| `features/portfolio/data/{awards,certifications,intellectual-property}` | `drive.google.com` certificate links (his documents) |
| `config/site.ts` | `https://chanhdai.com` fallback URL, `ncdai/chanhdai.com` repo, `github.com/sponsors/ncdai`, `utm_source: "chanhdai.com"` |
| `components/chanhdai-mark.tsx` | His mark (SVG). Used by `site-header`, `site-footer-cad`, `data/projects` |
| `features/portfolio/components/chanhdai-mark-isometric.tsx` | His mark, isometric (profile cover) |
| `components/site-footer-brand.tsx` | His wordmark logotype paths |
| `components/site-footer-cad.tsx` | `SITE_TITLE = "chanhdai.com"`, OpenPanel `utm_source=chanhdai.com` link |
| `components/icons.tsx` | `TrustedRegistryIcon`, `ReactWheelPickerIcon`, `QuaricIcon`, `ZaDarkIcon` and `ShadcncraftIcon` are his projects' and employers' icons. They are unused in v1; delete them. |
| `styles/globals.css:206` | `@utility prose-ncdai`: rename it (cosmetic). |
| Outside the closure | `app/og/simple/route.tsx` embeds his mark path; `app/manifest.webmanifest` icons point at his CDN |

Keep `LICENSE` (MIT, "Copyright (c) 2026 Chánh Đại") with the copied code, per #2.
