# DEV 舊評論

## 現行規則與例外

- 舊評論仍使用 DEV comments 的 a_id 關聯舊文章數字 id，與 [Firebase 留言板](../../chat/BUSINESS.md)的登入／作者／管理員規則各自獨立。
- 未配置 DEV username 回傳空清單；讀取來源例外由 `/api/comments` 保留 HTTP 200、status=false envelope。status >=400 的非拋錯來源回應仍映射空評論。
- 顯示消費 id_code、created_at、body_html、user.name／profile_image_90，允許額外來源欄位與可省略 children。所有子評論 HTML 都經 [既有 sanitize module](../../../server/blog/htmlSanitizer.ts)；顯示端不重加已移除的 HTML attributes。
- 沿用 unified／rehype-sanitize allowlist，禁 script／style／iframe 與事件屬性，連結協定限原有 http／https／mailto。不能以 Zod 字串驗證取代 HTML sanitize。
- CommentList 顯示頂層資料與呼叫端 totalComments；現有 Feishu 閱讀頁沒有掛載此舊元件。本輪保留 API 與元件，沒有重新加入產品介面或把 children 新增為可見巢狀 UI。
- [來源](../../../services/devto.ts)、[API](../../../pages/api/comments.ts)、[契約](../../../common/schemas/comments.ts)。

## 歷史判斷與理由

- `31ab4b5` 將 HTML 清洗集中於渲染邊界；本輪保留成熟 sanitizer，遞迴清洗與顯示各有驗證。
- 刪除全專案搜尋確認沒有消費者的 DEV 文章列表／詳情／views 函式；現行文章與 views 已走 Feishu／Firebase。沒有移除仍使用的評論出口。

## 對應驗證

- [來源契約](../../../__tests__/services/devto.test.ts)、[handler](../../../__tests__/server/comments-api.test.ts)、[實際清洗 pipeline](../../../__tests__/server/blog/htmlSanitizer.test.ts)、[顯示](../../../__tests__/components/blog/CommentItem.test.tsx)。
