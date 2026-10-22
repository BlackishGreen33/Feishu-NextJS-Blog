# 留言板認證、持久化與分頁

本 owner 負責 exported 留言板操作；舊 DEV 評論是另一個來源，不共用權限或刪除規則。

## 現行規則與例外

- [認證](auth.ts)只接受 Firebase Admin 驗證過的 bearer ID token。讀取可以匿名，發布／刪除／管理要求登入；管理員能力由設定 UID 清單決定，不信任瀏覽器傳入的角色。
- 作者或管理員可軟刪除，只有管理員可變更 published／hidden／deleted；公開讀取只包含 published，沒有把管理員讀取當成可公開隱藏訊息的旁路。
- 發布文字沿用 trim、非空與 500 個 UTF-16 code units 上限；emoji 可能佔兩個單位。每個 UID 以 transaction 限制 60 秒最多三則。錯誤代碼及 API 狀態對應沿用既有行為。
- [操作](index.ts)只有在設定完整時寫入；缺設定讀取回 configured=false 的匿名空頁。訊息 id 必須是單一非空 Firebase key，不能把空 id 當作整個 collection 寫入。
- [舊資料相容](records.ts)同時讀取 camelCase 數值時間與 snake_case 日期；缺失日期使用 epoch，缺失狀態沿用 is_show／deleted_at 推導。缺少 uid／名稱／圖片仍沿用原有 fallback。
- 分頁預設 20、上限 50，先依日期再依 id 排序；cursor 表示嚴格較舊的（日期、id）邊界。公開讀取最多掃描五個 batch，缺 created_at index 時沿用全量讀取後分頁 fallback。無效 cursor 回第一頁。
- 軟刪除或管理狀態會一起更新新舊時間及可見性欄位，保留歷史資料。瀏覽器 API 回應由[共用 schema](../../common/schemas/guestbook.ts)驗證，不能靠泛型斷言取得信任。

## 歷史判斷與理由

- [ba80207](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/ba80207)把讀寫移到 API，使用者角色及持久化權限由伺服器判斷。
- [e999a41](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/e999a41)保留缺 RTDB index 的 fallback，避免舊配置直接使留言板不可讀。
- 2026-10-22 治理新增 exported 操作測試，重現同時間戳在 indexed／fallback 路徑出現 c、b、c 的重複頁；現在兩條路徑共用排序比較器，得到 c、b、a。這是分頁正確性修正，未新增排序政策或任意收緊合法欄位。

## 對應驗證

- [操作與權限](../../__tests__/server/guestbook.test.ts)：匿名、作者、其他使用者、管理員、舊資料、同時戳分頁、缺 index、速率及 id 邊界。
- [瀏覽器讀取](../../__tests__/services/guestbook.test.ts)：回應驗證及既有錯誤訊息。
- [UI 載入與送出](../../modules/chat/BUSINESS.md)：失敗保留輸入及外部初始化例外。

## 子索引與跨域連結

- [伺服器索引](../BUSINESS.md)
- [留言板互動](../../modules/chat/BUSINESS.md)
