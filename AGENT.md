# AGENT.md

對任何代理、Codex、Copilot 類工具而言，本檔就是這個 repo 的協作約束與工作入口。

## 專案定位

- 這是一個以 **Feishu/飛書知識庫同步內容** 為主線的 Next.js 個人網站與部落格專案。
- 內容流程是：**飛書文檔 -> Markdown / JSON 索引 / 資產 -> Next.js 頁面渲染**。
- 專案目前使用 **Next.js Pages Router**，除非任務明確要求，**不要自行遷移到 App Router**。

## 技術棧與運行前提

- Node.js：CI 使用 **Node 20**
- 套件管理：`pnpm@10.32.1`
- 前端：Next.js 16、React 18、TypeScript、Tailwind CSS
- 資料/服務：SWR、Firebase、Vercel Blob、Feishu Open API
- 測試：Jest + Testing Library
- 路徑別名：
  - `@/*` -> `src/*`

## 目錄約定

- `src/pages`
  - 頁面路由與 API Route 入口
  - 這層應保持薄，主要負責組裝與轉發
- `src/modules`
  - 頁面級 / 功能級 UI 組裝
  - 新的頁面邏輯優先放這裡，不要把大量 JSX 直接堆在 `src/pages`
- `src/common`
  - 共用元件、hooks、config、types、libs、styles、store
- `src/server/blog`
  - 飛書同步、文章索引、存儲適配、cron 授權、blog 工具函數
  - 涉及 blog 同步或讀取邏輯時，優先改這裡
- `src/services`
  - 對外部服務的封裝，例如 contact、chat、GitHub、Spotify 等
- `scripts/feishu-sync.ts`
  - 飛書同步 CLI 入口
- `data/feishu-blog`
  - 本地同步後的文章索引與文章 JSON
- `public/feishu-assets`
  - 本地同步後落盤的資產
- Firebase 相關資料
  - 目前作品資料與 views 類持久化資料都走 Firebase Realtime Database

## 代理工作原則

- 優先做**小而準確**的修改，避免無關重構。
- 保持既有 Pages Router 結構，不要順手重寫整個路由層。
- API handler 盡量保持薄；資料讀寫、同步與規則邏輯應下沉到 `src/server/**` 或 `src/services/**`。
- Blog 相關修改要維持 `src/common/types/blog.ts` 中 `Article` / `ArticleSummary` / `ArticleIndex` 的契約一致。
- 不要讓前端頁面直接依賴飛書 API。飛書內容應透過：
  - `pnpm feishu:sync`
  - `pnpm dev` 的 `predev`
  - `/api/cron/feishu-sync`
    這三條路徑進入系統。
- `syncFeishuArticles({ optional: true })` 的「缺憑證時安全跳過」行為必須保留。
- 本地沒有飛書憑證時，專案應能繼續使用 repo 內的示例 / 已同步資料運作；不要破壞這個 fallback。
- `data/feishu-blog/**` 與 `public/feishu-assets/**` 屬於同步輸出。除非任務明確要求更新 fixture 或同步結果，否則不要手動改這些檔案。
- 需要持久化的網站資料優先沿用 Firebase Realtime Database 既有配置，不要再引入 Prisma 或新的 SQL schema。
- 變更環境變量相關行為時，先同步檢查 `.env.example`，避免新增隱含配置。

## 程式風格

- TypeScript 使用 strict 模式，新增型別時優先補齊明確型別，不要濫用 `any`。
- 依照既有 import 排序規則，保持 `simple-import-sort` 可通過。
- 延續現有 alias 匯入風格，優先用 `@/`，不要無意義地改成很深的相對路徑。
- 沿用現有 JSON 回應風格；本 repo 常見格式為：
  - 成功：`{ status: true, data: ... }`
  - 失敗：`{ status: false, error: ... }`
- Tailwind class 與格式交給 Prettier；不要手動做與 repo 風格相反的排版。
- `src/pages/**` 中的頁面組件保持簡潔，主要畫面邏輯與組件拆分到 `src/modules/**`。

## 常用命令

- 安裝依賴：`pnpm install`
- 開發：`pnpm dev`
- 手動同步飛書：`pnpm feishu:sync`
- Lint：`pnpm lint`
- 型別檢查：`pnpm typecheck`
- 測試：`pnpm test`
- 建置：`pnpm build`
- 格式化：`pnpm format`

## 驗證準則

做完程式碼修改後，至少依影響範圍執行對應檢查：

- 一般修改：`pnpm lint && pnpm typecheck`
- 邏輯或資料流修改：再加 `pnpm test`
- 路由、Next.js 配置、SSR/資料取得、建置流程變更：再加 `pnpm build`
- 飛書同步相關修改：至少確認
  - 無憑證時 optional sync 仍會安全跳過
  - 本地文章索引 / 文章讀取流程未被破壞

## CI 與提交規則

- GitHub Actions 目前會跑：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm format:check`
  - `pnpm test`
- Husky `pre-commit` 會執行 `pnpm lint-staged`
- Husky `commit-msg` 會執行 `node scripts/validate-commit-msg.js`
- 提交訊息格式固定為 `<emoji> <type>(<scope>): <desc>`
- 目前允許的 type / emoji 對應：
  - `✨ feat`
  - `🐛 fix`
  - `📝 docs`
  - `🔧 chore`
  - `🚀 ci`
  - `♻️ refactor`
  - `💄 style`
  - `✅ test`
  - `⚡ perf`
  - `⏪ revert`
  - `▲ vercel`

## 變更建議

- 新增頁面時，優先複用 `src/modules` 與 `src/common/components` 既有模式。
- 新增 blog 功能時，先看 `src/server/blog/repository.ts`、`src/server/blog/sync.ts`、`src/server/blog/storage.ts`。
- 新增 API 時，盡量對齊既有錯誤處理與快取策略，不要讓單一 API 的風格與其他路由差太多。
- 若任務只是文件、文案或設定小改，避免順手清理與任務無關的檔案。
