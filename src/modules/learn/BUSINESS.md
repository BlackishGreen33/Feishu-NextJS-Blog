# 學習內容與章節

## 現行規則與例外

- 分類由 LEARN_CONTENTS 決定；本倉庫目前為空，也沒有 src/contents/learn，因此頁面呈現原有空狀態。靜態分類／內容路徑 fallback=false，找不到資料導向 `/404`。
- 內容從 `src/contents/learn/<category>/*.mdx` 讀取，category 必須是單一目錄段，拒絕路徑穿越；缺目錄為空列表／零課程。frontmatter 欄位由 [schema](../../common/schemas/learn.ts)約束，YAML Date 轉 ISO 字串，未指定 Playground／評論預設關閉，保留額外 metadata。
- 課程按數字 id 排序，章節缺 chapter_id 使用 0，缺標題使用 ungrouped；僅一組時初始展開。前後導航延續現有 id ±1 與零起算邊界，沒有改成跨缺號搜尋。
- 本域不再複製 SWR 清單／目前 id／相鄰標題為 state，直接由已驗證清單和 Router 路徑推導；導航保留 scroll-to-top 與原 Pages Router URL。
- is_playground 開啟 [Playground](../playground/BUSINESS.md)，is_comment 開啟 Giscus，與 [DEV 舊評論](../blog/components/BUSINESS.md)不同。內容顯示沿用 MDXComponent／既有 sanitize。

## 歷史判斷與理由

- `f5279ff` 保留本地 MDX 入口；本輪沒有新增課程或把空分類填入示例產品內容。移除衍生 state 是為了資料與導航同時更新，不增加額外效果同步層。
- 直接 join 未驗證 category 原本可越過內容目錄；驗證放在共用 loader，API 與靜態資料入口共用，不只限制單一路由。

## 對應驗證

- [內容檔案契約](../../__tests__/server/learn-content.test.ts)：系統暫存 MDX、缺內容、路徑穿越與異型 metadata，不更動倉庫內容。
- [閱讀與切換](../../__tests__/components/ContentDetail.test.tsx)、[Playground 操作](../../__tests__/components/Playground.test.tsx)。
