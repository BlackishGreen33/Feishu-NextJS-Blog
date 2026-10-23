# JavaScript Playground

## 現行規則與例外

- initialCode 只初始化本地編輯 state；獨立頁與 Learn 內嵌共用同一元件，切換全螢幕共用 code／output／isError。
- 執行使用瀏覽器 Function，擷取 console.log 第一個參數並接上回傳值；錯誤顯示 Error.toString 或原有 unknown 提示。這是現有同步執行模型，沒有新增 worker、非同步等待或隔離環境。
- console 擷取是產品功能，僅擷取與還原處允許 no-console 例外。每次執行都在 finally 還原原本的 console.log，涵蓋成功、執行錯誤、語法錯誤與非 Error 拋出；錯誤後仍可繼續編輯與執行。還原須早於結果／錯誤轉字串，以維持格式化時的既有 console 行為。
- Monaco 使用已安裝的 EditorProps 定義，掛載後 500ms 執行格式化。mobile 改為垂直 Panel 並 resize 50%，沿用現有 mobile hook 契約。

## 歷史判斷與理由

- 現有行為可追溯到 `8151cb1`／`f5279ff`；本輪保留編輯、清除、執行與錯誤顯示，取消整檔 lint disable，改用 SDK 型別與必要區塊例外。
- 動態 Function 的回傳邊界為 unknown，顯示時才轉文字，沒有以 any 擴散到元件狀態。
- 2026-10-23 修正原先只在成功路徑還原 console 的缺陷。沿用同步執行模型，將還原移至 finally，避免錯誤後的網站輸出繼續被 Playground 擷取。

## 對應驗證

- [互動測試](../../__tests__/components/Playground.test.tsx)：編輯、console、回傳值、三類錯誤的 console 還原、回傳物件格式化與錯誤後再次執行。
