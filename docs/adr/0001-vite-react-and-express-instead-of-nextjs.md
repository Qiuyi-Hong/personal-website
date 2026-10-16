# Vite + React frontend and Express backend instead of Next.js

The design is ported from chanhdai.com, which is a Next.js app. We still split the site into a Vite + React `frontend/` and an Express + TypeScript `backend/`. A root `package.json` installs both via `npm --prefix` scripts. The owner wants a separate frontend and backend rather than Next.js doing both. The backend's job is small: the GitHub contributions graph, OG images, and possibly a contact form.

## Considered Options

- **Copy chanhdai.com as a Next.js app.** Cheapest route to "as close as possible", but rejected because Next.js fills both the frontend and backend roles.
- **Next.js as a static-export frontend only.** Rejected in favour of Vite + React.
- **npm workspaces.** Rejected because they hoist dependencies to the root `node_modules` by default. `--install-strategy=linked` keeps them per folder but is experimental. Plain `--prefix` scripts keep each folder's `node_modules` and lockfile separate.

## Consequences

- The reference components must be ported off Next.js APIs: `next/link`, `next/image`, `next/font`, server components, `next/og`.
- Server-side work they did inline moves to Express endpoints.
- A single-page app needs its own answer for SEO and social previews.
