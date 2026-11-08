# liquid-tabbar

[English](README.md) | **繁體中文**

液態玻璃風格的底部分頁列，原生 JS + CSS，沒有相依套件、不需要建置。

- 按一下切換：膠囊浮起成透明玻璃、滑過去，前緣柔和停下、後緣撞上來擠壓再回彈一次
- 按住左右拖動：膠囊跟著手指，蓋到的圖示即時變色，鬆手才切換
- 膠囊到位後才通知你換頁，重建頁面不會卡住動畫
- 格數、圖示、文字、顏色、尺寸、彈簧手感都可以調整

**[線上示範](https://mailoswang.github.io/liquid-tabbar/)**

## 安裝

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.css">
<script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.js"></script>
```

網址裡固定版本號（`@v1.0.1`），之後函式庫更新也不會突然改變你的專案。也可以直接把 `liquid-tabbar.css`、`liquid-tabbar.js` 複製進專案。

## 快速開始

複製下面整段存成 `.html` 就能打開來試：

```html
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.css">
  <script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.js"></script>
  <style>
    body { margin: 0; background: #111; color: #fff; font-family: system-ui, sans-serif }
    main { padding: 24px 16px calc(110px + env(safe-area-inset-bottom)) }  /* 底部留空間給分頁列 */
  </style>
</head>
<body>
  <main id="page"></main>
  <nav id="tabs" aria-label="主要導覽"></nav>

  <script>
    const ICONS = {
      home: '<path d="M10.7 3.4a2 2 0 0 1 2.6 0l7.1 6.1c.4.4.6.9.6 1.4V19a2 2 0 0 1-2 2h-3.6a.9.9 0 0 1-.9-.9v-4.4a1.6 1.6 0 0 0-1.6-1.6h-1.8a1.6 1.6 0 0 0-1.6 1.6v4.4a.9.9 0 0 1-.9.9H5a2 2 0 0 1-2-2v-8.1c0-.5.2-1 .6-1.4z"/>',
      search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m15 15 5.5 5.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
      user: '<circle cx="12" cy="8" r="4.2"/><path d="M3.8 20.2c.8-4 4.2-6.4 8.2-6.4s7.4 2.4 8.2 6.4a.9.9 0 0 1-.9 1H4.7a.9.9 0 0 1-.9-1z"/>'
    };

    const show = id => { document.getElementById("page").textContent = "目前頁面：" + id; };

    const tabs = new LiquidTabbar("#tabs", {
      items: [
        { id: "home",   label: "首頁", icon: ICONS.home },
        { id: "search", label: "搜尋", icon: ICONS.search },
        { id: "me",     label: "我的", icon: ICONS.user }
      ],
      active: "home",
      onSelect: item => show(item.id),
      onReselect: () => window.scrollTo({ top: 0, behavior: "smooth" })
    });
    show("home");
  </script>
</body>
</html>
```

`icon` 可以給 24×24 viewBox 內的路徑（會用 `fill="currentColor"` 包成 `<svg>`），也可以直接給完整的 `<svg>`。

## 放進頁面時要注意

- **底部留空間**：分頁列預設固定在畫面底部，會蓋住頁面最下面的內容。替內容加上底部留白，例如 `padding-bottom: calc(110px + env(safe-area-inset-bottom))`。
- **iPhone 的安全區域**：`<meta name="viewport">` 要加上 `viewport-fit=cover`，分頁列才會避開底部的橫條。沒加也能用，只是離底部固定 8px。
- **無障礙標籤**：替 `<nav>` 加上 `aria-label`（例如「主要導覽」）。每個按鈕會自動帶 `aria-label`，選中的那格帶 `aria-current="page"`。
- **元素內容會被取代**：傳進去的元素裡原本的內容會被清掉，給一個空的 `<nav>` 即可。

## 配合路由

使用者在分頁列上點按或拖動時，膠囊會自己移到新的那格，`onSelect` 裡只需要換頁，不用再呼叫 `setActive`。

頁面從別的地方改變時（瀏覽器的上一頁、頁面裡的連結），呼叫 `setActive` 讓分頁列跟上：

```js
addEventListener("hashchange", () => {
  const id = location.hash.slice(2) || "home";
  tabs.setActive(id);          // 跟目前選中的一樣時不會重播動畫
});
```

某些頁面不屬於任何分頁時，用 `tabs.setActive(null)` 隱藏膠囊。

## ES module 與框架

用 `import` 載入也可以，載入後從 `window.LiquidTabbar` 取用：

```js
import "https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.js";
const tabs = new window.LiquidTabbar("#tabs", { /* … */ });
```

在 React、Vue 等框架裡，分頁列的內容由函式庫自己管理：給它一個框架不會再渲染子元素的空元素，掛載時建立、卸載時 `destroy()`。React 範例：

```jsx
function Tabs({ items, active, onSelect }) {
  const ref = useRef(null), bar = useRef(null);
  useEffect(() => {
    bar.current = new window.LiquidTabbar(ref.current, { items, active, onSelect });
    return () => bar.current.destroy();
  }, []);
  useEffect(() => { bar.current.set({ items, active }); }, [items, active]);
  return <nav ref={ref} aria-label="主要導覽" />;
}
```

`onSelect` 會在建立時固定下來；如果它依賴會變的狀態，請透過 ref 取得最新值。

## 選項

| 選項 | 預設 | 說明 |
|---|---|---|
| `items` | `[]` | `[{ id, label, icon }]`，格數就是陣列長度 |
| `active` | `0` | 選中的 `id` 或索引；`null` / `-1` 代表都不選（膠囊隱藏） |
| `onSelect(item, index, info)` | — | 選了另一格。手勢：膠囊到位後才呼叫；鍵盤：立即呼叫。`info.source` 是 `"gesture"` 或 `"click"` |
| `onReselect(item, index, info)` | — | 點了已選中的那格（常用來回到頂端） |
| `physics` | 見下方 | 彈簧手感，只需要傳想改的欄位 |
| `arriveDistance` | `6` | 膠囊離目標幾 px 內算到位 |
| `arriveTimeout` | `320` | 最多等膠囊多久（ms）就呼叫 `onSelect` |
| `liftHold` | `120` | 到位後多久收回浮起狀態（ms） |
| `liftMin` / `liftMax` | `60` / `180` | 沒換頁時浮起狀態最短 / 最長保留（ms） |
| `dragThreshold` | `6` | 手指移動幾 px 才算拖動 |
| `clickGuard` | `800` | 手勢後擋掉晚到的 click 多久（ms），iOS 會晚送 click |

也可以監聽事件：`tabs.el.addEventListener("ltb:select", e => e.detail.item)`、`"ltb:reselect"`。

## 方法

```js
tabs.set({ items, active })          // 一次更新項目與選中格
tabs.setItems(items)                 // 換項目；數量相同時只更新變動的格子，膠囊能繼續滑
tabs.setActive("search")             // 或索引；{ instant: true } 不播動畫
tabs.setActive(null)                 // 隱藏膠囊
tabs.layout()                        // 手動重算尺寸（通常不需要，尺寸改變會自動處理）
tabs.destroy()                       // 移除事件與內容
tabs.el                              // 分頁列元素
tabs.index                           // 目前選中的索引
tabs.items                           // 目前的項目
```

## 外觀變數

在你的 CSS 覆寫 `.ltb` 上的變數即可（或直接寫在元素的 `style`）。預設是深色；加上 `ltb--light` class 換淺色，`ltb--auto` 跟隨系統。

```css
.ltb {
  --ltb-accent: #0a84ff;        /* 膠囊蓋到的圖示顏色 */
  --ltb-ink: #fff;              /* 一般圖示與文字 */
  --ltb-bottom: 24px;           /* 離螢幕底部 */
}
```

| 變數 | 說明 |
|---|---|
| `--ltb-ink` / `--ltb-accent` / `--ltb-focus` | 圖示文字顏色 / 選中顏色 / 鍵盤聚焦外框 |
| `--ltb-ind` | 平常的膠囊底色 |
| `--ltb-lift-bg` / `--ltb-lift-ring` / `--ltb-lift-edge` / `--ltb-lift-shadow` | 按住時浮起的玻璃膠囊 |
| `--ltb-bg` / `--ltb-blur` / `--ltb-rim` / `--ltb-shadow` / `--ltb-ring` | 玻璃底板：底色、模糊、邊緣光、投影、外圈亮邊 |
| `--ltb-width` / `--ltb-height` / `--ltb-pad-x` / `--ltb-pad-y` | 尺寸 |
| `--ltb-bottom` / `--ltb-z` | 位置（預設貼齊 iOS 原生分頁列）、層級 |
| `--ltb-icon` / `--ltb-gap` / `--ltb-font-size` / `--ltb-font-weight` | 圖示與文字 |
| `--ltb-pill-pad` | 膠囊比一格寬多少 |
| `--ltb-lift-w` / `--ltb-lift-h` / `--ltb-lift-scale` | 按住時膠囊變寬、變高、整條放大 |
| `--ltb-ease` / `--ltb-press` / `--ltb-release` | 浮起與收回的曲線與時間 |

想把分頁列放在頁面裡而不是固定在底部，覆寫 `position`、`left`、`translate`、`bottom` 即可，例如 `.ltb { position: relative; left: auto; translate: none; bottom: auto }`。

## 手感（physics）

```js
new LiquidTabbar("#tabs", {
  physics: {
    tap:  { C: 40 },   // 輕按：擠壓更明顯
    drag: { S: 30 }    // 拖動：拉長更明顯
  }
});
```

| 欄位 | 輕按 `tap` | 拖動 `drag` | 說明 |
|---|---|---|---|
| `k` / `c` | 420 / 41 | 1400 / 70 | 前緣彈簧剛度 / 阻尼。`c = 2√k` 是臨界阻尼：不過衝、指哪停哪 |
| `kt` / `ct` | 200 / 12 | 220 / 13 | 後緣追前緣的彈簧；阻尼越小，起步拉長與停下時的撞擊越明顯 |
| `S` | 16 | 24 | 拉長上限（px） |
| `C` | 32 | 24 | 擠壓上限（px） |
| `bulge` | .0013 | .002 | 擠壓 1px 時上下撐開的比例 |

只想要這套膠囊物理、畫面自己畫時，可以直接用 `LiquidTabbar.Pill`：

```js
const pill = LiquidTabbar.Pill((x, cmp, sy) => {
  // x：位置、cmp：寬度減少量（負值＝拉長）、sy：垂直伸縮
}, LiquidTabbar.physics);
pill.to(200);                    // 滑到 200px
pill.to(120, { drag: true });    // 拖動模式（跟手）
pill.arrive(() => {}, 6, 320);   // 到位（或逾時）後呼叫
```

## 相容性

Safari / iOS 16.4+、Chrome 120+、Firefox 128+（用到 `@property`、`mask-composite`、`clamp()`）。開啟「減少動態效果」時直接定位不播動畫；開啟「降低透明度」時取消背景模糊。

## 網頁做不到的效果

liquid-tabbar 模仿 iOS 的液態玻璃分頁列，但以下效果受限於目前瀏覽器的能力，沒有實作或只能近似：

| 原生效果 | 網頁的限制 | 這裡的做法 |
|---|---|---|
| **真正的折射**：背後內容在玻璃邊緣彎曲、放大 | CSS `backdrop-filter` 只有模糊、飽和度等固定濾鏡。能扭曲背景的 `backdrop-filter: url(#svg濾鏡)` 只有 Chromium 支援，Safari / iOS 與 Firefox 都不支援。WebGL 做法得先把整頁截成圖（例如 html2canvas），截圖是靜態的，捲動、換頁、外部圖片都對不上，在手機上也很耗效能 | 模糊＋由上往下的染色＋越靠邊越亮的邊緣光，做出類似的質感 |
| **色散**：玻璃邊緣出現彩虹色的分光 | 同上，需要逐像素處理背景，CSS 做不到 | 不做 |
| **依背景調整玻璃**：背後是亮的內容時自動變成淺色玻璃、暗的時變深色 | 網頁讀不到元素背後的像素顏色 | 提供深色、淺色（`ltb--light`）與跟隨系統（`ltb--auto`）三種外觀，由你依頁面切換 |
| **觸覺回饋**：切換分頁或拖過每一格時輕震一下 | iOS Safari 不支援 `navigator.vibrate()`，網頁沒有可用的震動 API | 不做 |
| **隨手機傾斜移動的高光** | 需要陀螺儀資料，iOS 上必須由使用者點按同意權限，不適合用在分頁列 | 高光固定在上緣 |
| **120Hz 動畫**：ProMotion 螢幕上的更新率 | iOS Safari 預設把 `requestAnimationFrame` 限制在 60fps | 膠囊物理依實際經過的時間計算，掉幀時直接補到正確位置，不會變慢；但最高就是 60fps |
| **與系統手勢整合**：例如捲動時分頁列自動縮小、跟系統的返回滑動連動 | 網頁拿不到系統手勢的狀態 | 不內建；需要的話可以在自己的頁面監聽捲動，再改 `--ltb-*` 變數 |

另外，瀏覽器的長按選單（拷貝、預覽圖片）只在分頁列本身關掉（`-webkit-touch-callout: none`），頁面其他地方由你的專案決定。

## 版本紀錄

- **v1.0.1**：分頁列建立時還看不到（例如被隱藏、CSS 晚載入）時，顯示後膠囊會停在錯的位置；現在尺寸一改變就自動重算。
- **v1.0.0**：第一版。

## 授權

MIT
