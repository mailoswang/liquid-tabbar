# liquid-tabbar · Native Liquid Glass, on the web

**English** | [繁體中文](README.zh-TW.md)

**A web recreation of the native iOS Liquid Glass tab bar.** liquid-tabbar brings the look and feel of the system tab bar to any web page: frosted glass, a jelly pill that stretches and squashes, and press-and-drag to switch tabs. It's plain JavaScript and CSS with no dependencies and no build step.

Built for web apps that run in the browser or are added to the iPhone home screen, so they can match native apps. For effects that browsers can't reproduce yet, see [What browsers can't do](#what-browsers-cant-do).

The motion is tuned from frame-by-frame (60fps) analysis of screen recordings of the native iOS tab bar:

- **Press**: the dark pill fades into clear glass about 1.3× larger, rising past the top and bottom of the bar, while the whole bar grows by 3–5%.
- **Slide**: a spring carries the pill to its target. It stretches with speed and flattens slightly.
- **Lens**: while the whole bar grows slightly, the bar inside the glass keeps its original, un-grown size, so it looks a little smaller and the page shows through the thin gap. Near the ends of the glass its edge curves out in a smooth S to meet the grown bar outside; at the bar's own ends (leftmost / rightmost slot) the original rounded end shows instead. The glass itself is clear, with only its outline and rim highlights. The recolored icons and labels are not shrunk; they grow with the whole bar.
- **Settle**: once in place it shrinks back into the dark pill, overshooting its size and springing back once.
- **Press and drag**: the pill follows your finger and recolors the icons it covers. The tab switches when you let go.
- **Instant switch**: `onSelect` fires the moment you let go, just like iOS, and the animation keeps playing while your page changes. Heavy pages can wait for the pill instead (`waitForPill`).
- **Configurable**: tab count, icons, labels, colors, sizes and motion.

**[Live demo](https://mailoswang.github.io/liquid-tabbar/)** (open it on a phone and press and drag the bar)

**Contents**: [Install](#install) · [Quick start](#quick-start) · [Customizing](#customizing-for-your-project) · [Page setup](#page-setup) · [Routing](#routing) · [Side button](#side-button) · [Frameworks](#es-modules-and-frameworks) · [Options](#options) · [Methods](#methods) · [CSS variables](#css-variables) · [Styling hooks](#styling-hooks) · [Physics](#physics) · [Performance](#performance) · [Browser support](#browser-support) · [Limitations](#what-browsers-cant-do) · [Changelog](#changelog)

## Install

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.6.2/liquid-tabbar.min.css">
<script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.6.2/liquid-tabbar.min.js"></script>
```

The URL pins an exact version (`@v2.6.2`), so later releases never change your project unexpectedly. Other choices:

- `@2` follows the latest 2.x release, so you get fixes automatically. The CDN may take a while to pick up a new release.
- Copy `liquid-tabbar.css` and `liquid-tabbar.js` into your project.

Major versions (2 → 3) can change options; check the [Changelog](#changelog) before upgrading.

## Quick start

Save this as an `.html` file and open it:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.6.2/liquid-tabbar.min.css">
  <script src="https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.6.2/liquid-tabbar.min.js"></script>
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

## Customizing for your project

Everything that usually differs between projects (tab count, icons, labels, colors, theme, motion) is set in one place, while the interaction and animation stay shared. For example, five icon-only tabs on a light theme with a blue accent and a calmer animation:

```html
<nav id="tabs" class="ltb--light" aria-label="Main"></nav>

<style>
  #tabs { --ltb-accent: #0a84ff; --ltb-icon: 26px }
</style>

<script>
  const tabs = new LiquidTabbar("#tabs", {
    items: [                                   // five items = five tabs
      { id: "home",   icon: ICONS.home },      // leave out label for icon-only tabs
      { id: "search", icon: ICONS.search },
      { id: "likes",  icon: ICONS.heart },
      { id: "inbox",  icon: ICONS.bell },
      { id: "me",     icon: ICONS.user }
    ],
    physics: { growW: 1.2, barY: .03, settle: { k: 260, zeta: .7 } }
  });
</script>
```

Icon-only buttons use the `id` as their accessible name, so pick readable ids (or keep a `label`).

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

`onSelect` fires the moment the finger lifts, while the pill is still animating. If your page is expensive to render and the animation stutters, see [Performance](#performance).

## Side button

A separate round button can sit to the left of the bar, for example a back button on detail pages, or search or edit. The whole group keeps the same total width (`--ltb-width`): the button is as tall as the bar, and the bar shrinks to make room. It uses the same glass as the bar and doesn't grow when the bar is pressed.

```js
const BACK = '<path d="M15.5 4.5 8 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';

addEventListener("hashchange", () => {
  const detail = location.hash.startsWith("#/book/");
  tabs.set({
    side: detail ? { id: "back", label: "Back", icon: BACK } : null,   // null hides it
    items: detail ? ITEMS.filter(a => a.id !== "add") : ITEMS,          // e.g. 4 tabs → 3 tabs
    active: "home"
  });
});

const tabs = new LiquidTabbar("#tabs", { items: ITEMS, onSide: side => history.back() });
```

When the button appears or goes away, the bar's width animates and the button pops in or fades out.

## ES modules and frameworks

You can load it with `import`. It then registers `window.LiquidTabbar`:

```js
import "https://cdn.jsdelivr.net/gh/mailoswang/liquid-tabbar@v2.6.2/liquid-tabbar.min.js";
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
| `onSelect(item, index, info)` | — | A different tab was chosen. Fires the moment the finger lifts (or immediately for keyboard). `info.source` is `"gesture"` or `"click"` |
| `onReselect(item, index, info)` | — | The already-selected tab was tapped (often used to scroll to top) |
| `physics` | see below | Motion settings; pass only the fields you want to change |
| `dragThreshold` | `8` | How far (px) the finger must move to count as a drag |
| `clickGuard` | `800` | How long (ms) to swallow late clicks after a gesture (iOS sends clicks late) |
| `waitForPill` | `false` | For gestures, call `onSelect` only once the pill has slid into place. Turn it on if switching pages is expensive and makes the start of the animation stutter |
| `arriveDistance` / `arriveTimeout` | `6` / `320` | With `waitForPill`: how close (px) counts as arrived / longest wait (ms) |
| `side` | `null` | Round button on the left: `{ id, label, icon }` (`label` is its accessible name). `null` shows none. See [Side button](#side-button) |
| `onSide(side)` | — | The side button was tapped |

You can also listen for events: `tabs.el.addEventListener("ltb:select", e => e.detail.item)` and `"ltb:reselect"`, and `"ltb:side"` (`e.detail.side`) for the side button.

## Methods

```js
tabs.set({ side, items, active })    // update the side button, items and selection together
tabs.setSide({ id, label, icon })    // show the round button on the left; setSide(null) hides it
tabs.setItems(items)                 // replace items; with the same count only changed tabs are rebuilt
tabs.setActive("search")             // or an index; { instant: true } skips the animation
tabs.setActive(null)                 // hide the pill
tabs.layout()                        // recompute sizes by hand (rarely needed; size changes are handled automatically)
tabs.destroy()                       // remove listeners and contents
tabs.el                              // the bar element
tabs.index                           // selected index
tabs.items                           // current items
tabs.side                            // current side button, or null
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
| `--ltb-lift-ring` / `--ltb-lift-edge` / `--ltb-lift-shadow` | The lifted glass pill while pressed: rim, outline, shadow |
| `--ltb-bg` / `--ltb-blur` / `--ltb-rim` / `--ltb-shadow` / `--ltb-ring` | Glass bar: fill, blur, edge glow, drop shadow, outer highlight ring |
| `--ltb-width` / `--ltb-height` / `--ltb-pad-x` / `--ltb-pad-y` | Size |
| `--ltb-bottom` / `--ltb-z` | Position (defaults to where the native iOS tab bar sits) and stacking order |
| `--ltb-icon` / `--ltb-gap` / `--ltb-font-size` / `--ltb-font-weight` | Icons and labels |
| `--ltb-pill-pad` | How much wider the resting pill is than one tab |
| `--ltb-side-gap` | Gap between the side button and the bar |

Sizes and timing of the animation itself are set through `physics` (below).

To place the bar inside the page instead of fixing it to the bottom, override `position`, `left`, `translate` and `bottom`, e.g. `.ltb { position: relative; left: auto; translate: none; bottom: auto }`.

## Styling hooks

| Selector | Matches |
|---|---|
| `.ltb` | The bar (the element you passed in) |
| `.ltb-item[data-id="inbox"]` | One tab's button, by item `id` |
| `.ltb-item[aria-current="page"]` | The selected tab's button |
| `.ltb.ltb-noind` | The bar while nothing is selected |
| `.ltb-side` / `.ltb-side-in` | The side button / its glass circle |
| `.ltb.ltb-has-side` | The bar while the side button is shown |

For example, a badge dot on one tab:

```css
.ltb-item[data-id="inbox"]::after {
  content: ""; position: absolute; top: 8px; right: calc(50% - 18px);
  width: 7px; height: 7px; border-radius: 50%; background: #ff3b30;
}
```

Anything you add to a button is hidden while the pill covers that tab, because the colored copy under the pill only contains the icon and label.

## Physics

```js
new LiquidTabbar("#tabs", {
  physics: {
    growW: 1.2,                     // smaller glass while pressed
    settle: { k: 260, zeta: .7 }    // calmer settle, less bounce
  }
});
```

Springs take a stiffness `k` and a damping ratio `zeta` (1 = no overshoot, lower = more bounce).

| Field | Default | Description |
|---|---|---|
| `move` | `{ k: 420, zeta: .82 }` | Spring that moves the pill (slight overshoot) |
| `lift` | `{ k: 900, zeta: .90 }` | Lifting into glass on press: fast, almost no overshoot |
| `settle` | `{ k: 260, zeta: .46 }` | Shrinking back after arrival: slower, one visible bounce |
| `brake` / `release` | `{ k: 520, zeta: .6 }` / `{ k: 60, zeta: .85 }` | Brake squash springs: squeezing in (fast) / recovering (slow and soft, barely bounces) |
| `growW` / `growH` | `1.3` / `1.33` | How much wider / taller the glass gets while pressed |
| `mag` | `1` | Scale of the icons under the glass (1 = grow with the bar, >1 magnify, <1 shrink) |
| `stretch` / `stretchMax` | `.065` / `1.4` | Extra width per 1 px/s of speed / maximum stretch (in tab widths) |
| `squash` / `squashMax` | `9000` / `.14` | How much speed flattens the pill (smaller = flatter) / maximum flattening |
| `barX` / `barY` | `.035` / `.05` | How much the whole bar grows horizontally / vertically while pressed |
| `hold` | `120` | Minimum time (ms) the glass stays lifted after release |
| `overdrag` | `.12` | How far (in tab widths) the pill can be dragged past the first and last tabs |
| `edge` | `9` | How far (px) the lifted glass may extend past the left and right ends of the bar. At rest the pill never leaves the bar; at the first and last tabs it grows inward |
| `brakeRef` | `8000` | Deceleration (px/s²) that counts as a full brake; stronger braking is capped |
| `brakeW` / `brakeH` | `.25` / `.15` | Brake squash while dragging: how much the glass gets shorter / taller. The leading end stays put; the trailing end is pushed in |
| `brakeTapW` / `brakeTapH` | `.07` / `.015` | Brake squash when the pill slides by itself after a tap: mostly just squeezes inward |

`LiquidTabbar.physics` holds the defaults.

## Performance

The animation itself is light, but two things can make it stutter on phones:

- **Rendering a heavy page while the pill moves.** `onSelect` fires the moment the finger lifts, so your page rebuilds while the pill is still sliding. Set `waitForPill: true` to call `onSelect` once the pill has slid into place (taking about 0.1–0.3 s).
- **Scaling the blurred bar.** While pressed, the whole bar grows slightly, and a bar with `backdrop-filter` can be expensive to redraw at a new size every frame. Set `physics: { barX: 0, barY: 0 }` to keep the bar still, or `--ltb-blur: none` to drop the blur.

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

- **v2.6.2**: The side button lifts like the pill when pressed (tap or long press): it grows to about 1.22× with the lifted glass's outline and shadow, stays up at least `hold` ms, and springs back on release. Keyboard activation plays it too. It no longer shrinks on press.
- **v2.6.1**: Stronger brake squash while dragging (`brakeW` .25, `brakeH` .15). The leading end of the glass stays put and only the trailing end is pushed in. It recovers more slowly and softly with its own spring (`release`).
- **v2.6.0**: Brake squash: as the glass slows down it squashes (shorter, taller), bounces once and recovers. Strong while dragging, mostly a slight inward squeeze when the pill slides by itself after a tap. New physics `brake`, `brakeRef`, `brakeW` / `brakeH`, `brakeTapW` / `brakeTapH`.
- **v2.5.1**: The keyboard focus ring on a tab is visible again (the tab's mask also hid its own outline). The bar's width and side-button transitions are only added when the user hasn't asked for reduced motion.
- **v2.5.0**: New side button: a separate round glass button to the left of the bar (`side`, `onSide`, `setSide`, `ltb:side`, `--ltb-side-gap`). The group keeps its total width; the bar's width animates when the button comes and goes.
- **v2.4.0**: The bar inside the glass keeps its original size while the whole bar grows (`barX` / `barY`), instead of shrinking to 0.86×; the `shrink` option is removed. The bar inside the glass is blurred again while pressed (`--ltb-blur`, like the bar outside); the gap around it still shows the page unblurred.
- **v2.3.3**: Fixes for the glass at the bar's ends (leftmost / rightmost slot): no faint arc of the bar's rounded edge inside the glass, no horizontal line from the shrunken arc's tip to the glass edge, a round tip instead of a flattened one, and no stray sliver while dragging away from an end. The bar's own glass layer now rounds its corners with `clip-path` instead of `border-radius`.
- **v2.3.2**: The bar inside the glass is now drawn from an outline computed every frame (`clip-path` for the fill, SVG for the highlight edge): flat in the middle, curving back out in a smooth S near the ends of the glass to join the bar outside, or keeping the shrunken rounded end at the bar's own ends. The highlight edge inside the glass uses a fixed white gradient and does not follow a custom `--ltb-ring`. The bar has no drop shadow by default (`--ltb-shadow: none`); set `--ltb-shadow` to bring one back.
- **v2.3.1**: Inside the glass, the whole bar now shrinks (rounded ends included) instead of showing two crescents, and the glass is clear: no white tint or sheen, so `--ltb-lift-bg` is no longer used.
- **v2.3.0**: Lens effect while pressed: inside the glass, the bar's background looks shrunk, with two crescents at the middle of the top and bottom edges showing the page behind (new `shrink` option, .86). The icons and labels under the glass are no longer magnified (`mag` now 1), so they stay aligned with their slots while dragging. The bar's background, blur and rim now live on an inner `.ltb-bg` layer instead of `.ltb` itself.
- **v2.1.0**: New `waitForPill` option (with `arriveDistance` / `arriveTimeout`) to call `onSelect` after the pill arrives. Styles are written only when they change, which cuts per-frame style work on phones.
- **v2.0.0**: New motion based on recordings of the native iOS tab bar: the glass grows past the bar, the icons underneath are magnified, the whole bar scales while pressed, and the pill bounces once as it settles. `onSelect` now fires the moment the finger lifts instead of after the pill arrives. Breaking changes:
  - New `physics` fields (see [Physics](#physics)); the `tap` / `drag` groups are gone.
  - Removed options: `liftHold`, `liftMin`, `liftMax`, plus `arriveDistance` and `arriveTimeout` (brought back in v2.1.0 together with `waitForPill`).
  - Removed CSS variables: `--ltb-lift-w`, `--ltb-lift-h`, `--ltb-lift-scale`, `--ltb-ease`, `--ltb-press`, `--ltb-release`.
  - Removed `LiquidTabbar.Pill`, and the `on` class on the selected button (use `[aria-current="page"]`).
- **v1.0.1**: If the bar was created while it couldn't be seen yet (e.g. hidden, or before the CSS loaded), the pill sat in the wrong place once shown. Size changes are now picked up automatically.
- **v1.0.0**: First release.

## License

MIT
