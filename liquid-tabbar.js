/*! liquid-tabbar v1.0.0 | MIT | https://github.com/mailoswang/liquid-tabbar */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LiquidTabbar = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ========================================================================
     預設值：在 new LiquidTabbar(el, options) 傳入同名欄位即可覆寫
     ======================================================================== */

  // 膠囊物理（兩組：輕按 tap、按住拖動 drag）
  //  k / c   前緣彈簧的剛度 / 阻尼（c = 2√k 為臨界阻尼：不過衝，指哪停哪）
  //  kt / ct 後緣追前緣的彈簧（阻尼小於臨界：起步落後＝拉長，前緣停下時撞上來＝煞車擠壓）
  //  S / C   畫面上拉長 / 擠壓的上限（px，用 tanh 平滑壓住）
  //  bulge   擠壓 1px 時上下撐開的比例
  const PHYSICS = {
    tap: { k: 420, c: 41, kt: 200, ct: 12, S: 16, C: 32, bulge: .0013 },
    drag: { k: 1400, c: 70, kt: 220, ct: 13, S: 24, C: 24, bulge: .002 }
  };

  const DEFAULTS = {
    items: [],            // [{ id, label, icon }]；icon 可為完整 <svg> 或 24×24 viewBox 內的路徑
    active: 0,            // 目前選中的 id 或索引；null / -1 代表都不選（膠囊隱藏）
    onSelect: null,       // (item, index, info) 選了另一格。手勢：膠囊到位後才呼叫；鍵盤：立即
    onReselect: null,     // (item, index, info) 點了已選中的那格（例如回到頂端）
    physics: PHYSICS,
    arriveDistance: 6,    // 膠囊離目標多近就算到位（px）
    arriveTimeout: 320,   // 最多等膠囊多久（ms），之後無論如何都呼叫 onSelect
    liftHold: 120,        // 到位後再過多久收回浮起狀態（ms）
    liftMin: 60,          // 沒換頁時，浮起狀態最短 / 最長保留（ms）
    liftMax: 180,
    dragThreshold: 6,     // 手指移動超過幾 px 才算拖動
    clickGuard: 800       // 手勢結束後擋掉多久內晚到的 click（iOS 會晚送）
  };

  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const svg = src => {
    if (!src) return "";
    src = String(src).trim();
    return src.startsWith("<svg")
      ? src.replace("<svg", '<svg class="ltb-ic" aria-hidden="true"')
      : `<svg class="ltb-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${src}</svg>`;
  };

  /* ========================================================================
     膠囊的果凍動畫
     前緣（往前進方向那側）用不過衝的柔和彈簧追目標；後緣用較有彈性的彈簧追前緣：
     起步時落後（拉長），前緣停下時衝上去撞進來（煞車擠壓），擠到最深後改用臨界阻尼平順回彈，
     每次移動只彈一次。擠壓時上下微微撐開。
     write(x, cmp, sy) 每幀被呼叫，負責把結果寫到畫面上
     ======================================================================== */
  function Pill(write, physics) {
    let P = 0, vP = 0, T = 0, vT = 0, t = 0, dir = 1, wd = 0, calm = false;
    let raf = 0, last = 0, m = physics.tap, live = false, onArrive = null, arriveAt = 6;

    // 寬度變化 wd（正＝拉長、負＝擠壓）；前緣固定在 P，後緣在 P − dir·wd
    const apply = () => write(P - dir * wd / 2, -wd, 1 + Math.max(0, -wd) * m.bulge);
    const fire = () => { const f = onArrive; onArrive = null; f && f(); };

    // 照實際經過的時間補算（掉幀時直接跳到該在的位置）；細分成每步 2ms 以內，彈簧才穩定
    const step = now => {
      const dt = Math.min(.1, (now - last) / 1000 || .016), n = Math.ceil(dt / .002);
      last = now;
      for (let i = 0, h = dt / n; i < n; i++) {
        vP += (m.k * (t - P) - m.c * vP) * h; P += vP * h;
        // 只彈一次：擠到最深、開始彈回的那一刻起，後緣改用臨界阻尼
        const g = (P - T) * dir;
        if (!calm && g < 0 && (vP - vT) * dir > 0) calm = true;
        if (calm && live && g > 2) calm = false;
        vT += (m.kt * (P - T) + (calm ? 2 * Math.sqrt(m.kt) * (vP - vT) : -m.ct * vT)) * h; T += vT * h;
      }
      // 拖動時前進方向跟著手指變；換方向時寬度平順過渡
      if (live && Math.abs(vP) > 200) dir = Math.sign(vP);
      const raw = (P - T) * dir, tw = raw > 0 ? m.S * Math.tanh(raw / m.S) : m.C * Math.tanh(raw / m.C);
      wd += (tw - wd) * Math.min(1, dt * (live ? 30 : 60));
      apply();
      if (onArrive && Math.abs(t - P) < arriveAt) fire();
      if (!live && Math.abs(t - P) < .3 && Math.abs(vP) < 4 && Math.abs(P - T) < 1 && Math.abs(vT) < 15) {
        P = T = t; vP = vT = 0; wd = 0; apply(); raf = 0; return;
      }
      raf = requestAnimationFrame(step);
    };

    return {
      get target() { return t; },
      // 膠囊滑到目標附近再做事（例如換頁：重建頁面很吃效能，等膠囊到位再做才不會卡住動畫）
      arrive(f, dist, ms) {
        arriveAt = dist;
        if (!raf || Math.abs(t - P) < dist) { f(); return; }
        let done = false;
        const g = () => { if (!done) { done = true; onArrive = null; f(); } };
        onArrive = g; setTimeout(g, ms);
      },
      to(nt, o = {}) {
        if (!o.drag && Math.abs(nt - t) > .5) { dir = Math.sign(nt - P) || dir; calm = false; }
        t = nt; live = !!o.drag; m = o.drag ? physics.drag : physics.tap;
        if (o.instant || reduced()) {
          P = T = t; vP = vT = 0; wd = 0; apply();
          cancelAnimationFrame(raf); raf = 0; fire(); return;
        }
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
      },
      stop() { cancelAnimationFrame(raf); raf = 0; onArrive = null; }
    };
  }

  /* ========================================================================
     LiquidTabbar
     ======================================================================== */
  class LiquidTabbar {
    constructor(el, options = {}) {
      if (typeof el === "string") el = document.querySelector(el);
      if (!el) { el = document.createElement("nav"); document.body.appendChild(el); }
      const o = Object.assign({}, DEFAULTS, options);
      const ph = options.physics || {};
      o.physics = { tap: Object.assign({}, PHYSICS.tap, ph.tap), drag: Object.assign({}, PHYSICS.drag, ph.drag) };
      this.el = el;
      this.options = o;
      this.items = [];
      this.index = -1;      // 目前選中的格子
      this.sw = 0;          // 一格寬（px）
      this._placed = false; // 第一次定位直接放好，不從最左邊滑過來
      this._st = null;      // 手勢狀態
      this._skip = 0;
      this._raf = 0;

      el.classList.add("ltb");
      el.innerHTML = '<span class="ltb-ind" aria-hidden="true"></span><span class="ltb-clip" aria-hidden="true"><span class="ltb-copy"></span></span>';
      this._ind = el.firstChild;
      this._copy = el.querySelector(".ltb-copy");

      const st = el.style;
      this._pill = Pill((x, cmp, sy) => {
        st.setProperty("--ltb-cmp", cmp.toFixed(2) + "px");
        st.setProperty("--ltb-x", x.toFixed(2) + "px");
        st.setProperty("--ltb-sx", "1");
        st.setProperty("--ltb-sy", sy.toFixed(4));
      }, o.physics);

      this._bind();
      this.set({ items: o.items, active: o.active });
    }

    /* ---------- 公開 API ---------- */

    // 一次更新項目與選中狀態：bar.set({ items, active })
    set({ items, active } = {}, opts) {
      if (items) this.setItems(items);
      if (active !== undefined) this.setActive(active, opts);
      return this;
    }

    // 換項目：數量相同時只更新有變的那格（DOM 不重建，膠囊才能滑過去）
    setItems(items) {
      const el = this.el, n = items.length;
      let btns = this._buttons(), copies = this._copy.children;
      if (btns.length !== n) {
        btns.forEach(b => b.remove());
        this._copy.innerHTML = "";
        const clip = el.querySelector(".ltb-clip");
        for (let i = 0; i < n; i++) {
          const b = document.createElement("button");
          b.type = "button"; b.className = "ltb-item"; b.style.setProperty("--ltb-j", i);
          el.insertBefore(b, clip);
          this._copy.appendChild(document.createElement("b"));
        }
        el.style.setProperty("--ltb-n", n);
        btns = this._buttons(); copies = this._copy.children;
      }
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

    // 選中某格（id 或索引）；null / -1 隱藏膠囊。opts.instant：不播動畫直接定位
    setActive(key, opts = {}) {
      const i = this._indexOf(key);
      this._mark(i);
      if (i < 0) return this;
      this.index = i;
      this._pill.to(i * this.sw, { instant: opts.instant || !this._placed });
      this._placed = true;
      return this;
    }

    // 尺寸改變時重算（視窗縮放已自動處理；容器自己變寬時可手動呼叫）
    layout() {
      const el = this.el, n = this.items.length || 1;
      const cs = getComputedStyle(el), px = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      this.sw = (el.offsetWidth - px) / n;
      el.style.setProperty("--ltb-sw", this.sw + "px");
      el.style.setProperty("--ltb-dw", el.offsetWidth + "px");
      return this;
    }

    destroy() {
      this._pill.stop();
      cancelAnimationFrame(this._raf);
      this._off.forEach(f => f());
      this.el.classList.remove("ltb", "ltb-lift", "ltb-drag", "ltb-noind");
      this.el.innerHTML = "";
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
        b.classList.toggle("on", j === i);
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

    _bind() {
      const el = this.el, o = this.options, pill = this._pill;
      const on = (t, ev, f, opt) => { t.addEventListener(ev, f, opt); return () => t.removeEventListener(ev, f, opt); };

      // 一按下膠囊就浮起成玻璃塊、移到按住的那格；按住可左右拖動，膠囊蓋到的圖示就變色，鬆手才切換
      const put = (px, drag = true) => {
        const s = this._st;
        px = Math.max(0, Math.min((this.items.length - 1) * s.w, px));
        s.k = Math.round(px / s.w);
        pill.to(px, { drag });
      };
      const done = ok => {
        const s = this._st;
        if (!s) return;
        this._st = null;
        cancelAnimationFrame(this._raf);
        this._skip = performance.now() + o.clickGuard;
        el.classList.remove("ltb-drag");
        const unlift = ms => setTimeout(() => { if (!this._st) el.classList.remove("ltb-lift"); }, ms);
        if (ok && s.k !== s.cur) {
          // 換頁：等膠囊到位才通知，緊接著收回浮起狀態，滑動、煞車、收回一氣呵成
          const k = s.k;
          this.index = k; this._mark(k);
          pill.to(k * s.w);
          pill.arrive(() => { unlift(o.liftHold); this._emit("select", k, "gesture"); }, o.arriveDistance, o.arriveTimeout);
        } else {
          if (s.cur >= 0) pill.to(s.cur * s.w);
          if (ok && !s.moved) this._emit("reselect", s.k, "gesture");
          unlift(Math.max(o.liftMin, o.liftMax - (performance.now() - s.t0)));
        }
      };

      this._off = [
        on(el, "pointerdown", e => {
          const b = e.target.closest(".ltb-item");
          if (!b || this._st) return;
          const i = this._buttons().indexOf(b);
          this.layout();
          this._st = { id: e.pointerId, x0: e.clientX, i, k: -1, moved: false, w: this.sw,
            cur: el.classList.contains("ltb-noind") ? -1 : this.index, t0: performance.now() };
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
          el.classList.add("ltb-lift", "ltb-drag");
          put(i * this._st.w, false);
        }),
        on(el, "pointermove", e => {
          const s = this._st;
          if (!s || e.pointerId !== s.id) return;
          const x = e.clientX;
          if (!s.moved) { if (Math.abs(x - s.x0) < o.dragThreshold) return; s.moved = true; }
          cancelAnimationFrame(this._raf);
          this._raf = requestAnimationFrame(() => { if (this._st) put(s.i * s.w + x - s.x0); });
        }),
        on(el, "pointerup", e => { if (this._st && e.pointerId === this._st.id) done(true); }),
        on(el, "pointercancel", e => { if (this._st && e.pointerId === this._st.id) done(false); }),
        // 手勢已經處理過了；iPhone 的 click 會晚到，這時按鈕可能已換成別的，一律擋掉
        on(el, "click", e => {
          if (performance.now() < this._skip) { e.stopPropagation(); e.preventDefault(); }
        }, true),
        // 其餘的 click（鍵盤 Enter / 空白鍵、輔助技術）直接切換
        on(el, "click", e => {
          const b = e.target.closest(".ltb-item");
          if (!b) return;
          const i = this._buttons().indexOf(b);
          if (i === this.index && !el.classList.contains("ltb-noind")) return this._emit("reselect", i, "click");
          this.setActive(i);
          this._emit("select", i, "click");
        }),
        on(window, "resize", () => {
          this.layout();
          if (this.index >= 0) pill.to(this.index * this.sw, { instant: true });
        })
      ];
    }
  }

  LiquidTabbar.version = "1.0.0";
  LiquidTabbar.physics = PHYSICS;
  LiquidTabbar.Pill = Pill;   // 只要膠囊物理（自己畫畫面）時可直接用
  LiquidTabbar.defaults = DEFAULTS;
  return LiquidTabbar;
});
