# chanhdai.com port inventory

Answers [#4](https://github.com/Qiuyi-Hong/personal-website/issues/4) (map: #2): for each in-scope panel and utility, which files in [ncdai/chanhdai.com](https://github.com/ncdai/chanhdai.com) implement it, what data types it consumes, what it pulls in, what's excluded by `TRADEMARK.md`, and the minimal file + dependency set for a fresh Next.js 16 / Tailwind v4 / shadcn / next-themes app.

**Source:** the repo at commit [`1951e21`](https://github.com/ncdai/chanhdai.com/tree/1951e213749f58787fc2211cb1cfdc4f386de033) (2026-09-27, `HEAD` of `main` on 2026-10-09). All paths are relative to that tree, and every claim below was read from source there. Versions are the ones resolved in its `pnpm-lock.yaml`. `B:` is short for `https://github.com/ncdai/chanhdai.com/blob/1951e21/`.

## TL;DR

- **Port about 30 files.** That's the `Panel` primitives, 7 panel folders/files, 4 small shared components (`CollapsibleList`, `collapsible-animated`, `Markdown`, `InlineScript`), 3 registry components (`text-flip`, `chevrons-up-down-icon`, `copy-button` + `icon-swap`), 2 custom UI atoms (`IconTile`, `Tag`), the `globals.css` utilities and tokens, `typeset.css`, and `theme-toggle` plus a cut-down `command-menu`. **Rewrite all of `features/portfolio/data/*`.**
- **The UI layer is shadcn on Base UI, not Radix** (`components.json` `"style": "base-nova"`). The ported code uses Base UI's `render={...}` / `nativeButton` props on `TooltipTrigger`, `CollapsibleTrigger`, `CollapsibleContent` and `Button`. **Init the fresh app with a Base UI style**, or every port needs `render` → `asChild` rewrites.
- **`shimmer`, `scroll-fade`, `no-scrollbar` and the `data-open`/`data-closed` variants come from `shadcn/tailwind.css`** (shadcn@4.12.0 `dist/tailwind.css`), not from his repo. `screen-line-*`, `screen-dashed-line-*`, `stripe-divider`, `diagonal-stripes`, `link` and the `--line` token come from his `src/styles/globals.css`.
- **Excluded or identity-bound:** `ChanhDaiMarkIsometric` (the "Fig. 1." hero in the profile header), `ChanhDaiMark`/`ChanhDaiWordmark` (header, ⌘K footer, ⌘K "Brand Assets" group), all of `features/portfolio/data/*`, `config/site.ts` (`UTM_PARAMS = {utm_source: "chanhdai.com"}`, `SITE_INFO`, `MAIN_NAV`), the avatars/OG/favicons/pronunciation audio on `assets.chanhdai.com`, and the `prose-ncdai` utility name.
- **Strip from the ports:** analytics (`trackEvent` → OpenPanel + zod), sounds (`soundcn`), haptics (`web-haptics`, `@rexa-developer/tiks`), `@bprogress/next` router, `jotai`, and the phone item (`libphonenumber-js`). That leaves about 15 runtime deps (list below). **No env vars are needed** apart from optionally `NEXT_PUBLIC_APP_URL`.

## Page frame (needed by every panel)

| What | File | Notes |
|---|---|---|
| Home page composition | `src/app/(app)/page.tsx` | Container `mx-auto md:max-w-3xl` inside `[--separator-height:--spacing(8)]`. Panels are separated by a local `Separator` = `<div className="stripe-divider h-(--separator-height) w-full border-x">`. Also renders `JsonLdScript` (schema-dts) and Carbon Ads, both skip. |
| App shell | `src/app/(app)/layout.tsx` | `<main className="max-w-screen overflow-x-clip px-2">`. The `overflow-x-clip` is what keeps the 200vw `screen-line` pseudo-elements from causing horizontal scroll. Bottom fade bar, `SiteBottomNav`, `ScrollToTop`: optional. |
| Root layout | `src/app/layout.tsx` | `fontVariables` on `<html>`, `suppressHydrationWarning`, an inline pre-paint script that sets `meta[name=theme-color]` from `localStorage.theme` and adds `os-macos` to `<html>` (the ⌘K trigger uses `in-[.os-macos_&]` to show ⌘ vs Ctrl). GTM via `NEXT_PUBLIC_GTM_ID`, avatar-lights and sidebar scripts: skip. |
| Providers | `src/components/providers.tsx` | `ThemeProvider` (`attribute="class"`, `storageKey="theme"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, `enableColorScheme`) + `TooltipProvider` + `Toaster`. `JotaiProvider`, `ProgressProvider` (@bprogress) and `KeyboardShortcuts` are skippable. |
| Header | `src/components/site-header.tsx` | `screen-line-top screen-line-bottom … border-x md:max-w-3xl h-(--header-height)` holding the logo, `NavDesktop`, `CommandMenu`, `NavItemGitHub` and `ThemeToggle`. **Logo is `ChanhDaiMark` (excluded).** It feeds ⌘K from `getAllDocs()`, `BOOKMARKS` and `__blocks__.json`, all out of scope. |
| Fonts | `src/lib/fonts.ts` | `GeistSans`/`GeistMono` from `geist` (1.7.0); `IBM_Plex_Serif` (400) and `Caveat` (400, 500 → `--font-handwritten`) from `next/font/google`. Caveat drives the "Good morning" About title and `HandwrittenNote`. `src/assets/fonts/*` is unused by panels. |

## Utilities (CSS), all in `src/styles/globals.css`

Quoted verbatim (B:src/styles/globals.css):

```css
@utility screen-line-top { @apply relative; &:before { content: ""; @apply absolute top-0 left-[-100vw] -z-1 h-px w-[200vw] bg-line; } }
@utility screen-line-top-* { &:before { background-color: --value(--color-*, [color]); } }
@utility screen-line-bottom { @apply relative; &:after { content: ""; @apply absolute bottom-0 left-[-100vw] -z-1 h-px w-[200vw] bg-line; } }
@utility screen-line-bottom-* { &:after { background-color: --value(--color-*, [color]); } }
@utility screen-dashed-line-top { @apply screen-line-top; &:before { content: ""; @apply bg-inherit bg-[linear-gradient(to_right,var(--line)_4px,transparent_2px)] bg-size-[6px_1px] bg-repeat-x; } }
@utility screen-dashed-line-bottom { /* same, on :after */ }
@utility screen-line-top-none { @apply before:content-none; }
@utility screen-line-bottom-none { @apply after:content-none; }
@utility diagonal-stripes {
  @apply [--pattern-foreground:var(--color-line)]/56;
  @apply bg-[repeating-linear-gradient(315deg,var(--pattern-foreground)_0,var(--pattern-foreground)_1px,transparent_0,transparent_50%)] bg-size-[10px_10px];
}
@utility stripe-divider { @apply relative h-8; &:before { content: ""; @apply absolute left-[-100vw] -z-1 h-full w-[200vw] diagonal-stripes; } }
@utility link { @apply decoration-1 underline-offset-3 hover:underline; }
```

Supporting pieces from the same file:

- **The `--line` token** (the whole look hangs on it): `:root { --line: color-mix(in oklab, var(--border) 64%, var(--background)); }`, exposed as `--color-line` in `@theme inline`. Not overridden in `.dark` (it re-mixes from the dark `--border`/`--background`).
- **`--accent-muted`**: light `color-mix(in oklab, var(--accent) 50%, transparent)`, dark 20%. Used for row hover (`hover:bg-accent-muted`).
- **`--info`**: `oklch(0.67 0.17 244.98)`. The "current employer" ping dot.
- **Zinc palette tokens** in `:root`/`.dark` (white / zinc-950 background). Equivalent to shadcn `baseColor: "zinc"` plus `--line`, `--accent-muted`, `--info`, `--success`, `--link`, `--surface`, `--selection`.
- `--header-height: --spacing(14)`; `@layer base { [id] { @apply scroll-mt-18; } }`; a custom thin scrollbar.
- `@custom-variant dark (&:where(.dark, .dark *));` matches next-themes `attribute="class"`.
- Imports `tailwindcss`, `shadcn/tailwind.css` (the source of `shimmer`, `scroll-fade`, `no-scrollbar` and the data-state variants), `tw-animate-css`, `./typeset.css` and `@plugin "@tailwindcss/typography"`. Typography is only needed for `prose-ncdai` (the blog), so skip it.
- **`src/styles/typeset.css`** (499 lines, header says "shadcn/typeset, https://ui.shadcn.com/docs/typeset"). It provides `.typeset`; `globals.css` adds `.typeset-description { --typeset-size: 15px; --typeset-leading: 1.6; --typeset-flow: 1em; }`. Every Markdown description (About, experience, education, projects, recognition) renders inside `typeset typeset-description`.
- Skip: chart, sidebar, code-block, `--dk-*` (game), carbon, `prose-ncdai`, `step`, `dot-grid`, `scroll-fade-effect.css`, `style-preview.css`.

## Panel-by-panel

### Panel primitives (shared by all)

**`src/features/portfolio/components/panel.tsx`** has no deps beyond `cn`. It exports `Panel` (`<section data-slot="panel" className="screen-line-top screen-line-bottom border-x screen-line-bottom-border">`), `PanelHeader` (`screen-line-bottom px-4`), `PanelTitle` (`as?: "h2" | "div"`, `font-heading text-3xl font-medium tracking-tight`), `PanelTitleSup` (the "(N)" count), `PanelDescription` and `PanelContent` (`p-4`).
**`panel-title-copy.tsx`** is a hover "copy link to section" button. It uses `CopyButton` (→ registry `copy-button`) and `createHeadingUrl` from `src/components/heading.tsx` (a 10-line function, so inline it).

### 1. Profile header

**Files:** `src/features/portfolio/components/profile-header.tsx`, plus `flip-sentences.tsx`, `verified-icon.tsx`, `pronounce-my-name.tsx`, `handwritten-note.tsx` and **`chanhdai-mark-isometric.tsx` (excluded)**.

**Consumes:** `USER` (`src/features/portfolio/data/user.ts`), typed by `src/features/portfolio/types/user.ts`:

```ts
export type User = {
  firstName: string
  lastName: string
  /** Preferred public-facing name */
  displayName: string
  /** Handle/username used in links or mentions */
  username: string
  gender: "male" | "female" | "non-binary"
  /** e.g. "he/him", "she/her", "they/them" */
  pronouns: string
  bio: string
  /** Short phrases rotated in UI (e.g., homepage flip effect) */
  flipSentences: string[]
  /** General location for display */
  address: string
  /** E.164 format, base64 encoded (https://t.io.vn/base64-string-converter) */
  phoneNumberB64: string
  /** base64 encoded (https://t.io.vn/base64-string-converter) */
  emailB64: string
  /** Personal/homepage URL */
  website: string
  /** Primary/current role shown on profile */
  jobTitle: string
  /** Work history entries */
  jobs: { title: string; company: string; website: string; experienceId?: string }[]
  /** Rich about section; supports Markdown */
  about: string
  /** Public URL to avatar image */
  avatar: string
  avatarSketch?: string
  /** Different avatar variants based on theme and lighting */
  avatarVariants: AvatarLightsVariants
  /** Open Graph image URL for social sharing */
  ogImage: string
  /** Audio URL for name pronunciation */
  namePronunciationUrl: string
  /** SEO keywords list for metadata */
  keywords: string[]
  /** Time zone in IANA format (e.g., "Asia/Ho_Chi_Minh") */
  timeZone: string
  /** Profile/site start date in YYYY-MM-DD */
  dateCreated: string
}
```

Header reads: `displayName`, `flipSentences`, `avatar`, `avatarSketch`, `namePronunciationUrl`.

**Layout:** a 2-col grid. The right cell (`<figure>`) holds the isometric "CD" monogram SVG with a "Fig. 1." caption. The left cell is a round avatar (`size-30 … sm:size-40`; sketch image in light mode, photo in dark). Below them sit an `h1` name row and a `FlipSentences` row, separated by `border-line` rules.

**Pulls in:**
- `FlipSentences` → registry `text-flip` (`motion` 13.4.0: `AnimatePresence`, `useInView`, `usePageInView`) and the `shimmer shimmer-duration-1500 shimmer-once` classes (from `shadcn/tailwind.css`).
- `PronounceMyName` → `react-hotkeys-hook` (`p`), `registry/hooks/sound/use-sound`, `components/animated-icons/volume-icon`, `trackEvent`.
- `ChanhDaiMarkIsometric` → `motion`, `lib/soundcn/metal-click`, `hooks/soundcn/use-sound`.
- `VerifiedIcon` is an inline SVG with no deps.

**Trademark / identity:**
- `ChanhDaiMarkIsometric` is **his mark** (`"Designed by ncdai on Figma…"`, paths spell C and D). Excluded under "The `chanhdai` wordmark and mark, in any form".
- The avatar/sketch URLs are **his likeness**.
- His "Fig. 1." isometric hero plus sketch-avatar composition is the single most recognisable element of the site, so copying the composition with a different mark still risks "presentation close enough to make a reader mistake your site for mine".

**Recommendation:** keep the grid, `h1` and flip row. Replace the figure with something of ours, either the old site's `light_logo.png` mark or a CV/contact block (the map wants a prominent **CV download** here, which his header has no slot for). Drop `VerifiedIcon`: it's a Twitter-style "verified" badge with no meaning on a personal site. Drop `PronounceMyName` unless we record audio.

### 2. Social links

**Files:** `src/features/portfolio/components/social-links.tsx` and `social-link-icons.tsx`.

**Consumes:** `SOCIAL_LINKS` from `src/features/portfolio/data/social-links.ts`. The type is `src/features/portfolio/types/social-links.ts`:

```ts
/** A profile's identity is its key in the `SOCIAL` registry, not a field here. */
export type SocialProfile = {
  title: string
  handle: string
  href: string
  /** Opt-in: include this profile in JSON-LD `sameAs` (public profile page). */
  sameAs?: boolean
}
```

The data file derives `SocialName = keyof typeof SOCIAL` and `SocialLink = SocialProfile & { name: SocialName }`. `SOCIAL_ICONS: Record<SocialName, React.JSX.Element>` gives a compile-time-exhaustive icon map.

**Pulls in:** `Button` (`variant="outline" size="icon-sm" nativeButton={false} render={<a …/>}`, Base UI API), `Tooltip*`, `addQueryParams` (`src/utils/url.ts`, about 15 lines), `UTM_PARAMS` (identity: `utm_source: "chanhdai.com"`), icons from `src/components/icons.tsx` (`XIcon`, `GitHubIcon`, `LinkedInIcon`, `DiscordIcon`, `YouTubeIcon`), and `HandwrittenNote` ("follow me" arrow).

**Identity:** the data, the handles and `UTM_PARAMS`. Copy only the needed icon functions out of the 754-line `icons.tsx`. Note that line 650 `// Designed by @ncdai` marks `TrustedRegistryIcon`, which isn't needed.

### 3. Overview

**Files:** `src/features/portfolio/components/overview/index.tsx`, `intro-item.tsx`, `job-item.tsx`, `email-item.tsx`, `reveal-encoded-text.tsx`, `current-local-time-item.tsx` and `phone-item.tsx` (out of scope: no phone).

**Consumes:** `USER.jobs`, `USER.address`, `USER.timeZone`, `USER.emailB64`, `USER.phoneNumberB64`. Props types: `JobItemProps = { title: string; company: string; website: string; experienceId?: string }`, `EmailItemProps = { emailB64: string }` and `CurrentLocalTimeItemProps = { timeZone: string }`.

**How the encoded email works:**
- The server HTML carries only base64 (`emailB64`). `RevealEncodedTextScript` emits an `InlineScript` that `atob()`s it into the element before paint.
- Once hydrated, `useIsClient()` (a `useSyncExternalStore` hook) renders the real `mailto:`.
- `decodeEmail` in `src/utils/string.ts` is just `atob`, but that file also imports `@/lib/libphonenumber`, so copy only `decodeEmail`.

**Pulls in:**
- `lucide-react` (`MapPinIcon`, `MailIcon`, `CodeXmlIcon`, `LightbulbIcon`, `BriefcaseBusinessIcon`) and `IconTile` (`src/components/ui/icon-tile.tsx`).
- `InlineScript` (`src/components/inline-script.tsx`, 15 lines: `type="text/javascript"` on the server, `text/plain` on the client, to avoid React's script warning).
- `CopyButton`, `react-hotkeys-hook` (`shift+e` copies the email), `toast` (Base UI toast), `useTiks`, `trackEvent` and `copyToClipboardWithEvent`.
- The `JobItem` company link either jumps to `#experience-${experienceId}` or opens `website` with UTM params.
- The location links to Google Maps search, plain URL with no API key.
- The two-column dashed centre rule is a positioned `border-dashed border-line` div.

**Strip:** `PhoneItem` (and with it `libphonenumber-js` and `src/assets/libphonenumber.metadata.json`), the `shift+e` hotkey/toast (or keep, but then `Toaster` must be mounted), tiks and analytics.

### 4. About

**Files:** `src/features/portfolio/components/hello.tsx` and `hello-title.tsx`. The panel id is `hello`, the visible title is a time-of-day greeting in Caveat, and the `sr-only` `h2` says "About".

**Consumes:** `USER.about: string` (Markdown).

**Pulls in:**
- `Markdown` (`src/components/markdown.tsx`): `MarkdownAsync` from `react-markdown` 10.1.0 with `remark-gfm` 4.0.1, `rehype-raw` 7.0.0, `rehype-external-links` 3.0.0 (`target=_blank rel="nofollow noopener"`) and `rehypeAddQueryParams` (`src/lib/rehype-add-query-params.ts` → `unist-util-visit` 5.x, `src/types/unist.ts`, `UTM_PARAMS`).
- `InlineScript` (greeting painted before hydration, then `useSyncExternalStore`).
- The `.typeset .typeset-description` CSS.

**Note:** `MarkdownAsync` is an **async server component**, so it can't be rendered from inside a `"use client"` file.

### 5. Tech stack

**Files:** `src/features/portfolio/components/tech-stack.tsx`.

**Consumes:** `TECH_STACK` (`src/features/portfolio/data/tech-stack.tsx`), typed by `src/features/portfolio/types/tech-stack.ts`:

```ts
export type TechStack = {
  key: string
  title: string
  href: string
  icon: React.ReactElement
  categories: string[]
}
```

**Pulls in:** `Panel*`, `PanelTitleCopy`. No other deps. Rows are grouped by `categories` (an item can appear in several), numbered `01`, `02`, … in mono, with a dashed column rule at `--col-left-width: --spacing(48)`. Icons are inline SVGs in the data file, some imported from `components/icons.tsx` (`TsIcon`, `JsIcon`, `BunIcon`, `VercelIcon`, `ShadcnIcon`, `OpenAIIcon`, `GitHubIcon`). Brand logos are third-party marks, not his. Data is his, so rewrite it.

### 6. Experience

**Files:** `src/features/portfolio/components/experiences/index.tsx`, `experience-item.tsx` and `experience-position-item.tsx`.

**Consumes:** `EXPERIENCES` (`data/experiences.tsx`), typed by `src/features/portfolio/types/experiences.ts`:

```ts
export type ExperiencePosition = {
  id: string
  title: string
  /** Use "MM.YYYY" or "YYYY" format. Omit `end` for current roles. */
  employmentPeriod: { start: string; end?: string }
  /** Full-time | Part-time | Contract | Internship, etc. */
  employmentType?: string
  description?: string
  /** UI icon to represent the role type. */
  icon?: React.ReactElement
  skills?: string[]
  /** Whether the position is expanded by default in the UI. */
  isExpanded?: boolean
}

export type Experience = {
  id: string
  companyName: string
  /** URL to the company logo (absolute URL or path under /public). */
  companyLogo?: string
  /** UI icon to represent the company; used if `companyLogo` is not provided. */
  companyIcon?: React.ReactElement
  /** URL to the company's website. */
  companyWebsite?: string
  location?: string
  locationType?: "On-site" | "Hybrid" | "Remote"
  /** Roles held at this company; keep newest first for display. */
  positions: ExperiencePosition[]
  /** Marks the company as the current employer for highlighting. */
  isCurrentEmployer?: boolean
}
```

**Pulls in:**
- `date-fns` 4.1.0 (`differenceInMonths` and `parse` for a "2y 3m" duration).
- `next/image` with `unoptimized` for the logo (grayscale → colour on hover). No `images.remotePatterns` is needed because of `unoptimized`, but logos are currently on `assets.chanhdai.com`, so host ours under `/public`.
- `Collapsible` (Base UI), `collapsible-animated.tsx` (context wrapper plus `CollapsibleChevronsUpDownIcon` → registry `chevrons-up-down-icon` → `motion`), `IconTile`, `Separator` (Base UI), `Tag`, `Markdown`, `Button` and `lucide-react`.
- `index.tsx` shows `MAX = 3` companies and puts the rest behind "Show more".

**Also available as a published registry item:** `@ncdai/work-experience` (`https://chanhdai.com/r/work-experience.json`, HTTP 200). It's a standalone version with deps `react-markdown`, `date-fns` and `lucide-react`.

### 7. Education

**Files:** `src/features/portfolio/components/education/index.tsx` and `education-item.tsx`.

**Consumes:** `EDUCATION` (`data/education.ts`), typed by `src/features/portfolio/types/education.ts`:

```ts
export type Education = {
  id: string
  school: string
  degree?: string
  fieldOfStudy?: string
  period: { start: string; end?: string }
  description?: string
  skills?: string[]
  isExpanded?: boolean
}
```

**Pulls in:** the same set as Experience minus `date-fns` and `next/image`. Rows are anchored as `#education-${id}`.

### 8. Projects

**Files:** `src/features/portfolio/components/projects/index.tsx` and `project-item.tsx`.

**Consumes:** `PROJECTS` (`data/projects.tsx`), typed by `src/features/portfolio/types/projects.ts`:

```ts
export type Project = {
  /** Stable unique identifier (used as list key/anchor). */
  id: string
  title: string
  /** Use "MM.YYYY" format. Omit `end` for ongoing projects. */
  period: { start: string; end?: string }
  /** Public URL (site, repository, demo, or video). */
  link: string
  /** Tags/technologies for chips or filtering. */
  skills: string[]
  /** Optional rich description; Markdown and line breaks supported. */
  description?: string
  /** Inline SVG icon, framed in a tile; defaults to a box icon. */
  icon?: React.ReactElement
  /** Whether the project card is expanded by default in the UI. */
  isExpanded?: boolean
}
```

**Pulls in:**
- `CollapsibleList` (`src/components/collapsible-list.tsx`): a generic `CollapsibleList<T>({ items, max = 3, keyExtractor?, renderItem })` with a "Show more" button. Projects uses `max={4}`.
- `Collapsible*`, `IconTile`, `Tag`, `Tooltip*`, `Markdown`, `addQueryParams` + `UTM_PARAMS`, and `lucide-react`.

**Identity:** his project icons (`ReactWheelPickerIcon`, `QuaricIcon`, `ZaDarkIcon`, `ChanhDaiMark`) live in the data file.

### 9. Recognition

**Files:** `src/features/portfolio/components/recognition/index.tsx` and `recognition-item.tsx`.

**Consumes:** `RECOGNITION` (`data/recognition.ts`), which merges `AWARDS`, `CERTIFICATIONS` and `INTELLECTUAL_PROPERTY`, sorts them newest-first with `date-fns` `compareDesc`, and pins `RECOGNITION_PINNED_KEYS` first. The data also has a `recognition.test.ts` (vitest). Types:

```ts
// types/recognition.ts
export type AwardRecognition = {
  kind: "award"
  key: string
  /** Raw source date: "YYYY-MM" or "YYYY". */
  date: string
  award: Award
}
export type CredentialRecognition = {
  kind: "certificate" | "trademark" | "copyright"
  key: string
  /** Raw source date: "YYYY-MM-DD". */
  date: string
  credential: Certification
}
export type RecognitionEntry = AwardRecognition | CredentialRecognition
export type RecognitionKind = RecognitionEntry["kind"]

// types/awards.ts
export type Award = {
  id: string
  prize: string
  title: string
  /** Format: "YYYY-MM" preferred (e.g., "2018-03"); "YYYY" is also accepted. */
  date: string
  /** School level or context label (e.g., "Grade 10", "University", "Personal Project"). */
  grade: string
  icon?: React.ReactElement
  description?: string
  referenceLink?: string
}

// types/certifications.ts
export type Certification = {
  title: string
  issuer: string
  /** Must match a supported icon name (e.g., "vercel", "coursera", "meta", "google", "microsoft", "accenture", "trademark", "copyright"). */
  issuerIconName?: string
  /** Issue date in ISO format (YYYY-MM-DD). */
  issueDate: string
  credentialID: string
  credentialURL: string
}
```

**Pulls in:**
- `@hugeicons/react` 1.1.6 and `@hugeicons/core-free-icons` 4.1.1 (only for the copyright/trademark icons).
- `date-fns` `format`, `lucide-react` and the issuer brand icons from `components/icons.tsx`.
- `CollapsibleList` (`max={6}`), `Collapsible*`, `IconTile`, `Separator`, `Tag`, `Tooltip*` and `Markdown`.

**Fit:** `trademark`/`copyright` kinds and `Award.grade` are shaped around his history. Trim the kinds to what we need (likely `award | certificate`) and drop hugeicons.

## Theme toggle

**File:** `src/components/theme-toggle.tsx`. A ghost `icon-sm` Button shows the "Dark Side" half-circle SVG (adapted from toggles.dev), rotated 180° in dark via `dark:rotate-180` with `transition-transform!` to beat next-themes' `disableTransitionOnChange`. It has a Tooltip with a `<Kbd>D</Kbd>` hint, and the `d` hotkey comes from `react-hotkeys-hook`.

The logic is `setTheme(next === systemTheme ? "system" : next)` plus `setMetaColor(...)`.

**Pulls in:** `next-themes` 0.4.6, `react-hotkeys-hook` 5.3.2, `useMetaColor` (`src/hooks/use-meta-color.ts`, which needs `META_THEME_COLORS = { light: "#ffffff", dark: "#09090b" }` from `config/site.ts`), `useClickSound` (soundcn, strip it), `Tooltip`, `Button` and `Kbd` (`src/components/ui/kbd.tsx`, customised). The registry also has a separate 3-way `theme-switcher` (`@ncdai/theme-switcher`, deps `next-themes motion lucide-react`) that the site doesn't use in the header.

## ⌘K command menu

**Files:** `src/components/command-menu.tsx` (761 lines), `src/components/ui/command.tsx` (cmdk wrapper inside `ui/dialog.tsx` → Base UI Dialog) and `src/hooks/use-mutation-observer.ts`.

**Behaviour:**
- `useHotkeys("mod+k, slash")` toggles the menu.
- The trigger button shows ⌘K on macOS and Ctrl K elsewhere, keyed off the `os-macos` class set by the root-layout script.
- Groups are Menu (site pages with `GH`/`GC`… "go to" shortcut labels), Portfolio (`/#hello`, `/#stack`, `/#experience`, `/#education`, `/#projects`, `/#recognition`), Components, Blocks, Blog, Bookmarks, Social Links (from `SOCIAL_LINKS` + `SOCIAL_ICONS`), **Brand Assets**, Theme (light/dark/system) and Other (vCard, llms.txt, RSS).
- The footer shows a context label ("Go to page" / "Open link" / "Run command"). It's driven by watching `aria-selected` on each `CommandItem` with a `MutationObserver`.

**Local types:**

```ts
type CommandKind = "command" | "page" | "link" | "component" | "block" | "bookmark"
type CommandLinkItem = {
  title: string
  href: string
  kind: CommandKind
  icon?: React.ReactElement
  iconImage?: string
  shortcut?: string
  keywords?: string[]
  openInNewTab?: boolean
}
// props: { docs: DocPreview[]; blocks: BlockItem[]; bookmarks: BookmarkPreview[]; enabledHotkeys?: boolean }
```

**Pulls in:** `cmdk` 1.1.1, `@bprogress/next/app` `useRouter` (swap for `next/navigation`), `@hugeicons/*`, `@rexa-developer/tiks`, `lucide-react`, `next-themes`, `react-hotkeys-hook`, `trackEvent`, `useClickSound`, `toast`, `features/bookmark/*`, `features/doc/*`, `ComponentIcon`, `ChanhDaiMark`/`getMarkSVG`, `getWordmarkSVG`, and `icons.tsx` (`SearchIcon`, `GridViewIcon`, `NewsIcon`, `FavouriteIcon`, `ReactIcon`).

**Identity:** the "Brand Assets" group (copy his mark/wordmark SVG, `/blog/chanhdai-brand`, `https://assets.chanhdai.com/chanhdai-brand.zip`) and the `ChanhDaiMark` in the Home item and the footer.

**Port plan:** take the component skeleton (trigger, dialog, `CommandLinkGroup`, footer action label, Theme group). Delete the docs/blocks/bookmarks/brand groups and props, swap the router, and drop analytics and sounds. That leaves roughly 250 lines. Contents are the map's open "Command menu contents" item: likely panels, socials, CV download, copy email, theme.

## Trademark / identity summary

`TRADEMARK.md` (verbatim excerpts): excluded from the MIT grant are *"The names `chanhdai`, `ncdai`, and `chanhdai.com`"*, *"The `chanhdai` wordmark and mark, in any form, including their SVG source"*, *"Avatars, portraits, and other likenesses of me"* and *"Any presentation close enough to make a reader mistake your site for mine"*. Its fork checklist names `src/components/chanhdai-wordmark.tsx`, `src/components/chanhdai-mark.tsx`, `src/components/site-footer-brand.tsx`, `src/features/portfolio/data/`, `src/config/site.ts` and `src/app/manifest.webmanifest`. The `LICENSE` is MIT, "Copyright (c) 2026 Chánh Đại". **Keep that notice in a `LICENSE`/credits file for ported code.**

| Item | Where it touches our scope | Action |
|---|---|---|
| `ChanhDaiMarkIsometric`, `ChanhDaiMark`, `ChanhDaiWordmark` | Profile header figure, site header logo, ⌘K Home/footer/Brand Assets | **Do not port.** Use our own logo (old site `light_logo.png`). |
| `features/portfolio/data/*` (user, social-links, tech-stack, experiences, education, projects, awards, certifications, intellectual-property, recognition) | Every panel | **Rewrite** with Qiuyi's content pack. Port the `types/*` only. |
| `config/site.ts` | `UTM_PARAMS` (`utm_source: "chanhdai.com"`), `SITE_INFO`, `MAIN_NAV`, `X_HANDLE`, `SOURCE_CODE_*`, `SPONSORSHIP_URL` | Rewrite. Keep only `META_THEME_COLORS` and our own `UTM_PARAMS` (or none, see Publications). |
| `assets.chanhdai.com/*` (avatars, favicon, OG, company logos, pronunciation mp3) | `USER`, root layout `icons`, experience logos | Replace with our own files under `/public`. |
| `prose-ncdai` utility | Blog only | Not needed. |
| `icons.tsx` `TrustedRegistryIcon` ("Designed by @ncdai"), `ReactWheelPickerIcon`, `QuaricIcon`, `ZaDarkIcon`, `ShadcncraftIcon` | Not needed | Copy only the generic brand icons we use. |
| Overall composition (isometric "Fig. 1." hero + sketch avatar + Caveat handwritten notes "follow me" / "follows your cursor") | Profile header, social links | Highest "mistaken for his site" risk. Change the hero and consider dropping the handwritten notes. |

## Minimal file set for the fresh app

Paths are his. Suggested targets assume a shadcn layout (`@/components`, `@/components/ui`, `@/lib`, `@/hooks`). Mark: **C** = copy as-is, **E** = copy and edit (strip analytics/sound/identity), **R** = rewrite from scratch (our data), **I** = install via CLI instead of copying.

**Styles and layout**
1. `src/styles/globals.css` **E**: keep imports (`tailwindcss`, `shadcn/tailwind.css`, `tw-animate-css`, `./typeset.css`), `@custom-variant dark`, the `@theme inline` colour/font block (minus chart/sidebar), `link`, `screen-line-*`, `screen-dashed-line-*`, `diagonal-stripes`, `stripe-divider`, `extend-touch-target`, the `:root`/`.dark` tokens (minus chart/`--dk-*`), `@layer base`, and `.typeset-description`.
2. `src/styles/typeset.css` **C** (shadcn typeset).
3. `src/lib/fonts.ts` **C** (Geist Sans/Mono + Caveat; drop IBM Plex Serif unless used).
4. `src/app/layout.tsx` **E** (fonts, theme-color/`os-macos` script, Providers; drop GTM, avatar-lights, sidebar, JSON-LD unless the SEO ticket wants it).
5. `src/app/(app)/layout.tsx` **E** (header + `main` with `overflow-x-clip px-2`).
6. `src/app/(app)/page.tsx` **E** (panel order + stripe `Separator`).
7. `src/components/providers.tsx` **E** (ThemeProvider + TooltipProvider [+ Toaster if toast kept]).
8. `src/components/site-header.tsx` **E** (our logo, ThemeToggle, CommandMenu; drop NavDesktop/GitHub stars unless wanted).

**Panels** (`src/features/portfolio/…`)

9. `components/panel.tsx` **C**
10. `components/panel-title-copy.tsx` **C** (inline `createHeadingUrl`)
11. `components/profile-header.tsx` **E** (new figure/CV slot)
12. `components/flip-sentences.tsx` **C**
13. `components/handwritten-note.tsx` **C** (optional)
14. `components/social-links.tsx` + `social-link-icons.tsx` **E**
15. `components/overview/{index,intro-item,job-item,email-item,reveal-encoded-text,current-local-time-item}.tsx` **E** (drop phone, tiks, analytics)
16. `components/hello.tsx` + `hello-title.tsx` **C**
17. `components/tech-stack.tsx` **C**
18. `components/experiences/{index,experience-item,experience-position-item}.tsx` **C**
19. `components/education/{index,education-item}.tsx` **C**
20. `components/projects/{index,project-item}.tsx` **C**
21. `components/recognition/{index,recognition-item}.tsx` **E** (trim kinds, drop hugeicons)
22. `types/{user,social-links,tech-stack,experiences,education,projects,recognition,awards,certifications}.ts` **E** (`User`: drop `avatarVariants`/`AvatarLightsVariants` import, phone, gender/pronouns if unused; add `cvUrl`)
23. `data/*` **R**

**Shared components** (`src/components/…`)

24. `collapsible-list.tsx` **C**
25. `collapsible-animated.tsx` **E** (drop `CollapsibleChevronDownIcon` → removes `animated-icons/chevron-down-icon`)
26. `markdown.tsx` **C** (+ `src/lib/rehype-add-query-params.ts`, `src/types/unist.ts` if UTM is kept; else drop that plugin)
27. `inline-script.tsx` **C**
28. `copy-button.tsx` **E** (drop `trackEvent` wrapper, or just use the registry primitive directly)
29. `theme-toggle.tsx` **E** (drop `useClickSound`) + `src/hooks/use-meta-color.ts` **C**
30. `command-menu.tsx` **E** (heavy cut, see above) + `src/hooks/use-mutation-observer.ts` **C**
31. `icons.tsx` **E** (extract only the needed icons into a small file)
32. `ui/icon-tile.tsx` **C**, `ui/tag.tsx` **C**, `ui/kbd.tsx` **C** (customised vs stock shadcn)
33. `ui/{button,tooltip,collapsible,separator,dialog,command}.tsx` (+ `ui/toast.tsx` if kept) **I** via `shadcn add` with a Base UI style, then diff against his. His `button` has `icon-xs`/`icon-sm` sizes and his `tooltip` defaults `delay = 0`.
34. `src/hooks/use-is-client.ts` **C**
35. `src/lib/utils.ts` (`export { cn } from "cn"` + `absoluteUrl`) **C**, or keep shadcn's default `clsx`+`tailwind-merge` `cn`
36. `src/utils/url.ts` (`addQueryParams`) **C**. From `src/utils/string.ts` copy `decodeEmail` only (the file imports libphonenumber).

**Registry components:** **I** via `npx shadcn add @ncdai/<name>` (registry `https://chanhdai.com/r/{name}.json`, all checked HTTP 200 on 2026-10-09), or copy from `src/registry/components/<name>/`:

- `text-flip` (deps: `motion`)
- `chevrons-up-down-icon` (deps: `motion`)
- `copy-button` (deps: `motion`, `@rexa-developer/tiks`, `web-haptics`, `lucide-react`; registryDeps: `button`, `icon-swap`). Its hook `src/hooks/use-copy-to-clipboard.ts` calls `useWebHaptics` and `useTiks`. **Edit those two out** to avoid two deps.
- `icon-swap` (deps: `motion`)

## Dependency list (fresh app)

Versions are what his lockfile resolves today. Pin to current minors at build time: npm latest is `next@16.4.0` and `shadcn@4.21.4` as of 2026-10-09.

**Runtime**

| Package | His version | Needed for |
|---|---|---|
| `next` | 16.3.5 | app |
| `react`, `react-dom` | 19.3.0 | app |
| `next-themes` | 0.4.6 | theme |
| `@base-ui/react` | 1.8.0 | shadcn Base UI primitives (button, tooltip, collapsible, separator, dialog[, toast]) |
| `class-variance-authority` | 0.7.1 | `buttonVariants` |
| `cn` | 0.3.0 | `cn()` (shadcn-ui/cn, drop-in for `clsx` + `tailwind-merge`). Either works. |
| `lucide-react` | 1.14.0 | icons |
| `motion` | 13.4.0 | text-flip, chevrons icon, icon-swap/copy-button |
| `cmdk` | 1.1.1 | ⌘K |
| `react-hotkeys-hook` | 5.3.2 | ⌘K, `d` theme, `shift+e` |
| `date-fns` | 4.1.0 | experience durations, recognition dates/sort |
| `react-markdown` | 10.1.0 | `Markdown` |
| `remark-gfm` | 4.0.1 | `Markdown` |
| `rehype-raw` | 7.0.0 | `Markdown` (his is a devDependency, but it is used at runtime) |
| `rehype-external-links` | 3.0.0 | `Markdown` (same note) |
| `geist` | 1.7.0 | fonts |
| `unist-util-visit` | 5.x | only if `rehypeAddQueryParams` is kept |

**Dev:** `tailwindcss` 4.3.3, `@tailwindcss/postcss` 4.3.3, `tw-animate-css` 1.4.0, `shadcn` 4.12.0 (it must stay installed: `globals.css` `@import "shadcn/tailwind.css"` resolves from it), `typescript`, `@types/react*`.

**Dropped:** `@openpanel/web`, `zod` (only for `trackEvent`), `@bprogress/next`, `jotai`, `nuqs`, `@hugeicons/*`, `@rexa-developer/tiks`, `web-haptics`, `libphonenumber-js`, `schema-dts` (unless JSON-LD is kept), `@next/third-parties`, `@tailwindcss/typography`, and everything blog/registry/charts/game.

**Env vars:** none required. `NEXT_PUBLIC_APP_URL` is only read by `absoluteUrl()` (JSON-LD) and as the `metadataBase` fallback. Everything else in his `.env.example` (OpenPanel, GTM, GitHub token, contributions API, Carbon, DMCA, Discord, R2, registry namespace) belongs to out-of-scope features.

**Assets we must supply:** avatar (one image, or light/dark pair), logo mark (`light_logo.png`), optional company logos (24px, `/public`), favicon/apple-touch icon, static OG image, CV PDF.

## Reusing this for a new Publications panel: what's awkward

The cheapest route is a `Publications` panel cloned from **Projects** (`Panel` + `CollapsibleList` + a `PublicationItem` row in the `IconTile | dashed rule | title/meta | link | chevron` shape). The rough edges:

1. **`Project` has the wrong shape.** It has one `link: string`, required `skills: string[]`, and a `period {start, end?}` (a single date only works through the `end === start` trick in `ProjectItem`). A paper needs `authors: string[]` (with Qiuyi's name highlighted), `venue`, `year`, several links (`pdf`, `doi`, `arxiv`, `code`, `slides`), and maybe `bibtex` and `status` ("under review"). Write a new `Publication` type and item; don't bend `Project`.
2. **UTM params get appended to every outbound link.** `ProjectItem` wraps `project.link` in `addQueryParams(link, UTM_PARAMS)`, and `Markdown` runs `rehypeAddQueryParams` on all links in descriptions. That would add `?utm_source=…` to doi.org/arXiv/publisher URLs: ugly, sometimes breaks cache keys, pointless. Turn it off for publications, or drop UTM site-wide.
3. **One link icon per row.** The row layout has room for a single `size-6` link and a chevron. Several paper links need a small inline link list (e.g. `Tag`-style chips: PDF · DOI · Code) in the meta line or the expanded body.
4. **`Markdown` is async/server-only** (`MarkdownAsync`). A client-side "Copy BibTeX" `CopyButton` (client) is fine *next to* it, but the item can't become one `"use client"` component that renders `Markdown`. Keep the item a server component and island the copy button.
5. **Date formatting has a timezone bug.** Recognition's `DateTerm` does `format(new Date(date), "MM.yyyy")`. `new Date("2024-05")` and `new Date("2025-12-01")` parse as UTC midnight, so in US time zones they render a month early. Verified: `TZ=America/New_York node -e 'new Date("2024-05").getMonth()+1'` prints `4`. Experience/Projects avoid this because they show raw `"MM.YYYY"` strings. Publications should store display strings (or parse with `date-fns` `parse`, as `formatDuration` does), not `new Date(iso)`.
6. **Grouping and sorting.** `CollapsibleList` has no grouping. Seven papers grouped by year (or journal vs conference) would need either the Tech Stack grouped-row pattern (category column + numbered rows) or several lists. `CollapsibleList`'s `max` default is 3 (Projects 4, Recognition 6). Pick 3–4 so the differentiator shows above the fold.
7. **⌘K has a hard-coded "Portfolio" group** (`PORTFOLIO_LINKS` with `/#hello`, `/#stack`, …). Add `/#publications` by hand. The panel `ID` constants live in each panel file, not in one shared list.
8. **Duplication with Projects.** The map notes one project duplicates a publication. Nothing in the types links them (no `publicationId` on `Project`, unlike `User.jobs[].experienceId` → `#experience-…`). If we cross-link, follow that `experienceId` precedent with a `#publication-${id}` anchor.
