# 公開文章閱讀與 URL 狀態

本文件負責文章列表、搜尋與 URL 的顯示契約。[Article 身分、草稿、永久 alias 與同步規則](../../server/blog/BUSINESS.md)由內容 owner 保存；留言板與舊評論各自管理。

## 現行規則與例外

- `/api/blog` 沿用 Number(value) 或既有預設值的查詢轉換，search／tag 的陣列沿用 String(value) 的逗號串接；featured 只有字串 true 啟用。API 預設每頁 9 篇、精選上限 4，列表 UI 請求每頁 6 篇。
- [查詢實作](../../server/blog/repository.ts)把頁碼限制在可用頁數，空結果維持第 1 頁。搜尋與 featured／tag 條件可組合；排名與可見性連回內容 owner。
- [列表](components/BlogListNew.tsx)保留搜尋輸入的 500ms debounce、搜尋／清除時回第 1 頁、淺層導航與 tag query。page 的 effect 是外部 Router 狀態同步，局部保留有理由的 React 規則例外。
- 本輪保留既有 URL 行為：page／tag 來自 Router；search 使用元件輸入狀態，沒有額外加入初始 query.search 或 Back/Forward 的搜尋回填。這項產品行為若要改動，另列決策。
- 列表、精選與首頁輪播使用同一個 Article API schema；錯誤形狀交由既有 SWR 錯誤／空狀態處理，不把型別斷言當作 HTTP 驗證。
- 詳情與舊網址導向沿用內容 owner 的身分核對、locale 與永久 redirect，沒有增加獨立的 Slug 判斷。

## 歷史判斷與理由

2026-10-22 治理維持 Router effect、debounce 與查詢轉換，避免只為 lint 改變重新整理及分頁行為。新增 unknown → schema 的共用讀取方式後，本域完成遷移；不保留第二份未驗證的讀取路徑。

## 對應驗證

- [API 操作](../../__tests__/server/blog-api.test.ts)：搜尋參數與 matchedExcerpt。
- [查詢操作](../../__tests__/server/blog/repository.test.ts)：排序、組合條件、頁碼邊界、空結果及草稿／alias。
- [列表互動](../../__tests__/components/blog/BlogListNew.test.tsx)：Router page／tag 變動與請求同步。
- [精選讀取與顯示](../../__tests__/components/blog/BlogFeaturedSection.test.tsx)：HTTP mock 經實際 schema 後顯示 Article。

## 子索引與跨域連結

- [DEV 舊評論](components/BUSINESS.md)

- [功能索引](../BUSINESS.md)
- [內容 owner](../../server/blog/BUSINESS.md)

## 文章閱讀目錄與 Giscus

- Blog 的最終 HAST 在 raw HTML 與 sanitize 之後，為正文 H1–H3 產生 SSR anchor 與完整純文字目錄 label；ID 保留中文，重複名稱防碰撞，inline code 延遲載入不會遺漏文字。其他 Markdown 消費端預設不啟用此處理。
- 目錄只讀這些 metadata；視窗達 98rem 時，在正文容器外左側顯示 12rem 寬的 sticky 目錄，與正文間隔 2rem，不占用正文寬度。較窄視窗在文首使用預設收合的 details，沒有標題則隱藏。原生 anchor 保留 hash，scroll margin 避開頂欄，Observer 標示章節並在內容變更／卸載清理，reduced motion 沿用原生偏好。
- 文章底部使用本專案 Announcements 的 Giscus，固定識別為 blog:<Article.id>，specific／strict 配對。改名、Slug 與 locale 變更共用討論；reactions 開啟、輸入框置頂、延遲載入，locale／resolvedTheme 跟隨網站。
- 共用 Giscus 元件未傳固定識別時保留 pathname，因此 Learn 仍由既有 is_comment 控制。Giscus app 的 GitHub 安裝授權由維護者完成；缺少外部服務不阻止正文閱讀。
- 留言與 DEV 舊評論／Firebase 留言板各自獨立。測試只替換外部 widget 邊界，真實載入需瀏覽器驗收。
- 採用 Rare UI Rail TOC 的軌道、節點與紙飛機動效，以同一份 metadata／reading line／activeId 驅動並保留原生 anchor、正文外定位及手機收合。不顯示目錄標題；手機入口只顯示圖示，名稱只供輔助技術讀取。來源署名及獨立條款見 [Rare UI 授權](components/RARE_UI_LICENSE.md)與 README 鳴謝。

2026-10-24 閱讀頁保留同內容 Markdown 的 DOM 身分，避免目錄重繪持有已斷開節點；整篇文章不套 AOS 進場 transform，讓初始 fragment 與 sticky 位置穩定。快速跳躍捲動以被動 scroll／rAF 補足 Observer 跨越取樣。章節偏移在 lg 以下使用 12rem、桌面使用 7rem，避開手機多行語系控制的固定頂欄，包含已捲動後的連續 hash 跳轉。
