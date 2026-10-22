# 語言、路徑與 SEO

## 現行規則與例外

- 支援 zh-TW、zh-CN、en，預設 zh-TW；未知或未指定 locale 回到預設。文案沿用 base 定義與三語 messages，純文案不另拆出業務 owner。
- 預設語言路徑不加 prefix，其他語言加 `/zh-CN` 或 `/en`；canonical／language alternates 會移除既有語言 prefix、query 與 hash，避免雙重 prefix。
- LanguageSwitcher 先寫一年有效的 NEXT_LOCALE、path=/、SameSite=Lax，再沿用 pathname、query、asPath 呼叫 Pages Router 的 locale 導航；選擇目前語言不重複導航。
- 導覽與 SEO 使用同一 locale 正規化與 site config，不建立第二份語言偵測或翻譯快取。[路徑與 SEO](../common/config/seo.ts)、[切換元件](../common/components/elements/LanguageSwitcher.tsx)。

## 歷史判斷與理由

- 本輪保留既有三語與無 prefix 預設語言，僅明確處理 async 事件回呼；不能因型別收緊改寫網站永久路徑或清掉 query。
- 顯示與水合策略連回 [共通互動 owner](../common/components/elements/BUSINESS.md)，不在這裡重複主題或 mobile 規則。

## 對應驗證

- [locale／SEO 與掛載測試](../__tests__/components/site-interaction.test.tsx)：切換保留頁面 query、cookie、目前語言 no-op、prefix／query／hash 正規化與未知語言。
