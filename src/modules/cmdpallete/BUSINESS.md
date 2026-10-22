# 搜尋與 AI 互動

## 現行規則與例外

- CommandPalette 結合既有選單與最多五篇公開文章；查詢 debounce 500ms。站內搜尋與資料契約連回[內容 owner](../../server/blog/BUSINESS.md)，provider 與 context 連回[AI owner](../../server/ai/BUSINESS.md)。
- 無結果時可沿用 Google 搜尋或詢問 AI。開始 AI 後停用 Combobox 選擇；原 isEmptyState 與 AI active 表示相同狀態，改為衍生值。
- [AI request hook](hooks/useAiAssistant.ts)在新請求／關閉時取消舊請求，用 controller 身分忽略過期 callback；關閉外部 Dialog 時清除輸入與回應狀態。此 reset 有局部、有理由的 React 例外。
- [顯示元件](components/AiResponses.tsx)保留 typewriter、fallback 文案與串流 Markdown 正規化；新串流須重設舊文字與計時器，因此保留該位置的 React 例外。使用既有 MDX 顯示，AI 回覆不接受 raw HTML。

## 歷史判斷及驗證

2026-10-22 治理把 request／取消狀態從 CommandPalette 下沉至 hook；現有呼叫、顯示與 callback 完成時機保留。

- [Hook 操作](../../__tests__/components/useAiAssistant.test.ts)：取消與忽略舊 callback。
- [顯示測試](components/AiResponses.test.tsx)：串流與 typewriter 狀態。
- [Markdown 正規化](libs/normalizeStreamingMarkdown.test.ts)：既有分段顯示相容。

## 子索引與跨域連結

- [功能索引](../BUSINESS.md)
- [AI server owner](../../server/ai/BUSINESS.md)
