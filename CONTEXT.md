# Feishu Content Publishing

此 context 將指定飛書知識庫中的文件轉換成網站可發布與查詢的內容。

## Language

**Source Document**:
在指定飛書知識庫中找到的文件。即使標題或產生的公開路徑改變，其身份仍保持穩定。
_Avoid_: Raw article, post

**Article**:
由 Source Document 標準化而成的站內內容；每份 Source Document 最多產生一篇 Article。草稿或隱藏內容仍是 Article，可見性不會改變其身份。
_Avoid_: Feishu document, blog item

**Publication State**:
Article 是否符合公開查詢條件的狀態。草稿 Article 仍屬於內容集合，但預設不會出現在公開查詢中。
_Avoid_: Article type, content kind

**Slug**:
分配給 Article、可供閱讀且允許改變的路徑片段。Slug 不是 Article 或 Source Document 的身份。
_Avoid_: Article ID, document ID

**Reconciliation**:
一次讓 Article 集合與可用 Source Document 對齊的同步。暫時無法檢查或轉換單一 Source Document 時，保留其最後成功產生的 Article，其他文件則繼續處理。
_Avoid_: Migration, all-or-nothing import

**Asset**:
Article 引用的媒體。只要仍有至少一篇有效 Article 使用，就會保留該媒體。
_Avoid_: Article, content
