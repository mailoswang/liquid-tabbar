# liquid-tabbar · 網頁上的原生液態玻璃

[English](README.md) | **繁體中文**

**在網頁上模擬 iOS 原生液態玻璃（Liquid Glass）分頁列。** liquid-tabbar 把系統分頁列的質感與手感帶到一般網頁：霧面玻璃、會拉長擠壓的果凍膠囊、按住拖動切換。用原生 JS + CSS 寫成，沒有相依套件、不需要建置。

適合在瀏覽器或加入 iPhone 主畫面的網頁 App，讓它看起來、用起來都跟原生 App 一致。目前瀏覽器還做不到的效果，請見[網頁做不到的效果](#網頁做不到的效果)。

動畫依 iOS 原生分頁列的螢幕錄影（60fps 逐格）分析調校：

- **按下**：深色膠囊淡出、浮起成透明玻璃，放大約 1.3 倍、上下超出底板；整條分頁列放大約 3–5%
- **滑行**：彈簧帶著膠囊滑向目標，速度越快拉得越長、高度略壓扁
- **透鏡**：整條底板微微放大時，玻璃裡的底板維持放大前的原本大小，看起來小了一點，細細的空隙透出背後的頁面；靠近玻璃兩端時邊緣以平滑的 S 形接回外面放大後的底板，在底板本身的盡頭（最左／最右格）則是原本大小的圓弧；玻璃本身是透明的，只有外框與亮邊；玻璃下的變色圖示與文字不縮小，跟著整條底板一起放大
- **落定**：到位後縮回深色膠囊，尺寸略過衝再回彈一次
- **按住拖動**：膠囊跟著手指，蓋到的圖示即時變色，鬆手才切換
- **立即換頁**：放開的瞬間就呼叫 `onSelect`，跟 iOS 一樣，頁面切換時動畫繼續播完；頁面很重時也可以改成等膠囊到位（`waitForPill`）
- 格數、圖示、文字、顏色、尺寸、動畫都可以調整

**[線上示範](https://mailoswang.github.io/liquid-tabbar/?lang=zh)**（建議用手機開，按住分頁列左右拖動試試）

**目錄**：[安裝](#安裝) · [快速開始](#快速開始) · [依專案客製](#依專案客製) · [放進頁面時要注意](#放進頁面時要注意) · [配合路由](#配合路由) · [左邊的圓形按鈕](#左邊的圓形按鈕) · [框架](#es-module-與框架) · [選項](#選項) · [方法](#方法) · [外觀變數](#外觀變數) · [樣式掛鉤](#樣式掛鉤) · [動畫參數](#動畫參數physics) · [效能](#效能) · [相容性](#相容性) · [限制](#網頁做不到的效果) · [版本紀錄](#版本紀錄)

## 安裝

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.7.3/liquid-tabbar.min.css">
<script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.7.3/liquid-tabbar.min.js"></script>
```

網址裡固定完整版本號（`@v2.7.3`），之後函式庫更新也不會突然改變你的專案。其他選擇：

- `@2`：自動跟到 2.x 的最新版，修正會自動套用；新版發布後 CDN 可能要一段時間才會更新。
- 直接把 `liquid-tabbar.css`、`liquid-tabbar.js` 複製進專案。

主版本號改變（2 → 3）時選項可能會變，升級前請先看[版本紀錄](#版本紀錄)。

## 快速開始

複製下面整段存成 `.html` 就能打開來試：

```html
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.7.3/liquid-tabbar.min.css">
  <script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.7.3/liquid-tabbar.min.js"></script>
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

## 依專案客製

各專案通常不同的部分（格數、圖示、文字、顏色、深淺色、動畫）都在同一處設定，互動邏輯與動畫則共用。例如五格只有圖示、淺色外觀、藍色強調色、動畫比較收斂：

```html
<nav id="tabs" class="ltb--light" aria-label="主要導覽"></nav>

<style>
  #tabs { --ltb-accent: #0a84ff; --ltb-icon: 26px }
</style>

<script>
  const tabs = new LiquidTabbar("#tabs", {
    items: [                                   // 五個項目＝五格
      { id: "home",   icon: ICONS.home },      // 不給 label 就只顯示圖示
      { id: "search", icon: ICONS.search },
      { id: "likes",  icon: ICONS.heart },
      { id: "inbox",  icon: ICONS.bell },
      { id: "me",     icon: ICONS.user }
    ],
    physics: { growW: 1.2, barY: .03, settle: { k: 260, zeta: .7 } }
  });
</script>
```

只有圖示的按鈕會用 `id` 當無障礙名稱，`id` 請取看得懂的名字（或保留 `label`）。

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

`onSelect` 在手指放開的瞬間就呼叫，這時膠囊還在動畫中。如果你的頁面渲染很重、讓動畫卡頓，請見[效能](#效能)。

## 左邊的圓形按鈕

分頁列左邊可以多一顆單獨的圓形按鈕，例如進入內頁時的「返回」，或是搜尋、編輯。整組的總寬度不變（`--ltb-width`）：圓鈕直徑等於分頁列高度，分頁列縮短讓出位置。圓鈕和底板是同一組玻璃，按住分頁列時不會跟著放大。

```js
const BACK = '<path d="M15.5 4.5 8 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';

addEventListener("hashchange", () => {
  const detail = location.hash.startsWith("#/book/");
  tabs.set({
    side: detail ? { id: "back", label: "回上頁", icon: BACK } : null,   // null 收起
    items: detail ? ITEMS.filter(a => a.id !== "add") : ITEMS,          // 例如 4 格變 3 格
    active: "home"
  });
});

const tabs = new LiquidTabbar("#tabs", { items: ITEMS, onSide: side => history.back() });
```

圓鈕出現或收起時，分頁列的寬度會有過渡動畫，圓鈕會彈出或淡出。

## ES module 與框架

用 `import` 載入也可以，載入後從 `window.LiquidTabbar` 取用：

```js
import "https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.7.3/liquid-tabbar.min.js";
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
| `onSelect(item, index, info)` | — | 選了另一格。手指放開的瞬間呼叫（鍵盤則立即呼叫）。`info.source` 是 `"gesture"` 或 `"click"` |
| `onReselect(item, index, info)` | — | 點了已選中的那格（常用來回到頂端） |
| `physics` | 見下方 | 動畫參數，只需要傳想改的欄位 |
| `dragThreshold` | `8` | 手指移動幾 px 才算拖動 |
| `clickGuard` | `800` | 手勢後擋掉晚到的 click 多久（ms），iOS 會晚送 click |
| `waitForPill` | `false` | 手勢換頁時，等膠囊滑到位才呼叫 `onSelect`。換頁很吃效能、讓動畫起步卡住時打開 |
| `arriveDistance` / `arriveTimeout` | `6` / `320` | 搭配 `waitForPill`：膠囊離目標幾 px 內算到位 / 最多等多久（ms） |
| `side` | `null` | 左邊的圓形按鈕：`{ id, label, icon }`（`label` 是給輔助技術讀的名稱）。`null` 不顯示。見[左邊的圓形按鈕](#左邊的圓形按鈕) |
| `onSide(side)` | — | 點了圓形按鈕 |
| `minimizeOnScroll` | `false` | 頁面往下捲動時整組縮小（含左邊圓鈕）；往上捲、回到頂端，或一點到分頁列就恢復 |
| `scrollTarget` | 視窗 | 監聽哪個捲動區域：元素或選擇器（頁面捲動的是容器而不是視窗時） |
| `minimizeDistance` | `24` | 往同一方向捲動多少 px 才縮小或恢復 |

也可以監聽事件：`tabs.el.addEventListener("ltb:select", e => e.detail.item)`、`"ltb:reselect"`，圓形按鈕的 `"ltb:side"`（`e.detail.side`），以及縮小狀態的 `"ltb:minimize"`（`e.detail.minimized`）。

## 方法

```js
tabs.set({ side, items, active })    // 一次更新圓形按鈕、項目與選中格
tabs.setSide({ id, label, icon })    // 顯示左邊的圓形按鈕；setSide(null) 收起
tabs.setItems(items)                 // 換項目；數量相同時只重建變動的格子
tabs.setActive("search")             // 或索引；{ instant: true } 不播動畫
tabs.setActive(null)                 // 隱藏膠囊
tabs.layout()                        // 手動重算尺寸（通常不需要，尺寸改變會自動處理）
tabs.destroy()                       // 移除事件與內容
tabs.el                              // 分頁列元素
tabs.index                           // 目前選中的索引
tabs.items                           // 目前的項目
tabs.side                            // 目前的圓形按鈕，沒有時為 null
tabs.setMinimized(true)              // 手動縮小／恢復
tabs.setMinimizeOnScroll(true, el)   // 開關捲動縮小；el 是捲動容器（預設視窗）
tabs.minimized                       // 目前是否縮小
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
| `--ltb-lift-ring` / `--ltb-lift-edge` / `--ltb-lift-shadow` | 按住時浮起的玻璃膠囊：亮邊、外框、陰影 |
| `--ltb-bg` / `--ltb-blur` / `--ltb-rim` / `--ltb-shadow` / `--ltb-ring` | 玻璃底板：底色、模糊、邊緣光、投影、外圈亮邊 |
| `--ltb-width` / `--ltb-height` / `--ltb-pad-x` / `--ltb-pad-y` | 尺寸 |
| `--ltb-bottom` / `--ltb-z` | 位置（預設貼齊 iOS 原生分頁列）、層級 |
| `--ltb-icon` / `--ltb-gap` / `--ltb-font-size` / `--ltb-font-weight` | 圖示與文字 |
| `--ltb-pill-pad` | 平常的膠囊比一格寬多少 |
| `--ltb-side-gap` | 左邊圓形按鈕與分頁列的間距 |
| `--ltb-min-scale` | 捲動縮小時整組的大小（預設 `.84`） |

動畫本身的大小與節奏用 `physics` 調整（見下方）。

想把分頁列放在頁面裡而不是固定在底部，覆寫 `position`、`left`、`translate`、`bottom` 即可，例如 `.ltb { position: relative; left: auto; translate: none; bottom: auto }`。

## 樣式掛鉤

| 選擇器 | 對應 |
|---|---|
| `.ltb` | 分頁列（你傳進去的元素） |
| `.ltb-item[data-id="inbox"]` | 某一格的按鈕，依項目的 `id` |
| `.ltb-item[aria-current="page"]` | 選中那格的按鈕 |
| `.ltb.ltb-noind` | 都沒有選中時的分頁列 |
| `.ltb-side` / `.ltb-side-in` | 左邊的圓形按鈕 / 它的玻璃圓 |
| `.ltb.ltb-has-side` | 顯示圓形按鈕時的分頁列 |
| `.ltb.ltb-min` | 捲動縮小時的分頁列 |

例如在某一格加上提示紅點：

```css
.ltb-item[data-id="inbox"]::after {
  content: ""; position: absolute; top: 8px; right: calc(50% - 18px);
  width: 7px; height: 7px; border-radius: 50%; background: #ff3b30;
}
```

加在按鈕上的東西，在膠囊蓋到那一格時會被遮住，因為膠囊裡的變色複本只有圖示和文字。

## 動畫參數（physics）

```js
new LiquidTabbar("#tabs", {
  physics: {
    growW: 1.2,                     // 按住時玻璃小一點
    settle: { k: 260, zeta: .7 }    // 落定時比較穩、回彈少一點
  }
});
```

彈簧參數是剛度 `k` 與阻尼比 `zeta`（1 ＝ 不過衝，越小越會回彈）。

| 欄位 | 預設 | 說明 |
|---|---|---|
| `move` | `{ k: 420, zeta: .82 }` | 膠囊移動的彈簧（些微過衝） |
| `lift` | `{ k: 900, zeta: .90 }` | 按下時浮起成玻璃：快速、幾乎不過衝 |
| `settle` | `{ k: 260, zeta: .46 }` | 到位後縮回：較慢、明顯回彈一次 |
| `brake` / `release` | `{ k: 520, zeta: .6 }` / `{ k: 60, zeta: .85 }` | 煞車擠壓的彈簧：擠進去（快）／恢復（慢、柔和、幾乎不彈） |
| `growW` / `growH` | `1.3` / `1.33` | 按住時玻璃變寬 / 變高的倍率 |
| `mag` | `1` | 玻璃下圖示的縮放倍率（1：跟著底板一起放大；>1 再放大、<1 縮小） |
| `stretch` / `stretchMax` | `.065` / `1.4` | 每 1 px/s 速度多拉長幾 px / 拉長上限（以一格寬為單位） |
| `squash` / `squashMax` | `9000` / `.14` | 速度讓膠囊壓扁的程度（越小越扁）/ 壓扁上限 |
| `barX` / `barY` | `.035` / `.05` | 按住時整條分頁列水平 / 垂直放大多少 |
| `hold` | `120` | 放開後玻璃至少再維持多久（ms） |
| `overdrag` | `.12` | 拖動時可以拉出最左／最右格多少（以一格寬為單位） |
| `edge` | `9` | 浮起時玻璃最多可以超出分頁列左右兩端幾 px。平常膠囊不會超出；在最左／最右格放大時往內側長 |
| `brakeRef` | `8000` | 減速度多大（px/s²）算完整煞車；更急的煞車會封頂 |
| `brakeW` / `brakeH` | `.25` / `.15` | 拖動時的煞車擠壓：玻璃縮短 / 撐高多少。前進方向那端不動，後端擠過去 |
| `brakeTapW` / `brakeTapH` | `.07` / `.015` | 點擊後膠囊自己滑過去時的煞車擠壓：主要只往內擠 |

預設值在 `LiquidTabbar.physics`。

## 效能

動畫本身很輕，但有兩件事可能讓手機上的動畫卡頓：

- **膠囊移動時重畫很重的頁面**：`onSelect` 在放開的瞬間就呼叫，你的頁面會在膠囊還在滑的時候重建。設定 `waitForPill: true`，就會等膠囊滑到位（約 0.1–0.3 秒）才呼叫 `onSelect`。
- **縮放帶模糊的分頁列**：按住時整條分頁列會微微放大，而帶 `backdrop-filter` 的元素每一格換尺寸重畫可能很吃效能。設定 `physics: { barX: 0, barY: 0 }` 讓分頁列不縮放，或用 `--ltb-blur: none` 拿掉模糊。

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

- **v2.7.3**：左邊圓鈕的出現／收起改由函式庫的彈簧驅動（`physics.side`），不再用 CSS 過渡：分頁列的寬度與位移每一幀從同一個值算出來，任何版本的 Safari 都不會不同步，整組維持在中間。
- **v2.7.2**：修正 iOS Safari：分頁列寬度改用函式庫依 `--ltb-width` 換算好的像素值做動畫。部分 Safari 版本不會對含 `min()` 的寬度做過渡動畫，寬度直接跳到終點、位置卻還在動，圓形按鈕出現或收起時整組就會偏到一邊。執行中改了 `--ltb-width` 的話請呼叫 `tabs.layout()`（視窗大小改變會自動處理）。
- **v2.7.1**：圓形按鈕出現或收起時，整組不再先偏到一邊再跳回中間：圓鈕在最終位置原地彈出／淡出，分頁列同時從左邊縮短或長回，整組的左右邊界不動。
- **v2.7.0**：捲動縮小：開啟 `minimizeOnScroll` 後，頁面往下捲動時整組（含左邊圓鈕）縮小到 `--ltb-min-scale`，底部與中央不動；往上捲、回到頂端，或一點到分頁列（含圓鈕）就恢復。新增 `scrollTarget`、`minimizeDistance`、`setMinimized()`、`setMinimizeOnScroll()`、`minimized`、事件 `ltb:minimize`、class `.ltb-min`。
- **v2.6.2**：左邊的圓形按鈕按下時（輕按或長按）和膠囊一樣浮起：放大到約 1.22 倍、加上浮起玻璃的外框與陰影，至少維持 `hold` 毫秒，放開後帶回彈縮回；鍵盤操作也會播一次。不再是按下縮小。
- **v2.6.1**：拖動時的煞車擠壓加大（`brakeW` .25、`brakeH` .15），前進方向那端不動、只有後端被擠過去；恢復改用自己的彈簧（`release`），更慢、更柔和。
- **v2.6.0**：煞車擠壓：玻璃減速時被擠壓（左右變短、上下撐大），彈一下再恢復。拖動時明顯，點擊後膠囊自己滑過去時主要只是微微往內擠。新增動畫參數 `brake`、`brakeRef`、`brakeW` / `brakeH`、`brakeTapW` / `brakeTapH`。
- **v2.5.1**：分頁的鍵盤焦點外框恢復可見（分頁的遮罩也把它自己的外框遮掉了）。分頁列寬度與圓形按鈕的過渡動畫，只在使用者沒有要求減少動態時才加上。
- **v2.5.0**：新增左邊的圓形按鈕：分頁列左邊單獨一顆玻璃圓鈕（`side`、`onSide`、`setSide`、`ltb:side`、`--ltb-side-gap`）。整組總寬度不變，圓鈕出現或收起時分頁列寬度有過渡動畫。
- **v2.4.0**：整條底板放大（`barX` / `barY`）時，玻璃裡的底板維持放大前的原本大小，不再縮到 0.86 倍；移除 `shrink` 選項。按住時玻璃裡的底板恢復模糊（`--ltb-blur`，和外面的底板一樣）；它周圍的空隙仍直接透出清楚的頁面。
- **v2.3.3**：修正膠囊停在底板兩端（最左／最右格）時的玻璃：玻璃裡不再漏出底板圓角的細弧線、縮小圓弧的尖端不再多一條橫線連到玻璃邊緣、尖端是圓的不會被削平，從兩端拖出來時也不會多出細條。底板玻璃那層改用 `clip-path` 裁圓角，不再用 `border-radius`。
- **v2.3.2**：玻璃裡的底板改成每幀算出輪廓再畫（底色用 `clip-path`、亮邊用 SVG）：中段平直，靠近玻璃兩端以平滑的 S 形接回外面的底板；在底板本身的盡頭則維持縮小的圓弧。玻璃裡的亮邊用固定的白色漸層，不會跟著自訂的 `--ltb-ring`。底板預設不再有投影（`--ltb-shadow: none`），要的話自己設 `--ltb-shadow`。
- **v2.3.1**：玻璃裡改成整條底板等比例縮小（兩端圓弧也一起縮），不再是上下兩塊月牙；玻璃改成透明，沒有白色霧面與亮面漸層，因此不再使用 `--ltb-lift-bg`。
- **v2.3.0**：按住時的透鏡效果：玻璃範圍內的底板背景看起來縮小，上下緣正中間各有一塊月牙透出背後的頁面（新選項 `shrink`，.86）；玻璃下的圖示與文字不再放大（`mag` 改為 1），拖動時會對齊原本的格子。底板的底色、模糊與亮邊改放在內層的 `.ltb-bg`，不再直接在 `.ltb` 上。
- **v2.1.0**：新增 `waitForPill` 選項（搭配 `arriveDistance` / `arriveTimeout`），可以等膠囊到位才呼叫 `onSelect`；樣式只在數值改變時才寫入，減少手機上每一格的樣式計算。
- **v2.0.0**：依 iOS 原生分頁列的錄影重新做動畫：按住時玻璃超出底板、底下圖示放大、整條分頁列微微放大，落定時回彈一次。`onSelect` 改成放開瞬間呼叫，不再等膠囊到位。不相容的變更：
  - `physics` 換成新欄位（見[動畫參數](#動畫參數physics)），原本的 `tap` / `drag` 兩組已移除
  - 移除選項：`liftHold`、`liftMin`、`liftMax`，以及 `arriveDistance`、`arriveTimeout`（v2.1.0 隨 `waitForPill` 加回）
  - 移除 CSS 變數：`--ltb-lift-w`、`--ltb-lift-h`、`--ltb-lift-scale`、`--ltb-ease`、`--ltb-press`、`--ltb-release`
  - 移除 `LiquidTabbar.Pill`，以及選中按鈕上的 `on` class（請改用 `[aria-current="page"]`）
- **v1.0.1**：分頁列建立時還看不到（例如被隱藏、CSS 晚載入）時，顯示後膠囊會停在錯的位置；現在尺寸一改變就自動重算。
- **v1.0.0**：第一版。

## 授權

MIT
