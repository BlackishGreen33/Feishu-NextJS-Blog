# 留言板互動

## 現行規則與例外

- [Chat](components/Chat.tsx)依登入身分重新載入，頁面每次 20 則、widget 每次 10 則。前端合併以 id 去重並沿用時間／id 排序，不取代[伺服器權限與分頁規則](../../server/guestbook/BUSINESS.md)。
- [輸入元件](components/ChatInput.tsx)等待送出結果，失敗保留文字供重試，成功才清空；送出期間禁止重複送出，結束後回復 focus。
- [Firebase auth hook](hooks/useFirebaseGuestbookAuth.ts)訂閱既有外部初始化；缺設定時 hydration 後結束 loading。Chat 的讀取 loading 與 auth 初始化保留有理由、僅限必要位置的 set-state-in-effect 例外。
- Google／GitHub 登入、登出與已有錯誤提示保持原流程。API 成功回應經 schema 驗證後才進入顯示狀態。

## 歷史判斷及驗證

2026-10-22 治理保留載入與失敗重試語意，沒有用延遲到 microtask 的方式隱藏 React 診斷。

- [輸入互動](../../__tests__/components/ChatInput.test.tsx)：失敗重試與成功清空。
- [缺設定初始化](../../__tests__/components/useFirebaseGuestbookAuth.test.ts)：不連線 Firebase，loading 能結束。

## 子索引與跨域連結

- [功能索引](../BUSINESS.md)
- [留言板操作 owner](../../server/guestbook/BUSINESS.md)
