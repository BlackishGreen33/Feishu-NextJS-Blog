# 第三方 UI 來源與授權

這些來源依各自授權使用；本專案的根 LICENSE 不取代下列聲明。

## Cult UI Code Block

來源：https://github.com/nolly-studio/cult-ui/blob/main/apps/www/registry/default/ui/code-block.tsx

調整：採用單段程式碼外框與複製控制的排版，保留本站 Prism、飛書背景與三語。

```text
MIT License

Copyright (c) 2023 Jordan-Gilliam

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Magic UI Animated Theme Toggler

來源：https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/animated-theme-toggler.tsx

調整：採用受控的 circle View Transition；使用本站 next-themes、圖示、三語，250ms ease-out，並補 reduced motion 與清理。

```text
MIT License

Copyright (c) Magic UI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Radix Colors

來源：https://github.com/radix-ui/colors

調整：僅使用 slate 與 teal 的明暗色票，透過 reader 語意變數供閱讀元件與 About 頁籤／時間軸使用。

```text
MIT License

Copyright (c) 2021-2022 Modulz
Copyright (c) 2022-Present WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Animata Fluid Tabs

來源：https://animata.design/docs/tabs/fluid-tabs

原始碼：https://animata.design/r/tabs/fluid-tabs.json

授權：https://github.com/codse/animata/blob/main/LICENSE.md

調整：將共享選取膠囊、標籤縮放與手動鍵盤選取整合至既有 Tabs 介面，使用現有 framer-motion 及 Radix 色票，補 tab／tabpanel 關聯、窄螢幕排版與減少動態效果。未引入通用 compound API。

```text
MIT License

Copyright (c) Animata

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Aceternity Timeline

來源：https://ui.aceternity.com/components/timeline

原始碼：https://ui.aceternity.com/registry/timeline.json

授權：[Aceternity License](https://ui.aceternity.com/licence)（作者保有所有權，非 MIT）。

官方授權允許修改、組合元件並用於個人或客戶的終端產品，包括個人網站；禁止以元件原始碼、素材、元件庫或市集範本形式再散布。本專案只將此適配版用於個人網站的 About 時間軸，不另行提供通用元件產品。

調整：保留日期、節點、sticky 與捲動光束，移除示例標題及假資料，配合既有經歷／教育排序與內容。以 CSS 高度及 Motion 捲動比例避免手動量測高度，支援內容展開、手機單欄與減少動態效果；沿用現有 framer-motion。
