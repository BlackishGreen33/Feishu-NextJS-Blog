# 作品展示

## 現行規則與例外

- 作品從 Firebase `projects` 讀取。優先使用 Admin 認證；未配置 Admin 時保留公開 REST 讀取。未配置 database URL 回傳空清單，讀取失敗交由頁面既有空狀態處理。
- 必須有非空 title／slug；舊資料缺 is_show 視為公開、缺 is_featured 視為非精選，其他文字欄位與日期沿用空字串／epoch 預設。隱藏或無效作品不進入清單與 slug 查詢。
- 精選優先，其次 updated_at 新至舊；公開 DTO 保留可序列化的 stacks JSON 字串。卡片與詳情只消費字串陣列，損壞或異型 stacks 顯示空列表，避免整頁崩潰。
- 清單初始顯示六項，每次增加兩項；詳情有 content 才顯示 Markdown。來源與展示入口分別為 [Firebase 讀取](../../server/firebase-db.ts)、[頁面](../../pages/projects/index.tsx)與本目錄 components。

## 歷史判斷與理由

- `5d02ab1` 修正匿名 REST 被拒時仍可使用 Admin 讀取，並補齊 Next.js 可序列化 DTO；本輪保留該授權與舊資料契約。
- 本輪將 UI 原本直接 JSON.parse 的 stacks 消費改為共享驗證，沒有更動資料庫或寫回舊資料。

## 對應驗證

- [Firebase 操作測試](../../__tests__/server/firebase-db.test.ts)：認證／REST、可見性、排序、slug、序列化、缺設定與失敗。
- [schema](../../common/schemas/projects.ts)是 DTO 與 stacks 消費契約來源。
