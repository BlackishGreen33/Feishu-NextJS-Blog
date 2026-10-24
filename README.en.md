<h1 align="center">Feishu NextJS Blog</h1>

<p align="center">
  <a href="https://github.com/BlackishGreen33/Feishu-NextJS-Blog"><img src="https://img.shields.io/github/stars/BlackishGreen33/Feishu-NextJS-Blog?style=flat&logo=github" alt="GitHub stars" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/BlackishGreen33/Feishu-NextJS-Blog" alt="License" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2.4-000000?logo=next.js" alt="Next.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.2.5-149eca?logo=react" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-6.0.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-4.2.2-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://open.feishu.cn/"><img src="https://img.shields.io/badge/Feishu-Wiki_Sync-00C2A8" alt="Feishu Wiki Sync" /></a>
  <a href="https://vercel.com/docs/vercel-blob"><img src="https://img.shields.io/badge/Vercel-Blob-black?logo=vercel" alt="Vercel Blob" /></a>
</p>

<p align="center">
  <a href="./README.md">繁體中文</a> · <a href="./README.zh-CN.md">简体中文</a> · English
</p>

<p align="center">
  A multilingual Next.js content site powered by Feishu as the authoring source, built around a sync-first pipeline instead of embedding Feishu pages directly in the frontend.
</p>

<p align="center">
  <a href="https://blog.blackishgreen.dpdns.org">Live Site</a>
  ·
  <a href="https://blackishgreen.vercel.app">Vercel Deployment</a>
  ·
  <a href="#highlight">Highlight</a>
  ·
  <a href="#architecture">Architecture</a>
  ·
  <a href="#quick-start">Quick Start</a>
  ·
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="./.github/assets/readme/homepage-dark.png" alt="Homepage screenshot" width="1200" />
</p>

> [!IMPORTANT]
> This project is built around `Feishu Wiki / Docx -> Markdown + Article JSON + Assets -> Next.js Rendering`. Content is synced and normalized before render time instead of embedding Feishu pages directly in the frontend.

## Why This Project

Teams that use document platforms as a CMS usually run into the same problems:

- embedding third-party docs in the frontend limits SEO, styling control and loading performance
- homepage, list pages and detail pages drift apart because they do not share one normalized content model
- assets, attachments, frontmatter, internal links and locale-aware routing are often left inconsistent

This repository exists to show a more production-oriented approach: keep Feishu as the writing surface, but give the Next.js site its own content model, asset pipeline and deployment strategy.

## Highlight

- Uses a Feishu knowledge base space as the content source through official APIs
- Converts Feishu block JSON into Markdown with `feishu-docx`
- Downloads images and attachments, then rewrites them into site-renderable assets
- Uses one normalized `Article` model across the homepage, blog list and article detail pages
- Supports `zh-TW`, `zh-CN`, and `en` locales with canonical and alternate SEO setup
- Includes article search, command palette search, and `Cmd/Ctrl + K` shortcuts
- Ships with Home, Dashboard, Projects, Blog, Learn, About, Contact, Guestbook, and Playground pages
- Supports optional Firebase-powered guestbook and chat widget flows
- Switches between local filesystem storage and Vercel Blob
- Runs scheduled sync jobs through Vercel Cron instead of querying Feishu directly at request time

## Architecture

```mermaid
flowchart LR
    A["Feishu Wiki / Docx"] --> B["Sync Script"]
    B --> C["Markdown"]
    B --> D["Article JSON Index"]
    B --> E["Downloaded Assets"]
    C --> F["Next.js Pages Router"]
    D --> F
    E --> F
    E --> G["Local Filesystem or Vercel Blob"]
    F --> H["Home / Blog / Learn / Projects / Dashboard / Guestbook"]
```

## Tech Stack

| Layer                | Stack                                       |
| -------------------- | ------------------------------------------- |
| Framework            | Next.js 16, React 19, TypeScript            |
| Styling              | Tailwind CSS 4, Framer Motion, next-themes  |
| Content              | Feishu Open API, `feishu-docx`, gray-matter |
| Data Fetching        | SWR, Axios                                  |
| Storage              | Local filesystem, Vercel Blob               |
| Interactive Features | Firebase, command palette, JS playground    |
| Quality Gates        | ESLint, Prettier, TypeScript, Jest          |

## Project Layout

```text
.
├── data/feishu-blog/           # synced article index and generated article JSON
├── public/feishu-assets/       # downloaded covers and article assets
├── scripts/                    # sync and repository utilities
├── src/
│   ├── common/                 # shared config, layout, hooks, stores and helpers
│   ├── modules/                # page-level feature modules
│   ├── pages/                  # Next.js routes and API endpoints
│   └── server/blog/            # Feishu sync, storage and repository logic
├── README.md
├── README.zh-CN.md
└── README.en.md
```

## Quick Start

### 1. Install dependencies

Use Node.js 24 LTS (see `.nvmrc`) and pnpm 10.32.1. Run commands through Corepack to select the project version instead of another pnpm on PATH.

```bash
corepack pnpm install --frozen-lockfile
```

### 2. Create local environment variables

```bash
cp .env.example .env.local
```

At minimum, configure these Feishu sync variables:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
IMAGE_REMOTE_HOSTS=

FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_SPACE_ID=
```

### 3. Sync content from Feishu

```bash
corepack pnpm feishu:sync
```

If Feishu credentials are missing, the app falls back to the example data already committed in the repository.

### 4. Start the development server

```bash
corepack pnpm dev
```

When Feishu credentials are configured, `predev` attempts one sync before the app boots.

## Environment Variables

| Variable                                                                | Required | Purpose                                                      |
| ----------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                                                  | Yes      | Public site URL used by SEO, sitemap and links               |
| `SITE_URL`                                                              | Yes      | Server-side canonical URL fallback                           |
| `FEISHU_APP_ID`                                                         | Yes      | Feishu app credential                                        |
| `FEISHU_APP_SECRET`                                                     | Yes      | Feishu app credential                                        |
| `FEISHU_SPACE_ID`                                                       | Yes      | Target Feishu knowledge base space                           |
| `BLOB_READ_WRITE_TOKEN`                                                 | Optional | Enable Vercel Blob in production                             |
| `CRON_SECRET`                                                           | Optional | Protect the cron sync endpoint                               |
| `NEXT_PUBLIC_FIREBASE_*`                                                | Optional | Enable guestbook and chat widget flows                       |
| `FIREBASE_ADMIN_*`                                                      | Optional | Enable the guestbook API layer and server-side verification  |
| `GUESTBOOK_ADMIN_UIDS`                                                  | Optional | UID allowlist for hide/delete controls on the guestbook page |
| `IMAGE_REMOTE_HOSTS`                                                    | Optional | Extra remote image hosts to allow                            |
| `CONTACT_FORM_API_KEY`                                                  | Optional | Contact form delivery key                                    |
| `DEVTO_KEY`                                                             | Optional | dev.to read API key                                          |
| `GITHUB_READ_USER_TOKEN_PERSONAL`                                       | Optional | GitHub GraphQL read token                                    |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN` | Optional | Spotify now playing and device data                          |
| `WAKATIME_ACCESS_TOKEN`                                                 | Optional | WakaTime OAuth access token (`read_stats`)                   |
| `MINIMAX_SYSTEM_PROMPT`                                                 | Optional | System prompt override for Command Palette AI                |

### WakaTime Authentication Migration

WakaTime stats now use an OAuth access token. Both stats endpoints require the `read_stats` scope. To restrict permissions, create a private [OAuth App](https://wakatime.com/apps) and use the authorization-code flow with an explicit `scope=read_stats`; publishing the app is unnecessary. The personal token page at `/oauth` currently offers no scope selection and does not meet a stats-only requirement. See the [official authentication documentation](https://wakatime.com/developers#authentication).

- Store the raw token in the server-only `WAKATIME_ACCESS_TOKEN` environment variable, without a `Bearer ` prefix or a `NEXT_PUBLIC_` variable. Use `.env.local` locally and secret environment variables on your hosting platform.
- Configure the new variable before deploying the migrated code; restart the local server after changing it. The app no longer reads `WAKATIME_API_KEY` and never falls back to API key authentication.
- Securely retain the OAuth App secret and refresh token separately, and renew the access token according to its returned expiry. The website only consumes the access token, does not refresh it automatically, and does not require deploying the App secret or refresh token.
- Verify `/api/read-stats` contains real weekly stats and `all_time_since_today` data. HTTP 200 or `configured: true` alone does not prove authentication succeeded: 401/403 errors still return a safe unavailable state.
- Keep the old API key for editor plugins that upload activity; do not revoke their key as part of this migration.

## Content Workflow

### Frontmatter

Each Feishu document can start with YAML frontmatter:

```yaml
---
slug: feishu-sync-architecture
title: Feishu Sync Architecture
date: 2026-04-17
tags: [Feishu, Next.js]
summary: This article shows how to sync a Feishu knowledge base into Markdown and render it cleanly with Next.js.
cover: https://example.com/cover.png
featured: true
draft: false
---
```

### Supported fields

- `slug`
- `title`
- `date`
- `tags`
- `summary`
- `cover`
- `featured`
- `draft`

When a field is missing, the sync pipeline falls back to document metadata, edit time, generated summary, or the first usable image.

### What the sync step produces

- normalized article metadata shared by list and detail pages
- rewritten internal article links
- downloaded covers and inline assets
- Markdown content ready for `react-markdown`

## Performance Audit Targets

Recommended public URLs for fresh audits:

- Primary domain: [https://blog.blackishgreen.dpdns.org](https://blog.blackishgreen.dpdns.org)
- Stable deployment target: [https://blackishgreen.vercel.app](https://blackishgreen.vercel.app)

One-click audit entry points:

- Primary domain
  - [PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fblog.blackishgreen.dpdns.org%2F&form_factor=desktop)
  - [GTmetrix](https://gtmetrix.com/?url=https%3A%2F%2Fblog.blackishgreen.dpdns.org%2F)
- Stable deployment target
  - [PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fblackishgreen.vercel.app%2F&form_factor=desktop)
  - [GTmetrix](https://gtmetrix.com/?url=https%3A%2F%2Fblackishgreen.vercel.app%2F)

> [!NOTE]
> External performance reports drift over time and are sensitive to location, DNS, CDN behavior, and bot protection, so this README focuses on stable audit entry points and target URLs instead of pinning a score screenshot that will quickly go stale. If your network cannot resolve the custom domain consistently, use the Vercel deployment target for a cleaner rerun.

## Validation

Run these checks before shipping changes:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Useful scripts:

- `corepack pnpm dev`
- `corepack pnpm feishu:sync`
- `corepack pnpm lint`
- `corepack pnpm lint:fix`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`

CI uses fixed Quality, Test, Build, Security and PR Gate checks. Build runs `corepack pnpm test:smoke`: an isolated temporary copy completes the production build and postbuild, then checks reading, body search, permanent aliases and draft visibility over HTTP. `corepack pnpm check:workflows` requires actionlint 1.7.12 on PATH; CI verifies the official archive with SHA-256.

Dependency changes run `corepack pnpm audit:production` and block production high/critical findings; a weekly workflow scans the remaining production tree. Vulnerabilities and audit service/tool failures use exit codes 1 and 2 respectively. PR Gate only passes when all four required jobs succeed.

## Deployment

### Vercel

Feishu document events are delivered to a webhook and then delayed through Vercel Queue:

- Webhook: `/api/webhooks/feishu`
- Queue consumer: `/api/queues/feishu-sync` (only invoked internally by Vercel Queue)
- Debounce: sync 2 minutes after the last edit, with a 10-minute maximum wait during continuous editing
- Firebase Realtime Database stores event deduplication, debounce state, and the global sync lease

The workflow in `.github/workflows/feishu-sync.yml` still calls the sync endpoint as a missed-event safety net and reconciles subscriptions for new documents:

- Endpoint: `/api/cron/feishu-sync`
- Default schedule: every 6 hours to reduce the risk of exhausting the Vercel Blob Hobby quotas

Recommended production configuration:

- Feishu app credentials, `FEISHU_VERIFICATION_TOKEN`, and `FEISHU_ENCRYPT_KEY`
- Firebase Admin credentials
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET`
- public site URL variables

## Acknowledgements

- [Feishu Open Platform](https://open.feishu.cn/)
- [`feishu-docx`](https://www.npmjs.com/package/feishu-docx)
- [Next.js](https://nextjs.org/)
- [Vercel](https://vercel.com/)

## License

This repository is licensed under [GPL-3.0](./LICENSE).
