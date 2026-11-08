# liquid-tabbar

**English** | [繁體中文](README.zh-TW.md)

A liquid-glass bottom tab bar in plain JavaScript and CSS. No dependencies, no build step.

- **Tap to switch**: the pill lifts into clear glass and slides over. Its leading edge eases to a stop, then the trailing edge catches up, squashes into it and springs back once.
- **Press and drag**: the pill follows your finger and recolors the icons it covers. The tab switches when you let go.
- **Waits for the pill**: you are told to change pages only after the pill arrives, so rebuilding the page doesn't stutter the animation.
- **Configurable**: tab count, icons, labels, colors, sizes and spring feel.

**[Live demo](https://mailoswang.github.io/liquid-tabbar/)**

## Install

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.css">
<script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.js"></script>
```

The URL pins a version (`@v1.0.1`), so later releases won't change your project unexpectedly. You can also copy `liquid-tabbar.css` and `liquid-tabbar.js` into your project.

## Quick start

Save this as an `.html` file and open it:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.css">
  <script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.js"></script>
  <style>
    body { margin: 0; background: #111; color: #fff; font-family: system-ui, sans-serif }
    main { padding: 24px 16px calc(110px + env(safe-area-inset-bottom)) }  /* leave room for the tab bar */
  </style>
</head>
<body>
  <main id="page"></main>
  <nav id="tabs" aria-label="Main"></nav>

  <script>
    const ICONS = {
      home: '<path d="M10.7 3.4a2 2 0 0 1 2.6 0l7.1 6.1c.4.4.6.9.6 1.4V19a2 2 0 0 1-2 2h-3.6a.9.9 0 0 1-.9-.9v-4.4a1.6 1.6 0 0 0-1.6-1.6h-1.8a1.6 1.6 0 0 0-1.6 1.6v4.4a.9.9 0 0 1-.9.9H5a2 2 0 0 1-2-2v-8.1c0-.5.2-1 .6-1.4z"/>',
      search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m15 15 5.5 5.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
      user: '<circle cx="12" cy="8" r="4.2"/><path d="M3.8 20.2c.8-4 4.2-6.4 8.2-6.4s7.4 2.4 8.2 6.4a.9.9 0 0 1-.9 1H4.7a.9.9 0 0 1-.9-1z"/>'
    };

    const show = id => { document.getElementById("page").textContent = "Current page: " + id; };

    const tabs = new LiquidTabbar("#tabs", {
      items: [
        { id: "home",   label: "Home",   icon: ICONS.home },
        { id: "search", label: "Search", icon: ICONS.search },
        { id: "me",     label: "Me",     icon: ICONS.user }
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

`icon` is either path markup for a 24×24 viewBox (wrapped in an `<svg>` with `fill="currentColor"`) or a complete `<svg>` element.

## Page setup

- **Leave room at the bottom.** The bar is fixed to the bottom of the screen by default and covers whatever is underneath. Give your content bottom padding, e.g. `padding-bottom: calc(110px + env(safe-area-inset-bottom))`.
- **Safe area on iPhone.** Add `viewport-fit=cover` to `<meta name="viewport">` so the bar clears the home indicator. Without it the bar still works but sits a fixed 8px from the bottom.
- **Accessible name.** Give the `<nav>` an `aria-label` such as "Main". Each button gets its own `aria-label`, and the selected one gets `aria-current="page"`.
- **The element's contents are replaced.** Pass an empty `<nav>`.

## Routing

When the user taps or drags on the bar, the pill moves to the new tab by itself. In `onSelect` you only change the page; you don't need to call `setActive`.

When the page changes some other way (the browser's back button, an in-page link), call `setActive` to keep the bar in sync:

```js
addEventListener("hashchange", () => {
  const id = location.hash.slice(2) || "home";
  tabs.setActive(id);          // no animation if it's already selected
});
```

For pages that don't belong to any tab, `tabs.setActive(null)` hides the pill.

## ES modules and frameworks

You can load it with `import`. It then registers `window.LiquidTabbar`:

```js
import "https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v1.0.1/liquid-tabbar.min.js";
const tabs = new window.LiquidTabbar("#tabs", { /* … */ });
```

In React, Vue and similar frameworks, the library manages the bar's contents. Give it an empty element that the framework won't re-render children into, create the bar on mount and call `destroy()` on unmount. React example:

```jsx
function Tabs({ items, active, onSelect }) {
  const ref = useRef(null), bar = useRef(null);
  useEffect(() => {
    bar.current = new window.LiquidTabbar(ref.current, { items, active, onSelect });
    return () => bar.current.destroy();
  }, []);
  useEffect(() => { bar.current.set({ items, active }); }, [items, active]);
  return <nav ref={ref} aria-label="Main" />;
}
```

`onSelect` is captured when the bar is created. If it depends on state that changes, read the latest value through a ref.

## Options

| Option | Default | Description |
|---|---|---|
| `items` | `[]` | `[{ id, label, icon }]`. The array length is the number of tabs |
| `active` | `0` | Selected `id` or index. `null` / `-1` selects nothing and hides the pill |
| `onSelect(item, index, info)` | — | A different tab was chosen. For gestures it fires after the pill arrives; for keyboard it fires immediately. `info.source` is `"gesture"` or `"click"` |
| `onReselect(item, index, info)` | — | The already-selected tab was tapped (often used to scroll to top) |
| `physics` | see below | Spring feel; pass only the fields you want to change |
| `arriveDistance` | `6` | How close (px) the pill must be to count as arrived |
| `arriveTimeout` | `320` | Longest wait (ms) for the pill before `onSelect` fires anyway |
| `liftHold` | `120` | Delay (ms) after arrival before the lifted glass settles back |
| `liftMin` / `liftMax` | `60` / `180` | Shortest / longest (ms) the lifted state is kept when no tab changes |
| `dragThreshold` | `6` | How far (px) the finger must move to count as a drag |
| `clickGuard` | `800` | How long (ms) to swallow late clicks after a gesture (iOS sends clicks late) |

You can also listen for events: `tabs.el.addEventListener("ltb:select", e => e.detail.item)` and `"ltb:reselect"`.

## Methods

```js
tabs.set({ items, active })          // update items and selection together
tabs.setItems(items)                 // replace items; with the same count only changed tabs update, so the pill keeps sliding
tabs.setActive("search")             // or an index; { instant: true } skips the animation
tabs.setActive(null)                 // hide the pill
tabs.layout()                        // recompute sizes by hand (rarely needed; size changes are handled automatically)
tabs.destroy()                       // remove listeners and contents
tabs.el                              // the bar element
tabs.index                           // selected index
tabs.items                           // current items
```

## CSS variables

Override the variables on `.ltb` in your CSS (or set them in the element's `style`). The default look is dark. Add the `ltb--light` class for light, or `ltb--auto` to follow the system setting.

```css
.ltb {
  --ltb-accent: #0a84ff;        /* color of icons under the pill */
  --ltb-ink: #fff;              /* regular icons and labels */
  --ltb-bottom: 24px;           /* distance from the bottom of the screen */
}
```

| Variable | Description |
|---|---|
| `--ltb-ink` / `--ltb-accent` / `--ltb-focus` | Icon and label color / selected color / keyboard focus ring |
| `--ltb-ind` | Pill color at rest |
| `--ltb-lift-bg` / `--ltb-lift-ring` / `--ltb-lift-edge` / `--ltb-lift-shadow` | The lifted glass pill while pressed |
| `--ltb-bg` / `--ltb-blur` / `--ltb-rim` / `--ltb-shadow` / `--ltb-ring` | Glass bar: fill, blur, edge glow, drop shadow, outer highlight ring |
| `--ltb-width` / `--ltb-height` / `--ltb-pad-x` / `--ltb-pad-y` | Size |
| `--ltb-bottom` / `--ltb-z` | Position (defaults to where the native iOS tab bar sits) and stacking order |
| `--ltb-icon` / `--ltb-gap` / `--ltb-font-size` / `--ltb-font-weight` | Icons and labels |
| `--ltb-pill-pad` | How much wider the pill is than one tab |
| `--ltb-lift-w` / `--ltb-lift-h` / `--ltb-lift-scale` | How much the pill widens and grows taller, and how much the whole bar scales, while pressed |
| `--ltb-ease` / `--ltb-press` / `--ltb-release` | Easing and duration for lifting and settling |

To place the bar inside the page instead of fixing it to the bottom, override `position`, `left`, `translate` and `bottom`, e.g. `.ltb { position: relative; left: auto; translate: none; bottom: auto }`.

## Physics

```js
new LiquidTabbar("#tabs", {
  physics: {
    tap:  { C: 40 },   // tap: stronger squash
    drag: { S: 30 }    // drag: stronger stretch
  }
});
```

| Field | Tap `tap` | Drag `drag` | Description |
|---|---|---|---|
| `k` / `c` | 420 / 41 | 1400 / 70 | Leading-edge spring stiffness / damping. `c = 2√k` is critical damping: no overshoot, it stops exactly on target |
| `kt` / `ct` | 200 / 12 | 220 / 13 | Spring pulling the trailing edge after the leading edge. Less damping means more stretch on take-off and a harder squash on stop |
| `S` | 16 | 24 | Maximum stretch (px) |
| `C` | 32 | 24 | Maximum squash (px) |
| `bulge` | .0013 | .002 | Vertical bulge per 1px of squash |

If you only want the pill physics and draw everything yourself, use `LiquidTabbar.Pill`:

```js
const pill = LiquidTabbar.Pill((x, cmp, sy) => {
  // x: position, cmp: width reduction (negative = stretched), sy: vertical scale
}, LiquidTabbar.physics);
pill.to(200);                    // slide to 200px
pill.to(120, { drag: true });    // drag mode (follows the finger)
pill.arrive(() => {}, 6, 320);   // call back on arrival (or after the timeout)
```

## Browser support

Safari / iOS 16.4+, Chrome 120+ and Firefox 128+ (uses `@property`, `mask-composite` and `clamp()`). With "Reduce Motion" on, the pill jumps into place without animating. With "Reduce Transparency" on, the background blur is turned off.

## What browsers can't do

liquid-tabbar imitates the iOS liquid-glass tab bar. Some of its effects are beyond what browsers currently allow, so they are left out or approximated:

| Native effect | Browser limitation | What liquid-tabbar does |
|---|---|---|
| **True refraction**: content behind the glass bends and magnifies at the edges | CSS `backdrop-filter` only offers fixed filters such as blur and saturation. `backdrop-filter: url(#svg-filter)`, which can distort the backdrop, works only in Chromium, not in Safari / iOS or Firefox. WebGL approaches need a screenshot of the whole page first (e.g. html2canvas). That screenshot is static, so it falls out of sync on scroll, page changes and cross-origin images, and it is expensive on phones | Blur, a top-to-bottom tint and an edge glow that brightens toward the rim give a similar feel |
| **Chromatic aberration**: rainbow fringes at the glass edge | Same as above: it needs per-pixel processing of the backdrop, which CSS can't do | Not done |
| **Adapting to the background**: the glass turns light over bright content and dark over dark content | Web pages can't read the pixel colors behind an element | Dark, light (`ltb--light`) and system (`ltb--auto`) looks; switch them per page yourself |
| **Haptics**: a light tap when switching tabs or dragging across them | iOS Safari doesn't support `navigator.vibrate()`, and there is no other vibration API for web pages | Not done |
| **Highlights that move as the phone tilts** | Needs gyroscope data, which iOS only provides after the user taps to grant permission, which doesn't suit a tab bar | The highlight stays on the top edge |
| **120Hz animation** on ProMotion screens | iOS Safari caps `requestAnimationFrame` at 60fps by default | The pill physics run on real elapsed time and catch up after dropped frames, so they never slow down, but the frame rate tops out at 60fps |
| **System gesture integration**, e.g. shrinking the bar on scroll or following the system back swipe | Web pages can't see the state of system gestures | Not built in. If you need it, listen for scroll in your page and change the `--ltb-*` variables |

The browser's long-press menu (copy, image preview) is disabled only on the bar itself (`-webkit-touch-callout: none`). The rest of the page is up to your project.

## Changelog

- **v1.0.1**: If the bar was created while it couldn't be seen yet (e.g. hidden, or before the CSS loaded), the pill sat in the wrong place once shown. Size changes are now picked up automatically.
- **v1.0.0**: First release.

## License

MIT
