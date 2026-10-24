# 共通互動與播放狀態

## 掛載、主題與瀏覽器狀態

- ThemeSwitcher 與其他瀏覽器 UI 沿用 useHasMounted：SSR／首次 hydration 顯示 placeholder，掛載後讀 next-themes resolvedTheme。compact 採用 Magic UI circle Theme Toggler 的 MIT 適配版，保留圓形按鈕與 light／dark setter；View Transition 從按鈕展開，250ms ease-out。減少動態效果、API 不可用或失敗時直接切換，卸載與結束時釋放動畫；完整選單沿用既有行為。
- useIsMobile 在 SSR 與首次 hydration 都先使用未初始化的 viewport，掛載後才讀寬度；保留初始 `<769` 公式，effect 同步後使用 `<821`，不合併既有 breakpoint。useLoading 在 Router 首次 ready 後解除，沒有改成每次導航重新 loading。
- Image 在來源改變時重置 loading 與 currentSrc；onError 有 fallback 才切換，Feishu 本地資產繼續 bypass optimizer。
- 掛載、視窗、Router 及圖片 effect 的局部 React 例外各附理由；不把一般衍生狀態偽裝為外部初始化。
- 語言與 URL 的唯一規則來源為 [i18n owner](../../../i18n/BUSINESS.md)。
- [互動測試](../../../__tests__/components/site-interaction.test.tsx)、[主題](../../../__tests__/components/elements/ThemeSwitcher.test.tsx)與 [Markdown／程式碼](../../../__tests__/components/elements/CodeBlock.test.tsx)驗證主要可見行為。

## Spotify 播放狀態

### 現行規則與例外

- client id／secret／refresh token 必須全部存在才啟用；缺任一值時回傳空 devices／tracks 與未播放狀態，不聯絡來源，也不阻止其他頁面運作。
- token、devices、目前曲目與熱門曲目只驗證實際消費欄位；目前曲目挑 640px 圖片，熱門曲目挑 64px 圖片，沒有對應尺寸可缺省。
- 來源裝置 id 不參與 UI 身分映射，允許官方契約的 null；圖片 width 亦可為 null，此時不會被選作 64／640px 圖片。[裝置契約](https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices)、[圖片契約](https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track)。
- 204 或既有 `status > 400` 分支保持空資料；transport 例外仍向上傳遞，不改為假成功。播放欄只在 songUrl 非空時出現；未知裝置保留 Unknown Device／device-unknown。
- [來源服務](../../../services/spotify.ts)與 [schema](../../schemas/spotify.ts)共同約束 API；NowPlayingDock 沿用 SWR，瀏覽器不接觸私密憑證。

### 歷史判斷與理由

- `c217f7e` 集中環境讀取；本輪保留 optional 展示，並以 schema 阻止異型 access_token 被拿來發送 Bearer 請求。未改動 Spotify 授權流程或新增輪詢政策。

### 對應驗證

- [服務測試](../../../__tests__/services/external-displays.test.ts)：缺設定零呼叫、曲目／裝置映射、合法 null、204、來源失敗與錯誤 token。

## 程式碼與互動游標

- Markdown 清洗只保留受限 language class 與程式碼背景 metadata；程式碼沿用 PrismLight 的常用語言及別名，未知語言以原名稱／純文字顯示。One Light／One Dark 跟隨 resolvedTheme，工具列語言名稱與複製按鈕並列，複製不包含樣式標記。
- 背景資料是完整純文字 UTF-16 的半開區間及固定飛書色碼；非法、重疊或越界資料不套背景，仍顯示原文。背景 span 在語法 token 內，保留前景色，明暗主題採相同色系。
- 可用按鈕、連結、選單及選擇控制預設 pointer；文字輸入、停用與拖曳／縮放維持各自游標。
- 真實渲染驗證沿用 Jest 啟動 tsx，覆蓋實際 Markdown／sanitize／Prism，而非只驗證 mock 傳參。
- 程式碼外框改接 Cult UI Code Block 的 MIT 單段外觀，控制列與正文共用背景，原有 Prism／精確飛書背景不變；本輪 UI 顏色使用 Radix slate／teal 的語意變數。第三方來源及調整見 [授權聲明](THIRD_PARTY_NOTICES.md)。
- 語言與複製圖示置於右上角，使用浮動控制讓程式碼從頂部排起並繞開控制，不保留整列空白工具列；複製按鈕沒有可見文字，保留 aria-label、勾選回饋與 screen-reader status。

- CodeBlock 沿用共用 useHasMounted，讓 SSR 與第一次 hydration 都使用相同 placeholder；不使用立即 resolve 的 no-SSR loader，避免同一模組已載入時產生不同初始 DOM。回歸測試以真正 Node SSR HTML 在已暖機的 client hydrate，要求沒有 recoverable error。
