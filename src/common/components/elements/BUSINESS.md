# 共通互動與播放狀態

## 掛載、主題與瀏覽器狀態

- ThemeSwitcher 與其他瀏覽器 UI 沿用 useHasMounted：SSR／首次 hydration 顯示 placeholder，掛載後讀 next-themes resolvedTheme。compact 切換保留圓形按鈕與原 light／dark setter。
- useIsMobile 保留原初始 `<769` 判斷，effect 同步外部視窗後使用 `<821`；本輪不合併這兩個既有 breakpoint。useLoading 在 Router 首次 ready 後解除，沒有改成每次導航重新 loading。
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
