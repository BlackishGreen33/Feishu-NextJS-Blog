# Feishu NextJS Blog

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-000000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-149eca?logo=react)](https://react.dev/)
[![Feishu](https://img.shields.io/badge/Feishu-Wiki%20Sync-00C2A8)](https://open.feishu.cn/)
[![Vercel Blob](https://img.shields.io/badge/Vercel-Blob-black?logo=vercel)](https://vercel.com/docs/vercel-blob)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](./LICENSE)

繁體中文 | [简体中文](./README.zh-CN.md) | [English](./README.en.md)

以飛書知識庫作為內容來源的 Next.js 部落格範例。  
這個專案採用成熟的同步路線：**飛書文檔 → Markdown / 結構化索引 → 站點渲染**，而不是在前台直接嵌入飛書頁面。

## 特色

- 以飛書知識庫空間作為 Blog 內容來源
- 使用飛書官方 API 與自建應用憑證同步內容
- 透過 `feishu-docx` 將 block JSON 轉為 Markdown
- 支援圖片與附件下載，並重寫為站內可渲染資產
- 本地開發使用落盤資料，部署到 Vercel 可切換為 Blob 存儲
- 透過 Vercel Cron 定時同步，不在前台請求時直連飛書
- Blog 列表、首頁文章區、文章詳情頁共用同一份標準化文章模型

## 架構

```text
Feishu Wiki / Docx
        │
        ├─ tenant_access_token
        ├─ wiki node traversal
        ├─ docx blocks fetch
        ▼
Markdown + Article JSON + Assets
        │
        ├─ local: data/feishu-blog + public/feishu-assets
        └─ production: Vercel Blob
        ▼
Next.js Pages Router
        ├─ Home
        ├─ Blog List
        ├─ Blog Detail
        ├─ Learn
        ├─ About
        └─ Contact
```

## 技術棧

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

## 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 配置環境變量

將 `.env.example` 複製為 `.env.local`，至少填入以下內容：

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

### 3. 手動同步飛書內容

```bash
pnpm feishu:sync
```

若本地尚未提供飛書憑證，站點會回退到倉庫內的示例資料。

### 4. 啟動開發環境

```bash
pnpm dev
```

開發模式下，若已配置飛書憑證，`predev` 會先嘗試同步一次內容。

## 常用腳本

- `pnpm dev`：啟動開發環境
- `pnpm feishu:sync`：手動同步飛書內容
- `pnpm lint`：執行 ESLint
- `pnpm typecheck`：執行 TypeScript 型別檢查
- `pnpm test`：執行 Jest 測試
- `pnpm build`：建立正式版構建

## 飛書文檔 Frontmatter

每篇飛書文檔可以在頂部放置 YAML frontmatter：

```yaml
---
slug: feishu-sync-architecture
title: 飛書同步架構說明
date: 2026-04-17
tags: [Feishu, Next.js]
summary: 這篇文章展示了如何把飛書知識庫同步為 Markdown，並由 Next.js 正常渲染。
cover: https://example.com/cover.png
featured: true
draft: false
---
```

支援欄位：

- `slug`
- `title`
- `date`
- `tags`
- `summary`
- `cover`
- `featured`
- `draft`

如果未提供部分欄位，系統會自動回退到文檔標題、編輯時間、正文摘要或正文首圖。

## 部署

### Vercel

專案已內建 `vercel.json` 中的 Cron 任務：

- 路徑：`/api/cron/feishu-sync`
- 預設頻率：每 6 小時一次

部署到 Vercel 時，建議同時配置：

- 飛書自建應用憑證
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET`

## 測試與驗證

目前倉庫內包含：

- Blog 工具函數測試
- 文章倉儲讀取測試
- 同步器缺少憑證時的安全跳過測試

建議在提交前至少執行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 授權

本專案採用 [GPL-3.0](./LICENSE) 授權。
