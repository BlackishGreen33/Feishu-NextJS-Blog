# 外部活動儀表板

## 現行規則與例外

- GitHub 僅顯示啟用帳號。personal token 有值時使用 GraphQL，沒有 token 時抓公開 contributions HTML。GraphQL 失敗再試公開頁；公開成功仍標記 configured=false，兩者都失敗時有 token 為 true、無 token 為 false。這個旗標表示私有設定，不能拿來判斷是否有公開資料。
- GitHub 日曆消費 colors／months／weeks／totalContributions；hover 顯示當日計數，週、最佳日與日均由日曆計算。動畫延遲依日序固定，避免 render 隨機值破壞 hydration。
- WakaTime 缺 key 時回傳 configured=false 的空狀態；來源失敗或異型回應回傳 configured=true 的空狀態。語言只取前三名；categories 與 editors 保留，讀取缺省欄位不強制填造數據。
- last_update 使用 Asia/Jakarta 解讀及顯示距今時間，瀏覽器 effect 才計算，避免 SSR 時鐘差異。API 回應可被 JSON 序列化，保留 60 秒 shared cache／30 秒 stale-while-revalidate。
- 來源實作：[GitHub](../../services/github.ts)、[WakaTime](../../services/wakatime.ts)；共同輸入契約：[schemas](../../common/schemas/dashboard.ts)。

## 歷史判斷與理由

- `f5279ff` 的站點重建引入現有展示；`c217f7e` 統一環境設定與缺設定 fallback。本輪保留兩種 GitHub 讀取、WakaTime 空狀態及 API 形狀，不把來源故障當成全站故障。
- 外部 JSON 驗證限於實際消費的欄位，保留額外欄位；不引入第二套 request/cache 設施，前端沿用 SWR。

## 對應驗證

- [外部展示測試](../../__tests__/services/external-displays.test.ts)：缺設定不呼叫來源、GraphQL 異型轉公開、公開失敗、前三名語言及 WakaTime 失敗。
