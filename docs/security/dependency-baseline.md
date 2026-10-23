# 相依安全基線

查核日期：2026-10-23。使用 Node 24.15.0、pnpm 10.32.1；相依版本以 `pnpm-lock.yaml` 為準。公告命中代表套件版本風險，不能直接當作本站可利用性結論。原始 audit 持續保留，不新增忽略名單。

## 本次相容升級

| 套件                                | 原版本 → 本次版本 | 判斷與驗證                                                                                                                                                                                              |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next、@next/env、eslint-config-next | 16.3.8 → 16.4.1   | [官方修補版](https://github.com/vercel/next.js/releases/tag/v16.4.1)。維持 Pages Router、React 19 與既有 feishu-docx resolver alias，以完整 production build／閱讀、搜尋、三語系永久 alias smoke 驗證。 |
| DOMPurify override                  | 3.4.16 → 3.4.17   | [官方修補版](https://github.com/cure53/DOMPurify/releases/tag/3.4.17)。測試實際安裝的 npm 相依，驗證 shadow-root 模板清理及 XHTML SVG 屬性清理，並保留正常 HTML。                                       |
| Browserslist（Autoprefixer 相依）   | 4.28.2 → 4.29.4   | 同一 major、符合原相依範圍，僅更新鎖檔；高風險公告首個修補版為 4.28.7。以完整 CSS production build 驗證，沒有新增 override。                                                                            |

保留 sharp 0.35.5 override，符合 [Next 圖片最佳化公告的 workaround](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)。另外兩項 Next 公告涉及 App Router／Server Actions／use cache；本專案目前沒有這些入口，仍依 production gate 政策升級。

## Monaco 的不同載入路徑

安裝樹中 `@monaco-editor/react → monaco-editor → dompurify` 的 npm DOMPurify 已升級。相容測試透過實際 caller 解析此相依，沒有把其他根目錄套件當作受測版本。

但本站 CodeEditor 沒有設定 `loader.config`：`@monaco-editor/loader` 1.5.0 預設載入 CDN Monaco 0.52.2；本地 monaco-editor 0.55.1 也另含 vendored DOMPurify 3.2.7。npm override 不會改寫 CDN 或 vendored 檔案，因此本次不能宣稱已升級瀏覽器實際載入的 sanitizer。本站與所查的 Monaco 路徑未找到公告涉及的 SAFE_FOR_TEMPLATES／IN_PLACE／XHTML 設定，尚未證實該編輯器路徑可利用。

後續若調整 editor loader／worker、載入來源，或使用上述 sanitizer 設定，須重新評估實際執行版本與瀏覽器相容性；本次沒有擴大成 Monaco 載入方式遷移。

## 尚無修補版：braces 3.0.3

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 為深度巢狀 pattern 導致堆疊耗盡。目前上游最新仍為 3.0.3，沒有安全修補版；含開發相依的 audit 仍會回報 high。它與已修補並保留相容 patch 的 `brace-expansion` 是不同套件。

```text
eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces
next-sitemap → fast-glob → micromatch → braces
```

- 在 Node 24 隔離實測，惡意深度巢狀 pattern 可經 fast-glob → micromatch → braces 產生 RangeError；正常 TS／TSX glob 與一般 brace expansion 控制組可用。確切深度依 V8 狀態而變，不能把某個固定長度當作安全邊界。
- Next ESLint 的該 glob 分支以 `settings.next.rootDir` 為入口，本專案未設定；next-sitemap 的該 glob 分支需要 `output: 'export'`，本專案也未啟用。已查的入口沒有接收正式站請求或外部 pattern。
- fast-glob 3.3.3／micromatch 4.0.8 仍依賴 braces；沒有已發布的相容升級可移除。已安裝的 tinyglobby 使用不同 exports，不能直接用全域 package alias 取代 fast-glob 的 callable API。

本次保留原相依及原始 high 回報，沒有跨套件 alias、手寫 glob/parser 或 audit 忽略規則。production high／critical 門檻與此開發／建置殘餘風險分開判定。

下列任一條件成立時重新處理：上游發布修補版或相容移除路徑；新增 `settings.next.rootDir` 或 static export；把 glob 帶入正式執行路徑；外部輸入開始控制 pattern。升級後須重驗 lint、sitemap 與正常 glob 契約。

## 持續驗證

本次本地驗收：乾淨 frozen install、零警告 lint、typecheck、格式、22 份 BUSINESS 索引與 actionlint 通過；57 suites／262 tests／1 snapshot 通過。完整 production build／postbuild 與閱讀、全文搜尋、三語系永久 alias、草稿及身分邊界 smoke 通過。production raw audit 與 gate 均 exit 0、各嚴重性皆為 0；全相依 raw audit exit 1，只剩上文 braces 的 1 high。

DOMPurify 的 shadow-root／XHTML 回歸在 3.4.16 失敗、3.4.17 通過，正常 HTML 控制組保持一致；[相依相容測試](../../src/__tests__/scripts/dependency-compatibility.test.ts)也保留 Firebase RSA 與既有 brace-expansion callable 契約。這些 npm 相依測試不代替 Monaco CDN 的瀏覽器安全驗證。

- `corepack pnpm install --frozen-lockfile`、lint、typecheck、格式、BUSINESS 索引、Jest 及 production smoke。
- `corepack pnpm audit:production`：正式 gate 阻擋 production high／critical，掃描服務／工具失敗另報 exit 2。
- `corepack pnpm audit --json`：保留包含開發／建置相依的完整結果；不以 production gate 通過宣稱全相依零風險。
- 相依異動 PR 與每週 production 掃描維持既有政策；正式站僅以公開 GET 驗收，不執行同步或正式資料寫入。
