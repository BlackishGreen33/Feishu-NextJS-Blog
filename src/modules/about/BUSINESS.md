# 經歷與技能展示

## 現行規則與例外

- 經歷與文案由 getCareers(locale) 提供，空清單顯示原空狀態；依結束時間新至舊，再依起始時間排序，仍在職使用瀏覽器目前時間。
- 在職期間的時鐘只在掛載後讀取一次，整個清單與卡片共用。SSR／首次 hydration 暫不顯示尚未取得的在職 duration；完成掛載後維持原 differenceInYears／differenceInMonths %12 +1 文字算法，已結束經歷仍可直接顯示期間。
- 卡片有 responsibilities 才出現展開操作；公司、日期、類型、地點與語系顯示沿用原資料，不增設履歷來源。
- Skills 初始保留空列以維持 hydration；掛載時一次產生三組亂序，render 不再重新抽樣。第二列反向滾動，沿用現有 slider。

## 歷史判斷與理由

- render 內 Date.now／Math.random 造成相同輸入無法穩定產生同一輸出；本輪把外部時鐘與隨機初始化移到掛載階段，局部例外明列用途，沒有用 microtask 隱藏規則。
- 這些規則屬經歷／技能展示，不下放到 Date helper 或每個圖示的 BUSINESS.md。

## 對應驗證

- [經歷互動](../../__tests__/components/CareerList.test.tsx)：固定時鐘、排序、在職期間與日期文字。
- [掛載與 locale](../../__tests__/components/site-interaction.test.tsx)、型別與 React lint 檢查。
