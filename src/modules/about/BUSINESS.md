# 關於、經歷與技能展示

## 現行規則與例外

- 經歷與文案由 getCareers(locale) 提供，空清單顯示原空狀態；依結束時間新至舊，再依起始時間排序，仍在職使用瀏覽器目前時間。
- 在職期間的時鐘只在掛載後讀取一次，整個清單與卡片共用。SSR／首次 hydration 暫不顯示尚未取得的在職 duration；完成掛載後維持原 differenceInYears／differenceInMonths %12 +1 文字算法，已結束經歷仍可直接顯示期間。
- About 四個頁籤使用 Animata Fluid Tabs 的適配版，保留三語標籤及原內容；方向鍵／Home／End 移動焦點，Enter／Space 或點擊才切換面板。面板保留 tab／tabpanel 關聯，只掛載選中的內容，減少動態效果時停用滑動。
- 經歷與教育使用 Aceternity Timeline 的適配版，桌面日期與節點跟隨區段，手機日期改在內容上方；光束跟隨頁面捲動，減少動態效果時改為靜態。日期只顯示在時間軸，不在內容重複。
- 有 responsibilities／highlights 才出現原生 details 展開操作；公司、日期、類型、地點、教育亮點、外連與語系顯示沿用原資料，不增設履歷來源。教育依結束年份新至舊、再依起始年份排序，未結束的項目優先，空清單保留空狀態。
- Skills 初始保留空列以維持 hydration；掛載時一次產生三組亂序，render 不再重新抽樣。第二列反向滾動，沿用現有 slider。

## 歷史判斷與理由

- render 內 Date.now／Math.random 造成相同輸入無法穩定產生同一輸出；本輪把外部時鐘與隨機初始化移到掛載階段，局部例外明列用途，沒有用 microtask 隱藏規則。
- 這些規則屬經歷／技能展示，不下放到 Date helper 或每個圖示的 BUSINESS.md。
- 本輪只替換頁籤及時間軸表現，沿用既有 framer-motion、圖示與共用 Radix 語意色票，未引入 UI 套件或改寫履歷內容。第三方來源及授權見[共用聲明](../../common/components/elements/THIRD_PARTY_NOTICES.md)。

## 對應驗證

- [經歷與教育互動](../../__tests__/components/CareerList.test.tsx)：固定時鐘、排序、在職期間、日期文字、外連、展開與空狀態。
- [頁籤互動](../../__tests__/components/elements/Tabs.test.tsx)：手動鍵盤選取、焦點、面板關聯與內容切換。
- [掛載與 locale](../../__tests__/components/site-interaction.test.tsx)、型別與 React lint 檢查。
