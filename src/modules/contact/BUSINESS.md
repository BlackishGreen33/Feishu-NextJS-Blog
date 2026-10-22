# 聯絡表單

## 現行規則與例外

- 表單輸入為 name、email、message 三個非空字串；原生 required／email 控制使用者輸入。API 不額外要求 email 的 TLD，保留瀏覽器可接受的 a@b。
- CONTACT_FORM_API_KEY 僅在送出功能使用，缺設定沿用 HTTP 500／`Something went wrong!` 失敗體驗，不阻擋建置。只轉送三欄，`access_key` 永遠由伺服器提供，客戶端不能覆寫。
- Web3Forms 成功回應實際消費 message；外部 exception／異型 message 走相同 500。保留原 API 的 HTTP 200→前端成功判斷，沒有藉治理改寫為 provider success 旗標政策；非拋錯的外部 status >=400 分支也維持原映射。
- 送出中顯示進度文字；成功提示並清空，失敗提示且保留文字。缺預約網址時顯示空狀態；沒有新增寄信服務或變更排程。
- [API](../../pages/api/contact.ts)、[provider](../../services/contact.ts)、[schema](../../common/schemas/contact.ts)。

## 歷史判斷與理由

- `f5279ff` 保留 Web3Forms 流程，`c217f7e` 集中設定。本輪沿用 axios 與原生 FormData，避免新增重複 HTTP／表單抽象。
- 原先 for-in 轉送任意欄位可覆寫伺服器金鑰；本輪在請求邊界剝除額外欄位，維持網站既有三欄合法輸入。

## 對應驗證

- [API 邊界測試](../../__tests__/server/contact-api.test.ts)：合法欄位、金鑰不可覆寫、異型輸入／回應、缺設定及失敗，全部使用 mock，沒有寄信。
- [表單互動測試](../../__tests__/components/ContactForm.test.tsx)：失敗保留文字，成功清空。
