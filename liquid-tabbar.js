/*! liquid-tabbar v2.7.5 | MIT | https://github.com/mailoswang/liquid-tabbar-on-web */

/* 動畫依 iOS 原生分頁列的螢幕錄影（60fps 逐格）分析：
 *   ① 按下：深色膠囊淡出、浮起成玻璃，放大約 1.3 倍、上下超出底板；整條底板放大約 3–5%
 *   ② 滑行：位置由彈簧追向目標，寬度隨速度拉長、高度略壓扁
 *   ③ 透鏡：整條底板放大時，玻璃裡的底板維持放大前的原本大小（看起來就是縮小了），空隙透出頁面；
 *      靠近玻璃兩端以 S 形接回外面放大後的底板，在底板盡頭（最左／最右格）則是原本大小的圓弧；
 *      玻璃下的變色圖示與文字不縮小，跟著整條底板一起放大
 *   ④ 落定：到位後縮回深色膠囊，尺寸略過衝再回彈
 *   煞車：玻璃減速時被擠壓（前進方向那端不動、後端擠過去，上下撐大），再慢慢恢復；拖動時明顯，點擊時主要只往內擠
 *   左右兩端：膠囊不超出底板（浮起時最多外擴 edge px），在最左／最右格放大時往內側長
 *   ⑤ 換頁：放開瞬間就通知，不等動畫（頁面渲染很重時可開 waitForPill，等膠囊到位再通知）
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LiquidTabbar = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ========================================================================
     動畫參數（錄影實測後調校）。new LiquidTabbar(el, { physics: {...} }) 可覆寫個別欄位
     ======================================================================== */
  const PHYSICS = {
    move:   { k: 420, zeta: .82 },  // 位置彈簧：剛度 / 阻尼比（<1 會些微過衝）
    lift:   { k: 900, zeta: .90 },  // 浮起：快速、幾乎不過衝（錄影 0–50 ms）
    settle: { k: 260, zeta: .46 },  // 落定：較慢、明顯回彈一次（錄影 250–500 ms）
    brake:  { k: 520, zeta: .6 },   // 煞車擠壓：擠進去的彈簧（快）
    release: { k: 60, zeta: .85 },  // 煞車擠壓：恢復的彈簧（慢、柔和、幾乎不彈）
    side:   { k: 320, zeta: .78 },  // 左邊圓鈕出現／收起（分頁列同步讓位）：略過衝，圓鈕有小小的彈跳
    growW: 1.3,      // 浮起時膠囊變寬倍率
    growH: 1.33,     // 浮起時膠囊變高倍率（超出底板上下緣）
    mag: 1,          // 玻璃下圖示縮放倍率（1：跟著底板一起放大；>1 再放大、<1 縮小）
    stretch: .065,   // 每 1 px/s 速度拉長幾 px
    stretchMax: 1.4, // 拉長上限（以一格寬為單位）
    squash: 9000,    // 速度造成高度壓扁的分母（越小越扁）
    squashMax: .14,  // 壓扁上限
    barX: .035,      // 浮起時底板水平放大
    barY: .05,       // 浮起時底板垂直放大
    hold: 120,       // 放開後玻璃至少再維持多久（ms）
    overdrag: .12,   // 拖動時可以拉出最左／最右格多少（以一格寬為單位）
    edge: 9,         // 浮起時膠囊最多可以超出底板左右兩端幾 px（平常不超出）
    brakeRef: 8000,  // 減速度多大（px/s²）算「煞車量 1」（超過就封頂）
    brakeW: .25,     // 拖動時煞車：膠囊寬度最多縮短多少（比例；前進方向那端不動，後端擠過去）
    brakeH: .15,     // 拖動時煞車：膠囊高度最多撐高多少（比例）
    brakeTapW: .07,  // 點擊後膠囊自己滑過去時的煞車：寬度縮短（較小）
    brakeTapH: .015  // 點擊時的煞車：高度幾乎不變，主要只看得出往內擠
  };

  const DEFAULTS = {
    items: [],           // [{ id, label, icon }]；icon 可為完整 <svg> 或 24×24 viewBox 內的路徑
    active: 0,           // 目前選中的 id 或索引；null / -1 代表都不選（膠囊隱藏）
    onSelect: null,      // (item, index, info) 選了另一格（放開瞬間呼叫）
    onReselect: null,    // (item, index, info) 點了已選中的那格
    side: null,          // 左邊單獨的圓形按鈕 { id, label, icon }（例如返回、搜尋）；null 不顯示
    onSide: null,        // (side) 點了圓形按鈕
    physics: PHYSICS,
    dragThreshold: 8,    // 手指移動超過幾 px 才算拖動
    clickGuard: 800,     // 手勢結束後擋掉多久內晚到的 click（iOS 會晚送）
    waitForPill: false,  // true：手勢換頁時等膠囊滑到位才呼叫 onSelect（換頁很吃效能時，動畫才不會在起步時卡住）
    arriveDistance: 6,   // waitForPill：膠囊離目標幾 px 內算到位
    arriveTimeout: 320,  // waitForPill：最多等多久（ms）
    minimizeOnScroll: false, // true：頁面往下捲動時整組縮小（--ltb-min-scale），往上捲或回到頂端時恢復
    scrollTarget: null,      // 監聽哪個捲動區域：元素或選擇器；預設是整個視窗
    minimizeDistance: 24     // 往同一方向累積捲動多少 px 才縮小／恢復（避免手指微抖來回切換）
  };

  // 函式庫寫在分頁列元素上的樣式（destroy 時只清這些，不動使用者自己設的）
  const OWN_PROPS = ["--ltb-n", "--ltb-sw", "--ltb-dw", "--ltb-pl", "--ltb-pt", "--ltb-pw", "--ltb-ph", "--ltb-g", "--ltb-cx", "--ltb-m", "--ltb-xl", "--ltb-xr", "--ltb-isx", "--ltb-isy", "--ltb-gw", "--ltb-sp", "scale"];
  let uid = 0;   // SVG 漸層 id 用，同頁多個分頁列不衝突

  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const svg = src => {
    if (!src) return "";
    src = String(src).trim();
    return src.startsWith("<svg")
      ? src.replace("<svg", '<svg class="ltb-ic" aria-hidden="true"')
      : `<svg class="ltb-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${src}</svg>`;
  };

  // 阻尼彈簧，依實際經過時間細分成 ≤2ms 的小步（掉幀時也穩定）
  function spring(x, v, target, k, zeta, dt) {
    const c = 2 * zeta * Math.sqrt(k), n = Math.max(1, Math.ceil(dt / .002)), h = dt / n;
    for (let i = 0; i < n; i++) { v += (k * (target - x) - c * v) * h; x += v * h; }
    return [x, v];
  }

  class LiquidTabbar {
    constructor(el, options = {}) {
      if (typeof el === "string") el = document.querySelector(el);
      if (!el) { el = document.createElement("nav"); document.body.appendChild(el); }
      const o = Object.assign({}, DEFAULTS, options);
      o.physics = Object.assign({}, PHYSICS, options.physics);
      const ph = options.physics || {};
      for (const k of ["move", "lift", "settle", "brake", "release", "side"]) o.physics[k] = Object.assign({}, PHYSICS[k], ph[k]);
      this.el = el;
      this.options = o;
      this.items = [];
      this.index = -1;
      this.sw = 0;
      // 動畫狀態：x 膠囊中心、v 速度、tx 目標；p 浮起程度（可過衝）、pv 其速度
      // b 煞車擠壓量（彈簧，可過衝）、bv 其速度；drag 這次移動是不是拖動造成的（拖動的擠壓較大）
      // bd 煞車時的前進方向（1 往右、-1 往左），擠壓時前進方向那端不動
      // sp 左邊圓鈕出現的程度（0–1，彈簧，可過衝）、spv 其速度
      this._s = { x: 0, v: 0, tx: 0, p: 0, pv: 0, b: 0, bv: 0, bd: 1, sp: 0, spv: 0, drag: false, down: false, hold: 0 };
      this._g = null;      // 手勢
      this._raf = 0;
      this._last = 0;
      this._skip = 0;
      this._placed = false;
      this._pend = null;   // waitForPill：等膠囊到位才送出的 onSelect
      this._css = {};      // 上一次寫入的樣式值，沒變就不重寫

      el.classList.add("ltb");
      el.innerHTML = '<span class="ltb-bg" aria-hidden="true"></span><span class="ltb-lblur" aria-hidden="true"><span class="ltb-blur"></span></span>' +
        '<span class="ltb-ind" aria-hidden="true"></span><span class="ltb-lens" aria-hidden="true"><span class="ltb-bar"></span>' +
        `<svg class="ltb-edge"><defs><linearGradient id="ltb-ring-${++uid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">` +
        '<stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".35" stop-color="#fff" stop-opacity=".16"/>' +
        '<stop offset=".65" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".26"/></linearGradient></defs>' +
        `<path stroke="url(#ltb-ring-${uid})"/></svg></span>` +
        '<span class="ltb-clip" aria-hidden="true"><span class="ltb-copy"></span></span>' +
        '<button type="button" class="ltb-side" tabindex="-1" aria-hidden="true"><span class="ltb-side-in"></span></button>';
      this._copy = el.querySelector(".ltb-copy");
      this._bar = el.querySelector(".ltb-bar");
      this._blur = el.querySelector(".ltb-blur");
      this._edge = el.querySelector(".ltb-edge");
      this._edgeGrad = el.querySelector(".ltb-edge linearGradient");
      this._edgePath = el.querySelector(".ltb-edge path");
      this._clip = el.querySelector(".ltb-clip");
      this._side = el.querySelector(".ltb-side");
      this.side = null;
      this._bind();
      this.minimized = false;
      this._scrollOff = null;
      this.set({ side: o.side, items: o.items, active: o.active });
      if (o.minimizeOnScroll) this.setMinimizeOnScroll(true, o.scrollTarget);
    }

    /* ---------- 公開 API ---------- */

    set({ items, active, side } = {}, opts) {
      if (side !== undefined) this.setSide(side);
      if (items) this.setItems(items);
      if (active !== undefined) this.setActive(active, opts);
      return this;
    }

    // 換項目。數量不變時只更新有變的那格：換頁時常會重設項目，DOM 不重建，動畫才不受影響
    setItems(items) {
      const el = this.el, n = items.length;
      let btns = this._buttons();
      if (btns.length !== n) {
        btns.forEach(b => b.remove());
        this._copy.innerHTML = "";
        for (let i = 0; i < n; i++) {
          const b = document.createElement("button");
          b.type = "button"; b.className = "ltb-item"; b.style.setProperty("--ltb-j", i);
          el.insertBefore(b, this._clip);
          this._copy.appendChild(document.createElement("b"));
        }
        el.style.setProperty("--ltb-n", n);
        btns = this._buttons();
      }
      const copies = this._copy.children;
      items.forEach((a, i) => {
        const b = btns[i], sig = [a.id, a.label, a.icon].join("\u0000");
        if (b._ltb === sig) return;
        b._ltb = sig;
        b.dataset.id = a.id;
        b.setAttribute("aria-label", a.label || a.id);
        b.innerHTML = svg(a.icon) + (a.label ? `<span>${esc(a.label)}</span>` : "");
        copies[i].innerHTML = svg(a.icon) + (a.label ? `<i>${esc(a.label)}</i>` : "");
      });
      this.items = items.slice();
      this.layout();
      return this;
    }

    // 左邊單獨的圓形按鈕：{ id, label, icon } 顯示（分頁列往右讓出位置，總寬度不變）；null 收起
    setSide(side) {
      const b = this._side, on = !!side;
      this.side = side || null;
      this.el.classList.toggle("ltb-has-side", on);
      b.tabIndex = on ? 0 : -1;
      // 出現程度由彈簧驅動（_step），第一次或減少動態時直接到位
      const s = this._s;
      if (!this._placed || reduced()) { s.sp = on ? 1 : 0; s.spv = 0; this._sideVis(); }
      else this._kick();
      if (on) {
        b.removeAttribute("aria-hidden");
        b.dataset.id = side.id == null ? "" : side.id;
        b.setAttribute("aria-label", side.label || side.id || "");
        const sig = [side.id, side.label, side.icon].join("\u0000");
        if (b._ltb !== sig) { b._ltb = sig; b.firstChild.innerHTML = svg(side.icon); }
      } else b.setAttribute("aria-hidden", "true");
      this.layout();
      return this;
    }

    // 縮小／恢復整組分頁列（含左邊的圓形按鈕）
    setMinimized(on) {
      on = !!on;
      if (on === this.minimized) return this;
      this.minimized = on;
      this.el.classList.toggle("ltb-min", on);
      this.el.dispatchEvent(new CustomEvent("ltb:minimize", { detail: { minimized: on } }));
      return this;
    }

    // 捲動時自動縮小：往下累積捲動 minimizeDistance px 縮小，往上同樣距離或回到頂端時恢復
    setMinimizeOnScroll(on, target) {
      if (this._scrollOff) { this._scrollOff(); this._scrollOff = this._scrollSync = null; }
      if (!on) { this.setMinimized(false); return this; }
      if (typeof target === "string") target = document.querySelector(target);
      const src = target || window, isWin = src === window;
      const pos = () => isWin ? (window.scrollY || document.documentElement.scrollTop) : src.scrollTop;
      let last = pos(), acc = 0;
      const onScroll = () => {
        const y = pos(), d = y - last, dist = this.options.minimizeDistance;
        last = y;
        if (y <= 4) { acc = 0; this.setMinimized(false); return; }      // 回到頂端（含 iOS 回彈的負值）
        acc = d > 0 ? Math.max(0, acc) + d : Math.min(0, acc) + d;
        if (acc > dist) this.setMinimized(true);
        else if (acc < -dist) this.setMinimized(false);
      };
      src.addEventListener("scroll", onScroll, { passive: true });
      this._scrollOff = () => src.removeEventListener("scroll", onScroll);
      this._scrollSync = () => { last = pos(); acc = 0; };
      return this;
    }

    // 網頁用程式改了捲動位置（例如換頁後還原原本的位置）後呼叫：那次捲動不算使用者往下捲，不會縮小
    syncScroll() {
      if (this._scrollSync) this._scrollSync();
      return this;
    }

    // 選中某格（id 或索引）；null / -1 隱藏膠囊；opts.instant 直接定位
    setActive(key, opts = {}) {
      const i = this._indexOf(key);
      this._mark(i);
      if (i < 0) return this;
      this.index = i;
      this._go(this._center(i), opts.instant || !this._placed);
      this._placed = true;
      return this;
    }

    layout() {
      const el = this.el, cs = getComputedStyle(el);
      this.padX = parseFloat(cs.paddingLeft) || 0;
      this.padY = parseFloat(cs.paddingTop) || 0;
      this.pillPad = parseFloat(cs.getPropertyValue("--ltb-pill-pad")) || 12;
      this.W = el.offsetWidth; this.H = el.offsetHeight;
      this.sw = (this.W - 2 * this.padX) / (this.items.length || 1);
      el.style.setProperty("--ltb-sw", this.sw + "px");
      el.style.setProperty("--ltb-dw", this.W + "px");
      // 整組寬度（--ltb-width 依視窗換算）：圓鈕用它以分頁列右緣定位。--ltb-width 裡的 % 是相對視窗，
      // 不能直接在圓鈕的 left 裡用（那裡的 % 是分頁列寬），所以用一個隱形的 fixed 元素量出來
      if (!this._probe) {
        this._probe = document.createElement("div");
        this._probe.setAttribute("aria-hidden", "true");
        this._probe.style.cssText = "position:fixed;left:0;top:0;height:0;visibility:hidden;pointer-events:none";
        document.body.appendChild(this._probe);
      }
      this._probe.style.width = cs.getPropertyValue("--ltb-width").trim() || "0px";
      const gw = this._probe.offsetWidth;
      if (gw) el.style.setProperty("--ltb-gw", gw + "px");
      this._render();
      return this;
    }

    destroy() {
      cancelAnimationFrame(this._raf);
      if (this._pend) clearTimeout(this._pend.timer);
      this._off.forEach(f => f());
      if (this._scrollOff) this._scrollOff();
      clearTimeout(this._sideT);
      this._css = {};
      if (this._probe) this._probe.remove();
      this.el.classList.remove("ltb", "ltb-noind", "ltb-has-side", "ltb-min", "ltb-side-vis");
      OWN_PROPS.forEach(p => this.el.style.removeProperty(p));
      this.el.innerHTML = "";
    }

    /* ---------- 動畫 ---------- */

    _center(i) { return this.padX + this.sw * (i + .5); }

    _go(x, instant) {
      const s = this._s;
      s.tx = x;
      if (instant || reduced()) {
        s.x = x; s.v = 0; s.p = 0; s.pv = 0;
        this._render();
        this._flush();
        return;
      }
      this._kick();
    }

    _kick() {
      if (this._raf) return;
      this._last = performance.now();
      this._raf = requestAnimationFrame(t => this._step(t));
    }

    _step(now) {
      const s = this._s, P = this.options.physics;
      const dt = Math.min(.1, (now - this._last) / 1000 || .016);
      this._last = now;

      const v0 = s.v;
      [s.x, s.v] = spring(s.x, s.v, s.tx, P.move.k, P.move.zeta, dt);
      // 煞車擠壓：只算「正在變慢」的減速度，換算成 0–1 的煞車量，再用彈簧追（擠壓後彈一下）
      const brake = Math.abs(s.v) > 20 ? Math.max(0, -(s.v - v0) / dt * Math.sign(s.v)) : 0;
      if (brake > 0) s.bd = Math.sign(s.v);
      const bt = Math.min(1, brake / P.brakeRef), bs = bt > s.b ? P.brake : P.release;   // 擠進去快、恢復慢
      [s.b, s.bv] = spring(s.b, s.bv, bt, bs.k, bs.zeta, dt);
      [s.sp, s.spv] = spring(s.sp, s.spv, this.side ? 1 : 0, P.side.k, P.side.zeta, dt);
      const far = Math.abs(s.tx - s.x) > 3 || Math.abs(s.v) > 40;
      const up = s.down || far || now < s.hold;
      const m = up ? P.lift : P.settle;
      [s.p, s.pv] = spring(s.p, s.pv, up ? 1 : 0, m.k, m.zeta, dt);

      this._render();
      if (this._pend && Math.abs(s.tx - s.x) < this.options.arriveDistance) this._flush();

      const rest = !up && Math.abs(s.tx - s.x) < .3 && Math.abs(s.v) < 2 && Math.abs(s.p) < .002 && Math.abs(s.pv) < .02
        && Math.abs(s.b) < .002 && Math.abs(s.bv) < .02 && Math.abs(s.sp - (this.side ? 1 : 0)) < .001 && Math.abs(s.spv) < .01;
      if (rest) { s.x = s.tx; s.v = s.p = s.pv = s.b = s.bv = s.spv = 0; s.sp = this.side ? 1 : 0; s.drag = false; this._render(); this._raf = 0; return; }
      this._raf = requestAnimationFrame(t => this._step(t));
    }

    // 把狀態換算成膠囊幾何，寫進 CSS 變數
    _render() {
      const s = this._s, P = this.options.physics, st = this.el.style;
      if (!this.sw) return;
      const p = s.p, pc = clamp(p, 0, 1), over = p - pc;        // over：落定回彈的過衝量
      const speed = Math.abs(s.v);
      const baseW = this.sw + this.pillPad, baseH = this.H - 2 * this.padY;
      // 煞車擠壓：減速時左右變短、上下撐大（拖動時明顯，點擊時主要只有往內擠）；只在浮起時才有
      const bk = s.b * pc, bW = s.drag ? P.brakeW : P.brakeTapW, bH = s.drag ? P.brakeH : P.brakeTapH;
      const w0 = baseW * (1 + (P.growW - 1) * pc) * (1 + over * .5)
        + Math.min(speed * P.stretch, this.sw * P.stretchMax);
      let w = w0 * (1 - bW * bk);
      const cx = s.x + s.bd * (w0 - w) / 2;   // 前進方向那端不動，後端往前擠
      const h = baseH * (1 + (P.growH - 1) * pc) * (1 + over * .3)
        / (1 + Math.min(speed / P.squash, P.squashMax)) * (1 + bH * bk);
      // 左右夾在底板內：最左可到「最左格平常膠囊的左緣」，浮起時再往外 edge px；
      // 太寬就收窄、靠邊時整顆往內推，所以兩端的格子放大或拉長時是往內側長
      const lo = this.padX - this.pillPad / 2 - P.edge * pc, hi = this.W - lo;
      w = Math.min(w, hi - lo);
      const pl = clamp(cx - w / 2, lo, hi - w), pt = (this.H - h) / 2;
      // 只寫有變的值：每次寫入都會讓瀏覽器重算整條分頁列的樣式，手機上很明顯
      const c = this._css, put = (k, v) => { if (c[k] !== v) { c[k] = v; st.setProperty(k, v); } };
      put("--ltb-pl", pl.toFixed(2) + "px");
      put("--ltb-pt", pt.toFixed(2) + "px");
      put("--ltb-pw", w.toFixed(2) + "px");
      put("--ltb-ph", h.toFixed(2) + "px");
      put("--ltb-g", Math.min(1, pc * 1.6).toFixed(3));
      put("--ltb-cx", s.x.toFixed(2) + "px");
      put("--ltb-m", (1 + (P.mag - 1) * pc).toFixed(4));
      put("scale", `${(1 + P.barX * p).toFixed(4)} ${(1 + P.barY * p).toFixed(4)}`);
      put("--ltb-sp", s.sp.toFixed(4));
      this._sideVis();
      put("--ltb-isx", (1 / (1 + P.barX * p)).toFixed(4));            // 圓形按鈕反向縮放，不跟著分頁列放大
      put("--ltb-isy", (1 / (1 + P.barY * p)).toFixed(4));
      if (pc > 0) this._lensShape(pl, w, h, 1 + P.barX * p, 1 + P.barY * p);
    }

    // 玻璃裡的底板輪廓（底板座標）：中段是放大前的原本大小（整條底板放大 sx × sy，這裡以底板中心縮回 1/sx × 1/sy）；
    // 靠近玻璃左右兩端時，若底板還往外延伸，就用平滑的 S 形接回原本的高度，和外面的底板連成一條；
    // 若那端就是底板的盡頭（最左／最右格），維持縮小後的圓弧。用 clip-path 裁底色、SVG 描亮邊
    _lensShape(pl, w, h, sx, sy) {
      const W = this.W, H = this.H, R = H / 2, hs = R / sy;
      const sL = W / 2 * (1 - 1 / sx), sR = W - sL;                // 放大前原本大小的左右端
      const half = (x, a, b, r) => {                               // 膠囊 [a,b]、半徑 r 在 x 的半高
        if (x <= a || x >= b) return 0;
        const d = Math.min(x - a, b - x);
        return d >= r ? r : Math.sqrt(r * r - (r - d) * (r - d));
      };
      const smooth = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
      const L = pl, Rr = pl + w, f = Math.min(h * .45, w / 3);   // S 形過渡的長度
      const kL = clamp(L / R, 0, 1), kR = clamp((W - Rr) / R, 0, 1);   // 底板在這端還往外延伸多少
      // 從底板盡頭拖出來時，縮小後的圓弧跟著 k 逐漸滑出玻璃外（不在尖端外另外混出形狀）
      const aL = Math.min(sL, sL + (L - 2 * hs - sL) * kL), aR = Math.max(sR, sR + (Rr + 2 * hs - sR) * kR);
      // 只取底板實際存在的範圍（半高 > 0），不然會沿中線多描一條線到玻璃邊緣
      // 取樣點：均勻取樣，再在各個圓弧上照角度加密（圓弧尖端變化很快，均勻取樣會把尖端削平），並含尖端本身
      const x0 = L - 2, x1 = Rr + 2, xs = [], tips = [aL, aR];
      const n = Math.max(24, Math.ceil(w)), top = [], bot = [];
      for (let i = 0; i <= n; i++) xs.push(x0 + (x1 - x0) * i / n);
      for (const [a, r, dir] of [[aL, hs, 1], [aR, hs, -1], [0, R, 1], [W, R, -1]])
        for (let j = 0; j <= 16; j++) xs.push(a + dir * r * (1 - Math.cos(Math.PI / 2 * j / 16)));
      xs.sort((p, q) => p - q);
      let last = -Infinity;
      for (const x of xs) {
        if (x < x0 || x > x1 || x - last < .05) continue;
        last = x;
        // S 形混合只在縮小的底板存在處生效，並在它的圓弧尖端漸弱到 0（尖端外不會多出細條）
        const hS = half(x, aL, aR, hs);
        const t = Math.max(kL * smooth(1 - (x - L) / f), kR * smooth(1 - (Rr - x) / f)) * (hS / hs);
        const hh = hS + (half(x, 0, W, R) - hS) * t;
        if (hh < .05 && !tips.some(q => Math.abs(q - x) < .01)) continue;
        top.push(x.toFixed(1) + " " + (R - hh).toFixed(1));
        bot.unshift(x.toFixed(1) + " " + (R + hh).toFixed(1));
      }
      // 膠囊停在底板盡頭時，那端的挖空往外多擴一點，底板端點的亮邊才不會從邊界漏出一條細線
      const st = this.el.style, xl = ((1 - kL) * 3).toFixed(2) + "px", xr = ((1 - kR) * 3).toFixed(2) + "px";
      if (this._css["--ltb-xl"] !== xl) { this._css["--ltb-xl"] = xl; st.setProperty("--ltb-xl", xl); }
      if (this._css["--ltb-xr"] !== xr) { this._css["--ltb-xr"] = xr; st.setProperty("--ltb-xr", xr); }
      const pts = top.concat(bot);
      const clip = "polygon(" + pts.map(q => q.replace(" ", "px ") + "px").join(",") + ")";
      if (this._clipCss !== clip) {
        this._clipCss = clip;
        this._bar.style.clipPath = clip; this._bar.style.webkitClipPath = clip;
        this._blur.style.clipPath = clip; this._blur.style.webkitClipPath = clip;
        this._edgePath.setAttribute("d", "M" + pts.join("L") + "Z");
      }
      if (this._edgeH !== H) { this._edgeH = H; this._edgeGrad.setAttribute("y2", H); }
    }

    /* ---------- 內部 ---------- */

    // 圓鈕看得到時才 visible（收起的淡出結束後隱藏，不擋點擊、不被讀到）
    _sideVis() {
      const v = this._s.sp > .001;
      if (v !== this._sideShown) { this._sideShown = v; this.el.classList.toggle("ltb-side-vis", v); }
      if (!this.sw) this.el.style.setProperty("--ltb-sp", this._s.sp.toFixed(4));
    }

    // 左邊圓形按鈕的按壓：按下浮起放大，放開後至少維持 hold 毫秒再縮回（輕按也看得到）
    _sidePress() {
      clearTimeout(this._sideT);
      this._sideAt = performance.now();
      this._side.classList.add("ltb-side-down");
    }
    _sideRelease() {
      if (!this._side.classList.contains("ltb-side-down")) return;
      const wait = Math.max(0, this.options.physics.hold - (performance.now() - (this._sideAt || 0)));
      clearTimeout(this._sideT);
      this._sideT = setTimeout(() => this._side.classList.remove("ltb-side-down"), wait);
    }

    _buttons() { return [...this.el.querySelectorAll(":scope > .ltb-item")]; }

    _indexOf(key) {
      if (key == null) return -1;
      if (typeof key === "number") return key >= 0 && key < this.items.length ? key : -1;
      return this.items.findIndex(a => a.id === key);
    }

    _mark(i) {
      this._buttons().forEach((b, j) => {
        if (j === i) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      });
      this.el.classList.toggle("ltb-noind", i < 0);
    }

    _emit(type, i, source) {
      const item = this.items[i], info = { index: i, source };
      const f = this.options[type === "select" ? "onSelect" : "onReselect"];
      if (f) f(item, i, info);
      this.el.dispatchEvent(new CustomEvent("ltb:" + type, { detail: { item, index: i, source } }));
    }

    _choose(i, source) {
      const s = this._s;
      s.hold = performance.now() + this.options.physics.hold;
      if (i === this.index && !this.el.classList.contains("ltb-noind")) {
        this._go(this._center(i)); this._emit("reselect", i, source); return;
      }
      this.index = i; this._mark(i);
      if (this._pend) { clearTimeout(this._pend.timer); this._pend = null; }   // 連點時只送最後一次
      if (source === "gesture" && this.options.waitForPill) {
        this._pend = { i, source, timer: setTimeout(() => this._flush(), this.options.arriveTimeout) };
        this._go(this._center(i));
        if (!this._raf) this._flush();
        return;
      }
      this._go(this._center(i));
      this._emit("select", i, source);          // 錄影中頁面是點下就換，不等動畫
    }

    // 送出等待中的 onSelect（膠囊到位、逾時或直接定位時）
    _flush() {
      const q = this._pend;
      if (!q) return;
      this._pend = null; clearTimeout(q.timer);
      this._emit("select", q.i, q.source);
    }

    _bind() {
      const el = this.el, o = this.options;
      const on = (t, ev, f, opt) => { t.addEventListener(ev, f, opt); return () => t.removeEventListener(ev, f, opt); };
      const localX = e => {
        const r = el.getBoundingClientRect();
        return (e.clientX - r.left) * (this.W / r.width);    // 換算回未放大的座標
      };
      const slotAt = x => clamp(Math.floor((x - this.padX) / this.sw), 0, this.items.length - 1);

      this._off = [
        on(el, "pointerdown", e => {
          this.setMinimized(false);                 // 縮小時只要點到分頁列（含圓鈕）就恢復原尺寸
          if (e.target.closest(".ltb-side")) { this._sidePress(); return; }
          if (this._g || !this.items.length) return;
          const x = localX(e);
          this._g = { id: e.pointerId, x0: x, moved: false, k: slotAt(x) };
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
          this._s.down = true; this._s.drag = false;
          this._go(this._center(this._g.k));      // 一按下就浮起並滑向按住的那格
        }),
        on(el, "pointermove", e => {
          const g = this._g;
          if (!g || e.pointerId !== g.id) return;
          const x = localX(e);
          if (!g.moved) { if (Math.abs(x - g.x0) < o.dragThreshold) return; g.moved = true; this._s.drag = true; }
          const lo = this._center(0) - this.sw * o.physics.overdrag;
          const hi = this._center(this.items.length - 1) + this.sw * o.physics.overdrag;
          g.k = slotAt(x);
          this._go(clamp(x, lo, hi));               // 拖動：膠囊跟手
        }),
        on(el, "pointerup", e => {
          const g = this._g;
          if (!g || e.pointerId !== g.id) return;
          this._g = null; this._s.down = false;
          this._skip = performance.now() + o.clickGuard;
          this._choose(g.k, "gesture");
        }),
        on(el, "pointercancel", e => {
          const g = this._g;
          if (!g || e.pointerId !== g.id) return;
          this._g = null; this._s.down = false;
          if (this.index >= 0) this._go(this._center(this.index));
        }),
        on(el, "click", e => {
          if (performance.now() < this._skip && !e.target.closest(".ltb-side")) { e.stopPropagation(); e.preventDefault(); }
        }, true),
        // 鍵盤 Enter / 空白鍵、輔助技術
        on(el, "click", e => {
          this.setMinimized(false);
          if (e.target.closest(".ltb-side")) {
            if (!this.side) return;
            if (e.detail === 0) { this._sidePress(); this._sideRelease(); }   // 鍵盤操作也播一次浮起
            if (o.onSide) o.onSide(this.side);
            el.dispatchEvent(new CustomEvent("ltb:side", { detail: { side: this.side } }));
            return;
          }
          const b = e.target.closest(".ltb-item");
          if (b) this._choose(this._buttons().indexOf(b), "click");
        }),
        on(this._side, "pointerup", () => this._sideRelease()),
        on(this._side, "pointercancel", () => this._sideRelease()),
        on(this._side, "pointerleave", () => this._sideRelease()),
        on(window, "resize", () => { this.layout(); if (this.index >= 0) this._go(this._center(this.index), true); })
      ];
      if (typeof ResizeObserver === "function") {
        const ro = new ResizeObserver(() => {
          const prev = this.sw;
          this.layout();
          if (this.sw !== prev && this.index >= 0 && !this._g) this._go(this._center(this.index), true);
        });
        ro.observe(el);
        this._off.push(() => ro.disconnect());
      }
    }
  }

  LiquidTabbar.version = "2.7.5";
  LiquidTabbar.physics = PHYSICS;
  LiquidTabbar.defaults = DEFAULTS;
  return LiquidTabbar;
});
