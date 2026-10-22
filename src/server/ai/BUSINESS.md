# AI context、provider 與串流契約

## 現行規則與例外

- [Context](context.ts)依 locale、目前頁面與相關公開文章建立站內資訊；當前文章摘要上限 1200 字元，相關文章最多三篇，沒有直接匹配則取最新三篇。[搜尋排序與草稿可見性](../blog/BUSINESS.md)不在此複製。
- [Provider](provider.ts)只在伺服器呼叫 MiniMax。功能設定在使用時驗證，缺 API key 維持原訊息；成功但沒有可顯示內容回 502，保留 HTTP／業務錯誤及取消 499 契約。
- 沿用 model、temperature=0.7、max_completion_tokens=1024、n=1、reasoning_split=true；訊息包含既有 system prompt、context 及 trim 後的使用者 prompt。文字／text 陣列、think 標記及累積／增量內容依原規則處理。
- [Browser request](../../services/ai.ts)只呼叫站內 API，不載入 provider 設定。chunk／done／error 與 HTTP 回應先驗證；錯誤事件後不通知完成，使用者取消維持安靜，正常 EOF 只通知一次完成。
- [SSE adaptor](../../common/libs/sse.ts)使用 eventsource-parser 4 處理協定；保留既有 feed／flush，EOF 補空行以發出未終止事件，不直接把 reset 的 consume 當成 dispatch。
- Provider 與 browser 兩端都處理 decoder 尾端資料，結束／取消／失敗時取消並釋放 reader。API prompt 驗證失敗維持 Prompt is required；stream 僅布林 true 啟用。

## 歷史判斷及理由

2026-10-22 治理以成熟 parser 取代自製協定解析。測試先重現跨 chunk CRLF 過早分段，以及 headers 前取消時外層 catch 未等到 Promise 的問題；前者交由 parser 處理，後者以必要 await 保留 499 介面。Jest 透過 Next 既有 transpilePackages 僅轉譯 ESM-only 的 eventsource-parser。

## 對應驗證

- [SSE 協定](../../__tests__/common/sse.test.ts)：每個 chunk 切點、CRLF、多行 data、EOF、重複 flush。
- [兩端串流操作](../../__tests__/services/ai-stream.test.ts)：UTF-8 byte chunks、累積內容、取消、錯誤、完成通知、缺設定及成功無內容。
- [前端狀態 owner](../../modules/cmdpallete/BUSINESS.md)：關閉與過期 callback、Markdown 顯示。

## 子索引與跨域連結

- [伺服器索引](../BUSINESS.md)
- [搜尋與 AI 互動](../../modules/cmdpallete/BUSINESS.md)
