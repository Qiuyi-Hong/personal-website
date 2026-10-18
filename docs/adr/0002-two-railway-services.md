# Two Railway services, with the frontend proxying `/api` over the private network

The site runs as two Railway services in one project. `frontend` is the Vite build served by Railpack's Caddy, and `backend` is Express. This carries the frontend/backend split from ADR 0001 into hosting, so each side deploys and restarts independently. A frontend-only change doesn't redeploy the backend. Both custom domains (`www.qiuyihong.com` and the apex) sit on `frontend`. Its `Caddyfile` proxies `/api/*` to the backend's private domain and 301s the apex to www. The browser therefore sees one origin, and the backend has no public custom domain.

## Considered Options

- **One service** (Express serves `/api` and `frontend/dist`). The research for #9 recommended this one. It's simpler: one deploy and one CDN. It was rejected because the frontend and backend could no longer deploy separately.
- **Two services with a public `api.qiuyihong.com`.** Rejected because it needs a CORS allow-list covering every PR environment URL, a third custom domain, and the API URL baked into the frontend build.

## Consequences

- `frontend/Caddyfile` replaces Railpack's default. It must keep the SPA `index.html` fallback, and it reads the backend address from `BACKEND_URL` (`http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}`).
- Express listens on `::`, because Railway's private network may be IPv6-only.
- Each service uses its own folder as its Railway root directory, with matching watch paths. The root `package.json` `--prefix` scripts are for local development only.
- Each PR environment runs two containers. Private domains are per environment, so a PR's frontend reaches that PR's backend with no extra wiring.
