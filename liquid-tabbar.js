/*! liquid-tabbar v2.3.1 | MIT | https://github.com/mailoswang/liquid-tabbar */

/* 動畫依 iOS 原生分頁列的螢幕錄影（60fps 逐格）分析：
 *   ① 按下：深色膠囊淡出、浮起成玻璃，放大約 1.3 倍、上下超出底板；整條底板放大約 3–5%
 *   ② 滑行：位置由彈簧追向目標，寬度隨速度拉長、高度略壓扁
 *   ③ 透鏡：玻璃裡的整條底板以膠囊中心微微縮小（約 0.86 倍），兩端圓弧也一起縮，空隙透出頁面；
 *      玻璃下的變色圖示與文字不縮小，跟著整條底板一起放大
 *   ④ 落定：到位後縮回深色膠囊，尺寸略過衝再回彈
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
    growW: 1.3,      // 浮起時膠囊變寬倍率
    growH: 1.33,     // 浮起時膠囊變高倍率（超出底板上下緣）
    mag: 1,          // 玻璃下圖示縮放倍率（1：跟著底板一起放大；>1 再放大、<1 縮小）
    shrink: .86,     // 玻璃裡看到的底板縮小倍率（1 為不縮）
    stretch: .065,   // 每 1 px/s 速度拉長幾 px
    stretchMax: 1.4, // 拉長上限（以一格寬為單位）
    squash: 9000,    // 速度造成高度壓扁的分母（越小越扁）
    squashMax: .14,  // 壓扁上限
    barX: .035,      // 浮起時底板水平放大
    barY: .05,       // 浮起時底板垂直放大
    hold: 120,       // 放開後玻璃至少再維持多久（ms）
    overdrag: .12,   // 拖動時可以拉出最左／最右格多少（以一格寬為單位）
    edge: 9          // 浮起時膠囊最多可以超出底板左右兩端幾 px（平常不超出）
  };

  const DEFAULTS = {
    items: [],           // [{ id, label, icon }]；icon 可為完整 <svg> 或 24×24 viewBox 內的路徑
    active: 0,           // 目前選中的 id 或索引；null / -1 代表都不選（膠囊隱藏）
    onSelect: null,      // (item, index, info) 選了另一格（放開瞬間呼叫）
    onReselect: null,    // (item, index, info) 點了已選中的那格
    physics: PHYSICS,
    dragThreshold: 8,    // 手指移動超過幾 px 才算拖動
    clickGuard: 800,     // 手勢結束後擋掉多久內晚到的 click（iOS 會晚送）
    waitForPill: false,  // true：手勢換頁時等膠囊滑到位才呼叫 onSelect（換頁很吃效能時，動畫才不會在起步時卡住）
    arriveDistance: 6,   // waitForPill：膠囊離目標幾 px 內算到位
    arriveTimeout: 320   // waitForPill：最多等多久（ms）
  };

  // 函式庫寫在分頁列元素上的樣式（destroy 時只清這些，不動使用者自己設的）
  const OWN_PROPS = ["--ltb-n", "--ltb-sw", "--ltb-dw", "--ltb-pl", "--ltb-pt", "--ltb-pw", "--ltb-ph", "--ltb-g", "--ltb-cx", "--ltb-m", "--ltb-bs", "scale"];

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
      for (const k of ["move", "lift", "settle"]) o.physics[k] = Object.assign({}, PHYSICS[k], ph[k]);
      this.el = el;
      this.options = o;
      this.items = [];
      this.index = -1;
      this.sw = 0;
      // 動畫狀態：x 膠囊中心、v 速度、tx 目標；p 浮起程度（可過衝）、pv 其速度
      this._s = { x: 0, v: 0, tx: 0, p: 0, pv: 0, down: false, hold: 0 };
      this._g = null;      // 手勢
      this._raf = 0;
      this._last = 0;
      this._skip = 0;
      this._placed = false;
      this._pend = null;   // waitForPill：等膠囊到位才送出的 onSelect
      this._css = {};      // 上一次寫入的樣式值，沒變就不重寫

      el.classList.add("ltb");
      el.innerHTML = '<span class="ltb-bg" aria-hidden="true"></span><span class="ltb-ind" aria-hidden="true"></span><span class="ltb-lens" aria-hidden="true"><span class="ltb-bar"></span></span>' +
        '<span class="ltb-clip" aria-hidden="true"><span class="ltb-copy"></span></span>';
      this._copy = el.querySelector(".ltb-copy");
      this._clip = el.querySelector(".ltb-clip");
      this._bind();
      this.set({ items: o.items, active: o.active });
    }

    /* ---------- 公開 API ---------- */

    set({ items, active } = {}, opts) {
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
      this._render();
      return this;
    }

    destroy() {
      cancelAnimationFrame(this._raf);
      if (this._pend) clearTimeout(this._pend.timer);
      this._off.forEach(f => f());
      this._css = {};
      this.el.classList.remove("ltb", "ltb-noind");
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

      [s.x, s.v] = spring(s.x, s.v, s.tx, P.move.k, P.move.zeta, dt);
      const far = Math.abs(s.tx - s.x) > 3 || Math.abs(s.v) > 40;
      const up = s.down || far || now < s.hold;
      const m = up ? P.lift : P.settle;
      [s.p, s.pv] = spring(s.p, s.pv, up ? 1 : 0, m.k, m.zeta, dt);

      this._render();
      if (this._pend && Math.abs(s.tx - s.x) < this.options.arriveDistance) this._flush();

      const rest = !up && Math.abs(s.tx - s.x) < .3 && Math.abs(s.v) < 2 && Math.abs(s.p) < .002 && Math.abs(s.pv) < .02;
      if (rest) { s.x = s.tx; s.v = s.p = s.pv = 0; this._render(); this._raf = 0; return; }
      this._raf = requestAnimationFrame(t => this._step(t));
    }

    // 把狀態換算成膠囊幾何，寫進 CSS 變數
    _render() {
      const s = this._s, P = this.options.physics, st = this.el.style;
      if (!this.sw) return;
      const p = s.p, pc = clamp(p, 0, 1), over = p - pc;        // over：落定回彈的過衝量
      const speed = Math.abs(s.v);
      const baseW = this.sw + this.pillPad, baseH = this.H - 2 * this.padY;
      let w = baseW * (1 + (P.growW - 1) * pc) * (1 + over * .5)
        + Math.min(speed * P.stretch, this.sw * P.stretchMax);
      const h = baseH * (1 + (P.growH - 1) * pc) * (1 + over * .3)
        / (1 + Math.min(speed / P.squash, P.squashMax));
      // 左右夾在底板內：最左可到「最左格平常膠囊的左緣」，浮起時再往外 edge px；
      // 太寬就收窄、靠邊時整顆往內推，所以兩端的格子放大或拉長時是往內側長
      const lo = this.padX - this.pillPad / 2 - P.edge * pc, hi = this.W - lo;
      w = Math.min(w, hi - lo);
      const pl = clamp(s.x - w / 2, lo, hi - w), pt = (this.H - h) / 2;
      // 只寫有變的值：每次寫入都會讓瀏覽器重算整條分頁列的樣式，手機上很明顯
      const c = this._css, put = (k, v) => { if (c[k] !== v) { c[k] = v; st.setProperty(k, v); } };
      put("--ltb-pl", pl.toFixed(2) + "px");
      put("--ltb-pt", pt.toFixed(2) + "px");
      put("--ltb-pw", w.toFixed(2) + "px");
      put("--ltb-ph", h.toFixed(2) + "px");
      put("--ltb-g", Math.min(1, pc * 1.6).toFixed(3));
      put("--ltb-cx", s.x.toFixed(2) + "px");
      put("--ltb-m", (1 + (P.mag - 1) * pc).toFixed(4));
      put("--ltb-bs", (1 + (P.shrink - 1) * pc).toFixed(4));
      put("scale", `${(1 + P.barX * p).toFixed(4)} ${(1 + P.barY * p).toFixed(4)}`);
    }

    /* ---------- 內部 ---------- */

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
          if (this._g || !this.items.length) return;
          const x = localX(e);
          this._g = { id: e.pointerId, x0: x, moved: false, k: slotAt(x) };
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
          this._s.down = true;
          this._go(this._center(this._g.k));      // 一按下就浮起並滑向按住的那格
        }),
        on(el, "pointermove", e => {
          const g = this._g;
          if (!g || e.pointerId !== g.id) return;
          const x = localX(e);
          if (!g.moved) { if (Math.abs(x - g.x0) < o.dragThreshold) return; g.moved = true; }
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
          if (performance.now() < this._skip) { e.stopPropagation(); e.preventDefault(); }
        }, true),
        // 鍵盤 Enter / 空白鍵、輔助技術
        on(el, "click", e => {
          const b = e.target.closest(".ltb-item");
          if (b) this._choose(this._buttons().indexOf(b), "click");
        }),
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

  LiquidTabbar.version = "2.3.1";
  LiquidTabbar.physics = PHYSICS;
  LiquidTabbar.defaults = DEFAULTS;
  return LiquidTabbar;
});
