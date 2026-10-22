# sprintf-js 公告處置紀錄

查核日期：2026-10-22。程式基準：`c4d8c6ed5d3472c8ea14d40e7258bc1bcf3e81cc`。本紀錄適用於 Node 24、pnpm 10.32.1 與下列鎖定版本。

## 判定與適用範圍

保留現有相依，持續顯示原始 audit 結果，不新增忽略名單，也不把這筆回報標示為已修補。

```text
gray-matter 4.0.3
└── js-yaml 3.15.2
    └── argparse 1.0.10
        └── sprintf-js 1.0.3
```

[CVE-2026-97058 的官方紀錄](https://github.com/CVEProject/cvelistV5/blob/c3f6773766e2cf1dc050bfff2d59b236c86bb687/cves/2026/97xxx/CVE-2026-97058.json)顯示，CNA 已於 2026-10-12T19:33:32.335Z 將其改為 `REJECTED`，沒有提供進一步技術理由。查核時 [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) 仍列 moderate、影響版本 `<=1.1.3`，沒有修補版本。

CVE 撤回不等於 GitHub 已撤回獨立的 GHSA，也不證明格式化函式接受所有輸入都安全。公告描述的 `RangeError` 可直接重現，但本次沒有在本站目前的 YAML 解析路徑找到通往該函式的呼叫。

## 實際可觸及性

- 本站僅在 [MDX 讀取](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/blob/c4d8c6ed5d3472c8ea14d40e7258bc1bcf3e81cc/src/common/libs/mdx.ts#L33)與 [Feishu 文章解析](https://github.com/BlackishGreen33/Feishu-NextJS-Blog/blob/c4d8c6ed5d3472c8ea14d40e7258bc1bcf3e81cc/src/server/blog/sync.ts#L210)使用 gray-matter，沒有直接呼叫 sprintf 或 js-yaml CLI。
- gray-matter 的 YAML engine 呼叫 js-yaml 的 `safeLoad`。js-yaml 的 library entry 不載入 argparse；只有其 CLI entry 會載入。
- Node 24.15.0 實測：解析 metadata 中的 `%.101f` 與內文中的 `%.0g` 後，文字保持原樣，`require.cache` 沒有載入 argparse 或 sprintf-js。另直接呼叫 `sprintf('%.101f', 1)` 確實拋出 `RangeError`。
- 這些證據適用於目前的呼叫路徑；不涵蓋未來新增的模板引擎、CLI 包裝或不可信格式字串。此判定也不是對整個 Markdown 引擎或正式服務的完整安全認證。

## 升級相容性

| 候選             | 查核與實測                                                                                                              | 決定                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| sprintf-js 1.1.3 | 仍在公告影響範圍，沒有官方修補版                                                                                        | 不為此強制升級          |
| argparse 2.0.1   | 可移除 sprintf-js，但 js-yaml3 的 `-v`／`--version` 從 `3.15.2` 變成空輸出；正常轉換與錯誤路徑新增 deprecation warnings | 不採用跨 major override |
| argparse 3.0.3   | [官方遷移指南](https://github.com/nodeca/argparse/blob/master/doc/migrate_v2_to_v3.md)說明已移除 js-yaml3 使用的 v1 API | 不直接替換              |
| js-yaml 4.3.2    | 實際呼叫 `safeLoad` 拋出 API 已移除錯誤，破壞 gray-matter 預設 engine                                                   | 不直接替換              |

argparse 1／2 的比較使用隔離的實際 js-yaml3 CLI，包含 help、長短版 version、YAML／JSON stdin、舊 `-j`、compact／trace 錯誤及不存在檔案，共九種情況。此處不將「可以安裝」視為「行為相容」。

## 驗證與持續處理

- 現有同步及 MDX 高層測試：隔離副本、無正式憑證，2 suites／22 tests 通過。
- production audit：0 high、0 critical、1 moderate。原始 audit exit 1；既有 high／critical gate exit 0。漏洞與掃描服務故障的區分維持不變。
- 可用 `corepack pnpm why sprintf-js --prod` 與 `corepack pnpm audit --prod --json` 重新核對相依路徑與公告；使用 `.nvmrc` 指定的 Node 24。
- 已提交[上游更正建議 #10497](https://github.com/github/advisory-database/pull/10497)，加入公開的 CNA 撤回證據並請 GitHub 重新判定 GHSA 狀態；是否撤回由其維護團隊決定。提案沒有改動影響版本、嚴重性或撤回欄位，不得藉本紀錄跳過 audit 或擴大豁免。

下列任一條件成立時重新評估：

1. GHSA 的撤回狀態、影響範圍或修補版本改變。
2. gray-matter、js-yaml、argparse 或 sprintf-js 的鎖定版本／相依路徑改變。
3. 新增直接 sprintf 呼叫、CLI 包裝，或讓外部輸入成為格式字串。
4. 上游發布可保留既有解析與 CLI 契約的遷移版本。

既有每週 production 掃描與相依異動 PR gate 持續執行。若升級改變上述路徑，須重新驗證文章同步、MDX 讀取、YAML 解析與相關 CLI 相容性。
