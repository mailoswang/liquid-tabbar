# liquid-tabbar

液態玻璃風格的底部分頁列，原生 JS + CSS，沒有相依套件、不需要建置。

- 按一下切換：膠囊浮起成透明玻璃、滑過去，前緣柔和停下、後緣撞上來擠壓再回彈一次
- 按住左右拖動：膠囊跟著手指，蓋到的圖示即時變色，鬆手才切換
- 膠囊到位後才通知你換頁，重建頁面不會卡住動畫
- 格數、圖示、文字、顏色、尺寸、彈簧手感都可以調整

**[線上示範](https://mailoswang.github.io/liquid-tabbar/)**

## 安裝

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.0/liquid-tabbar.min.css">
<script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.0/liquid-tabbar.min.js"></script>
```

網址裡固定版本號（`@v1.0.0`），之後函式庫更新也不會突然改變你的專案。也可以直接把 `liquid-tabbar.css`、`liquid-tabbar.js` 複製進專案。

## 快速開始

```html
<nav id="tabs"></nav>

<script>
  const tabs = new LiquidTabbar("#tabs", {
    items: [
      { id: "home",   label: "首頁", icon: '<path d="…"/>' },
      { id: "search", label: "搜尋", icon: '<path d="…"/>' },
      { id: "me",     label: "我的", icon: '<svg viewBox="0 0 24 24">…</svg>' }
    ],
    active: "home",
    onSelect(item) { location.hash = "#/" + item.id },
    onReselect(item) { window.scrollTo({ top: 0, behavior: "smooth" }) }
  });
</script>
```

`icon` 可以給 24×24 viewBox 內的路徑（會用 `fill="currentColor"` 包成 `<svg>`），也可以直接給完整的 `<svg>`。

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
tabs.layout()                        // 容器尺寸改變時重算（視窗縮放已自動處理）
tabs.destroy()
tabs.el                              // 分頁列元素
tabs.index                           // 目前選中的索引
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

想把分頁列放在頁面裡而不是固定在底部，覆寫 `position`、`left`、`translate`、`bottom` 即可。

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

## 授權

MIT
