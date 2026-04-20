# Feishu NextJS Blog

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-000000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-149eca?logo=react)](https://react.dev/)
[![Feishu](https://img.shields.io/badge/Feishu-Wiki%20Sync-00C2A8)](https://open.feishu.cn/)
[![Vercel Blob](https://img.shields.io/badge/Vercel-Blob-black?logo=vercel)](https://vercel.com/docs/vercel-blob)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](./LICENSE)

[繁體中文](./README.md) | 简体中文 | [English](./README.en.md)

这是一个以飞书知识库作为内容来源的 Next.js 博客示例。  
项目采用成熟的同步链路：**飞书文档 → Markdown / 结构化索引 → 站点渲染**，而不是在前台直接嵌入飞书页面。

## 特性

- 使用飞书知识库指定子树作为 Blog 内容源
- 基于飞书官方 API 与自建应用凭证同步内容
- 使用 `feishu-docx` 将 block JSON 转成 Markdown
- 支持图片与附件下载，并改写为站内可渲染资源
- 本地开发使用落盘数据，部署到 Vercel 时可切换到 Blob
- 通过 Vercel Cron 定时同步，而不是在前台实时请求飞书
- 首页、文章列表、文章详情共享统一的文章模型

## 技术栈

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

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

将 `.env.example` 复制为 `.env.local`，并至少填写以下变量：

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

### 3. 手动同步飞书内容

```bash
pnpm feishu:sync
```

如果本地没有配置飞书凭证，项目会回退到仓库内的示例数据。

### 4. 启动开发环境

```bash
pnpm dev
```

若本地已配置飞书凭证，`predev` 会先尝试同步一次内容。

## 常用脚本

- `pnpm dev`
- `pnpm feishu:sync`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## 飞书文档 Frontmatter

每篇飞书文档可以在顶部放置 YAML frontmatter：

```yaml
---
slug: feishu-sync-architecture
title: 飞书同步架构说明
date: 2026-04-17
tags: [Feishu, Next.js]
summary: 这篇文章展示了如何把飞书知识库同步为 Markdown，并由 Next.js 正常渲染。
cover: https://example.com/cover.png
featured: true
draft: false
---
```

支持字段：

- `slug`
- `title`
- `date`
- `tags`
- `summary`
- `cover`
- `featured`
- `draft`

## 部署

项目已在 `vercel.json` 中预置 Cron：

- 路径：`/api/cron/feishu-sync`
- 默认频率：每 6 小时一次

部署到 Vercel 时建议同时配置：

- 飞书自建应用凭证
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET`

## 测试

建议在提交前执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## License

本项目基于 [GPL-3.0](./LICENSE) 开源。
