# Article 身分與永久 Slug alias

本文件負責 Article 身分、Slug 分配、永久 alias、內容同步與 Asset 保留。名詞沿用 [CONTEXT.md](../../../CONTEXT.md)；事件排程另由其 owner 維護。

## 現行規則與例外

- Article 的 id 使用 sourceNodeToken；來源標題或 Slug 改變不代表建立另一篇 Article。sourceDocumentId 保留來源文件資訊，不能取代目前讀取流程的 sourceNodeToken 身分核對。
- Slug 優先由 frontmatter.slug、frontmatter.title、文件標題產生；衝突時分配唯一 Slug。現有 active Slug 與永久 alias 都會佔用名稱，永久 alias 不可重新分配為任何 Article 的 active Slug。
- Article 改名時，舊 Slug 成為綁定 sourceNodeToken 的永久 alias。再次改名後，既有 alias 仍指向該來源目前的 active Slug；來源暫時不在公開集合時，alias 紀錄仍保留。
- 公開查詢先以 index 判斷目前有效 Article，不能只憑磁碟或 Blob 上存在 JSON 就回傳。讀到的 artifact 必須同時符合 index 的 slug 與 sourceNodeToken；不符時不回傳該 Article。同步重用舊 artifact 也須核對這兩個欄位。
- Article 與 index 的 local／Blob JSON（含快取命中）須先通過[資料契約](../../common/schemas/blog.ts)。缺檔才沿用既有 fallback；JSON 語法或形狀損壞應拋錯，中止同步發布及清理，不能當成空集合或改讀 seed 掩蓋損壞。舊 index 可沒有 redirects，cover 可為 null，額外欄位保留；此試點不額外限制日期字串、URL 或正規化來源 frontmatter。
- redirect 只有在舊 Slug 不是 active Slug、目標存在於該次可見 Article 集合，且目標 sourceNodeToken 與 alias 一致時才成立。草稿預設不在公開集合；內部明確要求 includeDraft 時沿用其可見性選擇。
- 詳情路由先處理 redirect，再讀目前 Article。成功導向保留 locale，使用永久 redirect；寫入 HTTP Location 前對目標 Slug 路徑段做 URI 編碼，儲存的 Slug 維持原值，中文舊連結同樣適用。舊 artifact 在 index／redirect／同步狀態發布後清理。這個先後順序不代表整個儲存流程具有原子性。

目前依據：[同步與 Slug 分配](./sync.ts)、[索引與身分查詢](./repository.ts)、[詳情路由](../../pages/blog/%5Bslug%5D.tsx)、[Article 型別](../../common/types/blog.ts)。

## 內容同步與 Asset

- [同步 factory](./sync.ts) 延遲取得來源與 publication。optional 模式缺少 Feishu 設定時，不讀取來源或持久化資料；必要模式仍回報缺少設定。
- [Reconciliation](./article-reconciliation.ts) 以 sourceDocumentId、parser contentVersion、coverToken 及 revisionId（缺少時使用 edit time）判斷能否重用。parser 版本更新即使來源 revision 不變也須重建。
- 單篇 inspect／read 暫時失敗時，保留最後成功且通過 Slug／身分核對的 Article 與同步狀態；沒有可用舊內容才省略。無法讀取既有儲存資料會中止，不把損壞資料當空狀態。
- [Feishu transport](./feishu.ts) 驗證實際消費的回應。清單必須有 items；has_more 為 true 時必須有下一頁 token，避免把不完整來源當成完整空清單。正常空清單仍有效。
- HTTP 429 及既有業務限流最多重試兩次；HTTP Retry-After 優先，其餘沿用線性退避。下載保留 Buffer、Content-Type、Content-Disposition。mention、reminder、source_synced 由[renderer 正規化](./feishu-blocks.ts)負責，其他擴充欄位保留給既有 renderer。
- [Asset manager](./assets.ts) 以 token 共用下載與引用；只清理未被任何下一版 Article 引用的 Asset。實體刪除失敗會保留 metadata，讓後續同步重試。
- 目前流程先處理 Article 與 Asset、清理未引用 Asset，再發布 index、search index、sync state，最後清理 alias 舊 artifact。這是既有順序，並沒有跨儲存原子性保證。

歷史依據：[來源／發布邊界 f2386bd](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/f2386bd)、[失敗狀態保留 65527d8](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/65527d8)、[parser 更新重建 4475175](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/4475175)。2026-10-22 治理把 schema 與正規化責任集中，保留上述契約；用缺失／損壞回應拒絕測試防止誤清理。

## 搜尋排序

[搜尋索引與查詢](./search.ts)的字詞全部必須匹配；每個字詞的 title／tag／summary／body 權重依序為 80／50／30／10，同分以發布日期排序。缺少搜尋索引時只以既有 summary 建立 fallback；命中 excerpt 優先取 body，再取 summary。沒有搜尋詞時沿用日期排序。

## 歷史判斷及理由

| 判斷                             | 理由與目前狀態                                                                                 | 來源                                                                                                                                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 改名保留舊路徑並清理舊 artifact  | 舊連結應找到同一 Article；殘留 JSON 不能使舊路徑繼續回傳過期內容。現行有效。                   | [a755b42](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/a755b425b905f0d02017dd330698fff550c469fc)                                                                                                                                |
| 讀取與重用 artifact 必須核對身分 | Slug 與檔案存在不足以證明內容屬於正確 Source Document。現行有效。                              | [e38cd14](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/e38cd1422bed1e81738680a094af35529dfbe3ea)、[對應回歸測試 c6cbe6a](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/c6cbe6a34cb6cc571bc53b05748aefdfb581c092) |
| alias 永久保留且不得重用         | 舊網址不能日後指向另一篇 Article。原先寫於 CONTEXT.md 的規則移到本 owner，名詞定義仍留在原處。 | [901fd1e](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/commit/901fd1e981df93496837c6074dbcc196b7886612)                                                                                                                                |
| 儲存讀取區分缺檔與損壞資料       | 2026-10-22 治理試點：只驗證既有消費欄位，避免收緊合法契約；損壞資料不能進入同步清理。          | [資料契約](../../common/schemas/blog.ts)、[儲存及同步操作測試](../../__tests__/server/blog/storage.test.ts)                                                                                                                                     |

## 對應驗證

驗證沿用 module 的既有 interface，不只測內部 Slug helper：

2026-10-23 正式站的 CSS 舊網址揭露未編碼中文轉址造成 500；先前 fixture 僅有 ASCII Slug。現以實際中文新舊 Slug 驗證三個語系，避免將有效 alias 的資料查詢成功誤當成 HTTP 轉址成功。

- [同步契約測試](../../__tests__/server/blog/sync.test.ts)：改名、index 回復 Slug、錯誤身分 artifact 不重用，以及永久 alias 不再成為 active Slug。
- [查詢契約測試](../../__tests__/server/blog/repository.test.ts)：舊 JSON 不直接公開、active Slug 下的錯誤身分拒絕、alias 導向及目標身分不符時拒絕。
- [詳情路由測試](../../__tests__/server/blog-page.test.ts)：ASCII／中文舊路徑在繁中、英文、簡中保持永久 redirect，目標 URI 可安全寫入 HTTP header。[production HTTP smoke](../../../scripts/smoke-build.ts) 以實際 Next 建置驗證三語系中文 alias 回 308、目標閱讀及搜尋正常。
- [儲存操作測試](../../__tests__/server/blog/storage.test.ts)：seed fallback、local／Blob 快取、舊資料與額外欄位相容、損壞資料拒絕，以及同步不發布或刪除。
- [Feishu 操作測試](../../__tests__/server/blog/feishu.test.ts)：限流、下載 headers、清單完整性與 renderer 相容正規化。
- [Asset 操作測試](../../__tests__/server/blog/assets.test.ts)：多個 Article 消費端共用下載與最後引用消失後才刪除；刪除失敗保留由同步契約測試涵蓋。

## 子索引與跨域連結

- [伺服器業務索引](../BUSINESS.md)
- [內容發布名詞](../../../CONTEXT.md)
- [公開閱讀與 URL 狀態](../../modules/blog/BUSINESS.md)
- [事件同步、queue 與 lease](sync-trigger/BUSINESS.md)

消費端應連回本文件；工程規約與執行命令見 [AGENT.md](../../../AGENT.md)。
