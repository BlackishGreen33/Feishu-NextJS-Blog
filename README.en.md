# Feishu NextJS Blog

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-000000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-149eca?logo=react)](https://react.dev/)
[![Feishu](https://img.shields.io/badge/Feishu-Wiki%20Sync-00C2A8)](https://open.feishu.cn/)
[![Vercel Blob](https://img.shields.io/badge/Vercel-Blob-black?logo=vercel)](https://vercel.com/docs/vercel-blob)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](./LICENSE)

[繁體中文](./README.md) | [简体中文](./README.zh-CN.md) | English

A Next.js blog starter that uses Feishu Wiki as the content source.  
The project follows a production-friendly pipeline: **Feishu documents → Markdown / structured index → site rendering**, instead of embedding Feishu pages directly in the frontend.

## Highlights

- Feishu Wiki subtree as the blog content source
- Official Feishu API + custom app credentials
- Block JSON converted to Markdown via `feishu-docx`
- Images and attachments downloaded and rewritten as site assets
- Local disk storage for development, Vercel Blob for production
- Scheduled sync with Vercel Cron
- Shared normalized article model for home, blog list, and detail pages

## Stack

- Next.js 16
- React 18
- TypeScript
- Tailwind CSS
- SWR
- Jest
- Feishu Open API
- `feishu-docx`
- Vercel Blob
- Vercel Cron

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and provide at least:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000

FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_SPACE_ID=
FEISHU_SYNC_TTL_SECONDS=600

BLOB_READ_WRITE_TOKEN=
CRON_SECRET=
```

### 3. Run a manual sync

```bash
pnpm feishu:sync
```

If Feishu credentials are not available locally, the app falls back to the seed data stored in the repository.

### 4. Start the dev server

```bash
pnpm dev
```

When credentials are configured, `predev` attempts one sync before booting the dev server.

## Useful Scripts

- `pnpm dev`
- `pnpm feishu:sync`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Feishu Frontmatter

Each Feishu document can include YAML frontmatter at the top:

```yaml
---
slug: feishu-sync-architecture
title: Feishu Sync Architecture
date: 2026-04-17
tags: [Feishu, Next.js]
summary: This post explains how to sync a Feishu knowledge base into Markdown and render it with Next.js.
cover: https://example.com/cover.png
featured: true
draft: false
---
```

Supported fields:

- `slug`
- `title`
- `date`
- `tags`
- `summary`
- `cover`
- `featured`
- `draft`

## Deployment

`vercel.json` already includes a cron job:

- Path: `/api/cron/feishu-sync`
- Default frequency: every 6 hours

For Vercel deployment, configure:

- Feishu custom app credentials
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET`

## Validation

Recommended checks before shipping:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## License

Licensed under [GPL-3.0](./LICENSE).
