# Feishu 事件同步、queue 與 lease

本 owner 負責 webhook 到事件持久化、排程與 lease 的生命週期；內容轉換及 Asset 規則連回[內容 owner](../BUSINESS.md)。

## 現行規則與例外

- [Webhook](../feishu-webhook.ts)只接受已驗證 token／app id 的 docx edit 事件。明文及加密 URL challenge 保留原支援；加密事件核對 SHA256 簽章與 10 分鐘 replay window，payload 上限 256 KiB。
- [API 入口](../../../pages/api/webhooks/feishu.ts)缺必要設定回 503；Vercel 必須有 encrypt key。先持久化再排程，持久化失敗回 503 供來源重送，不提前回成功。
- [狀態機](state.ts)以 eventId 去重，保留最近 24 小時最多 256 筆；每個新事件提升 generation。重複事件仍可重新安排 wakeup，避免先前 queue 失敗後無法喚醒。
- [Trigger](index.ts)預設 debounce 120 秒、maxWait 600 秒。較舊 queue message 讀取最新 state 後依目前 generation 排程，不把 message 的舊 generation 當成唯一進度。
- queue 與 cron 共用 120 秒 lease；只允許相同 lease id／generation 完成或釋放。同步期間新事件保留 pending；同步失敗釋放 lease，processedGeneration 不前進。
- [Firebase transaction](../sync-trigger-firebase.ts)遇到冷快取 null 且預期 generation 大於 0 時，必須保留 transaction 重試，不能把本地空快取當作真正未存在。acquired 仍核對 committed 及 lease id。
- [Queue consumer](../sync-queue-consumer.ts)忽略不合法 payload，不執行同步；generation 必須是正安全整數。失敗以 60 秒起指數退避，上限 3600 秒，第 10 次投遞後 ack 並記錄耗盡；pending state 留給 cron 補跑。
- [Cron](../../../pages/api/cron/feishu-sync.ts)要求既有 bearer secret，遇到 lease 競爭回 503 與 Retry-After。缺 Firebase trigger 設定時沿用既有直接同步 fallback；訂閱 reconciliation 失敗不阻止已授權的內容同步。
- 保留既有狀態正規化：未知 shape／不合法 generation 回初始狀態，合法 generation 下的舊選填欄位逐項正規化。這項恢復策略不代表損壞狀態仍保留原 pending 資訊；本輪沒有偷偷改成另一種恢復政策。

## 歷史判斷與理由

原有 transaction 與去重測試記錄了「冷快取不等於遠端空資料」及「先持久化再喚醒」的判斷；2026-10-22 治理集中 state schema、保留公開 import path，新增 malformed webhook 的公開錯誤測試，沒有改動簽章或 lease 算法。

來源：[事件同步 0ec8632](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/0ec8632)、[加密 challenge c7fd3a5](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/c7fd3a5)、[冷快取 lease a472e6c](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/a472e6c)。

## 對應驗證

- [Webhook 驗證](../../../__tests__/server/blog/feishu-webhook.test.ts)：明文／加密 challenge、token、簽章、重播與大小限制。
- [Trigger 操作](../../../__tests__/server/blog/sync-trigger.test.ts)：去重、debounce、generation、lease、失敗與 cron。
- [Firebase store](../../../__tests__/server/blog/sync-trigger-firebase.test.ts)：transaction 競爭及冷快取。
- [Queue consumer](../../../__tests__/server/blog/sync-queue-consumer.test.ts)：合法／錯誤 payload、重試上限及耗盡記錄。

## 子索引與跨域連結

- [內容 owner](../BUSINESS.md)
