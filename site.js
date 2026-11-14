/* Indem — site interactions. Native scroll, no libraries. */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement, body = doc.body;
  const $ = (s, p = doc) => p.querySelector(s), $$ = (s, p = doc) => Array.from(p.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const wide = matchMedia('(min-width: 901px)');
  const canHover = matchMedia('(hover: hover)').matches;

  /* ----- Motion preference (system setting, overridable from the footer) ----- */
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mq.matches;
  try { const s = localStorage.getItem('indem-motion'); if (s !== null) reduced = s === 'reduced'; } catch {}
  const motionBtn = $('#motion-toggle');
  function applyMotion() {
    root.classList.toggle('reduce', reduced);
    if (motionBtn) { motionBtn.setAttribute('aria-pressed', String(reduced)); motionBtn.textContent = reduced ? 'Enable motion' : 'Reduce motion'; }
    doc.dispatchEvent(new CustomEvent('indem-motion', { detail: { reduced } }));
  }
  motionBtn?.addEventListener('click', () => { reduced = !reduced; try { localStorage.setItem('indem-motion', reduced ? 'reduced' : 'full'); } catch {} applyMotion(); });
  mq.addEventListener('change', e => { reduced = e.matches; applyMotion(); });

  /* ----- Text: split headings into words, wrap statement words ----- */
  function wrapWords(el, make) {
    const walk = node => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
          const frag = doc.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => { if (!part) return; if (/^\s+$/.test(part)) frag.append(' '); else frag.append(make(part)); });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
      }
    };
    walk(el);
  }
  $$('[data-split]').forEach(el => {
    let wi = 0;
    wrapWords(el, part => { const o = doc.createElement('span'); o.className = 'split-w'; o.style.setProperty('--wi', wi++); const i = doc.createElement('span'); i.textContent = part; o.append(i); return o; });
  });
  $$('[data-words]').forEach(el => { el._words = []; wrapWords(el, part => { const s = doc.createElement('span'); s.className = 'w'; s.textContent = part; el._words.push(s); return s; }); });
  const light = (el, q) => { const n = Math.round(q * el._words.length * 1.06); if (el._lit === n) return; el._lit = n; el._words.forEach((w, i) => w.classList.toggle('on', i < n)); };

  /* ----- Reveal on enter, count-up numbers ----- */
  function countUp(b) {
    const m = b.textContent.trim().match(/^([\d,]+)(.*)$/); if (!m || reduced) return;
    const target = +m[1].replace(/,/g, ''), tail = m[2], commas = m[1].includes(','), t0 = performance.now(), dur = 1300;
    const step = now => { const k = clamp((now - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - k, 3))); b.textContent = (commas ? v.toLocaleString('en-US') : v) + tail; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    $$('.stat b', e.target).forEach(b => { if (!b._counted) { b._counted = true; countUp(b); } });
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('[data-reveal],[data-split]').forEach(el => io.observe(el));

  /* ----- Header: glass after scroll, hide on the way down ----- */
  const head = $('.head'), menuBtn = $('.menu-btn'), sheet = $('#menu');
  let lastY = scrollY;
  function headerTick(y) {
    if (!head) return;
    head.classList.toggle('is-solid', y > 24);
    const open = menuBtn?.getAttribute('aria-expanded') === 'true';
    if (Math.abs(y - lastY) > 6) { head.classList.toggle('is-hidden', y > lastY && y > 320 && !open); lastY = y; }
  }
  function setMenu(open) {
    if (!menuBtn || !sheet) return;
    menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    sheet.classList.toggle('is-open', open); sheet.toggleAttribute('inert', !open); body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$('a', sheet || doc.createElement('div')).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 980) setMenu(false); });

  /* ----- Films ----- */
  const small = matchMedia('(max-width: 700px)');
  const media = window.__indemMedia || {};                       // review build inlines media here
  const resolve = u => (u && media[u]) || u;
  function prime(v) {
    if (!v || v.dataset.ready) return v; v.dataset.ready = '1'; v.muted = true; v.playsInline = true; v.loop = true; v.preload = 'auto';
    v.src = resolve(small.matches && v.dataset.srcMobile ? v.dataset.srcMobile : v.dataset.src);
    v.addEventListener('playing', () => v.classList.add('is-playing')); return v;
  }
  const playFilm = v => { if (!v || reduced || doc.hidden) return; prime(v); v.play().catch(() => {}); };

  /* ----- Frame sequences: the scroll position picks the frame ----- */
  class Seq {
    constructor(el) { this.el = el; this.canvas = $('canvas', el); this.ctx = this.canvas.getContext('2d'); this.frames = []; this.state = 'idle'; this.p = 0; this.drawn = -1; this.fx = +(el.dataset.focusX || .5); this.fy = +(el.dataset.focusY || .5); }
    async load() {
      if (this.state !== 'idle') return; this.state = 'loading';
      try {
        const key = this.el.dataset.src; let buf;
        if (media[key]) { const bin = atob(media[key].split(',').pop()); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); buf = u.buffer; }
        else buf = await (await fetch(key)).arrayBuffer();
        const dv = new DataView(buf), n = dv.getUint32(0, true), base = 4 + (n + 1) * 4;
        for (let i = 0; i < n; i++) {
          const a = dv.getUint32(4 + i * 4, true), b = dv.getUint32(8 + i * 4, true), img = new Image();
          img.decoding = 'async'; img.onload = () => { if (this.drawn < 0 || Math.abs(this.want - i) < 2) this.draw(this.p, true); };
          img.src = URL.createObjectURL(new Blob([buf.slice(base + a, base + b)], { type: 'image/webp' })); this.frames.push(img);
        }
        this.state = 'ready'; this.size(); this.draw(this.p, true);
      } catch { this.state = 'failed'; }
    }
    size() {
      const r = this.el.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.min(1680, Math.round(r.width * dpr)), h = Math.round(w * r.height / r.width);
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.drawn = -1; }
    }
    draw(p, force) {
      this.p = p; if (this.state !== 'ready') return;
      const n = this.frames.length, i = Math.round(clamp(p) * (n - 1)); this.want = i;
      let k = -1; for (let d = 0; d < n && k < 0; d++) { const a = this.frames[i - d], b = this.frames[i + d]; if (a && a.complete && a.naturalWidth) k = i - d; else if (b && b.complete && b.naturalWidth) k = i + d; }
      if (k < 0 || (k === this.drawn && !force)) return;
      const img = this.frames[k], cw = this.canvas.width, ch = this.canvas.height, s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
      this.ctx.drawImage(img, (cw - w) * this.fx, (ch - h) * this.fy, w, h); this.drawn = k; this.el.classList.add('has-frame');
    }
  }
  const seqs = $$('[data-seq]').map(el => (el._seq = new Seq(el)));
  const freeSeqs = seqs.filter(s => !s.el.closest('[data-pin]'));
  const seqIO = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting && wide.matches && !reduced) e.target._seq.load(); }), { rootMargin: '160% 0px 160% 0px' });
  seqs.forEach(s => seqIO.observe(s.el));


  /* ----- Point cloud: every figure is built here in code; the scroll (or time) morphs one into the next ----- */
  function cloudShapes(N, names) {
    const R = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
    const sphere = (c, r) => ({ a: 4 * Math.PI * r * r, s: () => { const u = R(-1, 1), t = R(0, TAU), q = Math.sqrt(1 - u * u); return [c[0] + r * q * Math.cos(t), c[1] + r * u, c[2] + r * q * Math.sin(t)]; } });
    const capsule = (p, q, r) => {
      const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(d[0], d[1], d[2]) || 1e-6, n = [d[0] / L, d[1] / L, d[2] / L], h = Math.abs(n[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
      let u = [n[1] * h[2] - n[2] * h[1], n[2] * h[0] - n[0] * h[2], n[0] * h[1] - n[1] * h[0]]; const ul = Math.hypot(u[0], u[1], u[2]); u = [u[0] / ul, u[1] / ul, u[2] / ul];
      const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      return { a: TAU * r * L + TAU * r * r, s: () => { const t = R(-.07, 1.07), g = R(0, TAU), tt = clamp(t), rr = t < 0 || t > 1 ? r * Math.sqrt(Math.random()) : r, cs = Math.cos(g) * rr, sn = Math.sin(g) * rr;
        return [p[0] + d[0] * tt + u[0] * cs + v[0] * sn, p[1] + d[1] * tt + u[1] * cs + v[1] * sn, p[2] + d[2] * tt + u[2] * cs + v[2] * sn]; } };
    };
    const box = (c, sz) => { const [w, h, d] = sz, A = [h * d, h * d, w * d, w * d, w * h, w * h], T = A.reduce((x, y) => x + y, 0);
      return { a: T, s: () => { let k = Math.random() * T, f = 0; while (f < 5 && k > A[f]) k -= A[f++]; const a = R(-.5, .5), b = R(-.5, .5), sg = f % 2 ? .5 : -.5;
        return f < 2 ? [c[0] + sg * w, c[1] + a * h, c[2] + b * d] : f < 4 ? [c[0] + a * w, c[1] + sg * h, c[2] + b * d] : [c[0] + a * w, c[1] + b * h, c[2] + sg * d]; } }; };
    const ring = (c, r, th, axis) => ({ a: TAU * r * Math.max(th, .02) * 2.2, s: () => { const g = R(0, TAU), rr = r + R(-th, th), o = R(-th, th), x = Math.cos(g) * rr, y = Math.sin(g) * rr; return axis === 'y' ? [c[0] + x, c[1] + o, c[2] + y] : [c[0] + x, c[1] + y, c[2] + o]; } });
    const shelves = (c, sz, n) => ({ a: sz[0] * sz[1] * 1.5, s: () => [c[0] + R(-.5, .5) * sz[0], c[1] - sz[1] / 2 + (Math.floor(Math.random() * n) + .5) * sz[1] / n, c[2]] });
    const edge = (p, q) => { const c = capsule(p, q, .005); c.a *= 9; return c; };                      // a thin drawn line
    const crops = (n, w, d, y) => ({ a: w * d * .55, s: () => [-w / 2 + (Math.floor(Math.random() * n) + .5) * w / n + R(-.012, .012), y + Math.random() * Math.random() * .1, R(-d / 2, d / 2)] });
    const xf = (parts, k, t) => parts.map(q => ({ a: q.a * k * k, s: () => { const v = q.s(); return [v[0] * k + t[0], v[1] * k + t[1], v[2] * k + t[2]]; } }));
    const both = f => [...f(1), ...f(-1)];
    const body = () => [sphere([0, .84, 0], .105), capsule([0, .72, 0], [0, .68, 0], .045), box([0, .46, 0], [.38, .4, .2]), box([0, .17, 0], [.3, .15, .18]),
      ...both(s => [sphere([s * .235, .62, 0], .068), capsule([s * .245, .6, 0], [s * .285, .32, .02], .05), capsule([s * .285, .3, .02], [s * .3, .04, .09], .042), sphere([s * .3, -.02, .1], .05),
        capsule([s * .095, .08, 0], [s * .105, -.36, .02], .07), sphere([s * .105, -.39, .02], .06), capsule([s * .105, -.42, .02], [s * .105, -.8, 0], .052), box([s * .105, -.87, .05], [.11, .06, .25])])];
    const armParts = () => [capsule([0, -.9, 0], [0, -.78, 0], .3), capsule([0, -.78, 0], [0, -.4, 0], .17), sphere([0, -.34, 0], .19), capsule([0, -.34, 0], [.1, .34, 0], .105), sphere([.1, .38, 0], .14),
      capsule([.1, .38, 0], [.62, .54, 0], .078), sphere([.66, .55, 0], .09), capsule([.66, .55, 0], [.8, .36, 0], .05), box([.83, .3, .05], [.03, .13, .03]), box([.83, .3, -.05], [.03, .13, .03])];
    const van = () => [box([0, -.3, 0], [1.56, .4, .68]), box([-.06, .08, 0], [1.02, .34, .6]), capsule([0, .27, 0], [0, .36, 0], .09),
      ...both(s => [ring([.5, -.52, s * .35], .15, .03), ring([-.5, -.52, s * .35], .15, .03), sphere([.74, -.14, s * .3], .04)])];
    const rackRow = () => [-.69, -.23, .23, .69].flatMap(x => [box([x, 0, 0], [.4, 1.6, .5]), shelves([x, 0, .254], [.34, 1.5], 21), shelves([x, 0, .254], [.34, 1.5], 21)]);
    const defs = {
      humanoid: () => [...body(), ring([0, -.9, 0], .55, .006, 'y')],
      home: () => [edge([-.82, -.9, -.3], [.82, -.9, -.3]), edge([.82, -.9, -.3], [.82, .42, -.3]), edge([.82, .42, -.3], [0, 1, -.3]), edge([0, 1, -.3], [-.82, .42, -.3]), edge([-.82, .42, -.3], [-.82, -.9, -.3]),
        edge([-.82, -.9, -.3], [-.82, -.9, .55]), edge([.82, -.9, -.3], [.82, -.9, .55]), edge([-.82, -.9, .55], [.82, -.9, .55]), edge([.3, -.9, -.3], [.3, -.2, -.3]), edge([.3, -.2, -.3], [.62, -.2, -.3]), edge([.62, -.2, -.3], [.62, -.9, -.3]),
        capsule([-.2, -.86, .12], [-.2, -.74, .12], .2), capsule([-.2, -.72, .12], [-.2, -.02, .12], .085), box([-.2, .12, .15], [.28, .2, .05]),
        capsule([-.2, -.16, .12], [.08, -.26, .26], .036), capsule([.08, -.26, .26], [.26, -.2, .3], .03), box([.34, -.19, .3], [.22, .02, .18]), capsule([.34, -.18, .3], [.34, -.08, .3], .04),
        ...both(k => [ring([-.2 + k * .15, -.86, .12], .05, .012)])],
      arm: () => [...armParts(), ring([0, -.92, 0], .52, .008, 'y')],
      medical: () => xf([box([0, -.8, 0], [.62, .16, .5]), capsule([0, -.72, 0], [0, .42, 0], .085), capsule([-.34, .5, 0], [.34, .5, 0], .05),
        ...[-.34, 0, .34].flatMap(x => [capsule([x, .5, 0], [x * 1.25, .62, .26], .04), sphere([x * 1.25, .62, .26], .055), capsule([x * 1.25, .62, .26], [x * 1.05, .2, .42], .034), sphere([x * 1.05, .2, .42], .045), capsule([x * 1.05, .2, .42], [x * .5, -.3, .5], .016)]),
        box([0, -.46, .56], [.9, .05, .46]), capsule([0, -.86, .56], [0, -.5, .56], .07), box([0, -.87, .56], [.4, .04, .3]), ring([0, -.9, .25], .98, .005, 'y')], 1, [0, 0, -.25]),
      racks: () => [...rackRow(), ring([0, -.82, 0], 1.25, .004, 'y')],
      farm: () => [box([0, -.3, 0], [.9, .2, .46]), box([-.12, -.03, 0], [.36, .36, .4]), box([.27, -.19, 0], [.34, .15, .36]), ...both(s => [ring([-.3, -.46, s * .3], .25, .035), ring([.34, -.55, s * .28], .16, .03)]),
        capsule([-.66, -.5, -.82], [-.66, -.5, .82], .028), ...[-.7, -.35, 0, .35, .7].map(z => capsule([-.66, -.5, z], [-.66, -.68, z], .014)), capsule([-.12, .15, 0], [-.12, .34, 0], .016), sphere([-.12, .38, 0], .045),
        crops(11, 2.5, 1.9, -.74), crops(11, 2.5, 1.9, -.74)],
      warehouse: () => [...[-.78, -.26, .26, .78].flatMap(x => [-.2, .2].map(z => capsule([x, -.86, z], [x, .8, z], .014))), ...[-.5, -.08, .34, .76].map(y => box([0, y, 0], [1.6, .02, .44])),
        ...[[-.52, -.5], [0, -.5], [.52, -.5], [-.52, -.08], [.52, -.08], [0, .34], [-.52, .34], [.52, .34]].map(([x, y]) => box([x + R(-.04, .04), y + .12, 0], [.28, .22, .32])),
        box([.1, -.78, .68], [.46, .12, .32]), box([.1, -.62, .68], [.26, .2, .24]), ring([-.06, -.84, .86], .05, .012), ring([.26, -.84, .86], .05, .012)],
      hotel: () => [capsule([.5, -.8, .1], [.5, .02, .1], .2), sphere([.5, .2, .1], .17), box([.5, -.2, .31], [.22, .26, .02]), ring([.5, -.9, .1], .3, .006, 'y'),
        box([-.42, -.62, 0], [.74, .05, .42]), ...both(s => [ring([-.7, -.76, s * .19], .07, .015), ring([-.14, -.76, s * .19], .07, .015)]),
        edge([-.76, -.6, 0], [-.76, .34, 0]), edge([-.08, -.6, 0], [-.08, .34, 0]), edge([-.76, .34, 0], [-.6, .56, 0]), edge([-.6, .56, 0], [-.24, .56, 0]), edge([-.24, .56, 0], [-.08, .34, 0]),
        box([-.56, -.4, 0], [.3, .38, .26]), box([-.25, -.45, 0], [.24, .28, .22]), box([-.5, -.12, 0], [.22, .16, .2]), sphere([-.42, .56, 0], .035)],
      quadruped: () => [box([0, .02, 0], [.92, .2, .3]), box([.56, .1, 0], [.2, .17, .22]), sphere([.68, .12, 0], .05), capsule([-.46, .1, 0], [-.6, .26, 0], .025),
        ...both(s => [capsule([.34, -.06, s * .19], [.24, -.42, s * .2], .05), capsule([.24, -.42, s * .2], [.38, -.84, s * .2], .04), sphere([.38, -.87, s * .2], .05),
          capsule([-.34, -.06, s * .19], [-.46, -.42, s * .2], .05), capsule([-.46, -.42, s * .2], [-.32, -.84, s * .2], .04), sphere([-.32, -.87, s * .2], .05)]), ring([0, -.92, 0], .8, .005, 'y')],
      bots: () => { const bot = () => [box([0, -.5, 0], [.56, .34, .36]), box([0, -.3, 0], [.5, .06, .32]), ...both(s => [-.2, 0, .2].map(x => ring([x, -.72, s * .2], .09, .02))), edge([-.22, -.28, 0], [-.22, .1, 0]), sphere([-.22, .12, 0], .03)];
        return [...xf(bot(), .58, [-.56, -.2, -.4]), ...xf(bot(), .58, [-.02, -.2, -.02]), ...xf(bot(), .58, [.5, -.2, .3]), ...xf(bot(), .58, [-.3, -.2, .5]), ring([0, -.64, .06], .98, .005, 'y')]; },
      gantry: () => [...both(s => [capsule([-.82, -.9, s * .38], [-.82, .62, s * .38], .028), capsule([.82, -.9, s * .38], [.82, .62, s * .38], .028), capsule([-.82, .62, s * .38], [.82, .62, s * .38], .03)]),
        capsule([.18, .62, -.38], [.18, .62, .38], .04), capsule([.18, .62, 0], [.18, .08, 0], .035), box([.18, .02, 0], [.22, .06, .22]), box([.18, -.14, 0], [.2, .2, .2]),
        box([0, -.56, 0], [1.9, .06, .42]), ...[-.8, 0, .8].map(x => capsule([x, -.56, 0], [x, -.9, 0], .03)), ...[-.66, -.24, .62].map(x => box([x, -.43, 0], [.2, .2, .2]))],
      gpu: () => { const w = .86, d = .5, y0 = -.62, y1 = .12, c = [[-w, -d], [w, -d], [w, d], [-w, d]], xs = [-.6, -.36, -.12, .12, .36, .6];
        return [box([0, y0, 0], [w * 2, .03, d * 2]), ...c.map(([x, z]) => edge([x, y0, z], [x, y1, z])), ...c.map(([x, z], i) => edge([x, y1, z], [c[(i + 1) % 4][0], y1, c[(i + 1) % 4][1]])),
          ...xs.flatMap(x => [box([x, -.28, -.08], [.05, .56, .66]), edge([x, 0, -.41], [x, 0, .25]), edge([x, -.56, -.41], [x, 0, -.41]), edge([x, -.56, .25], [x, 0, .25])]),
          ...[-.56, 0, .56].flatMap(x => [ring([x, -.26, d], .21, .022), ring([x, -.26, d], .06, .02)]), ring([0, -.7, 0], 1, .005, 'y')]; },
      dualarm: () => [box([0, -.62, 0], [.5, .56, .4]), capsule([0, -.34, 0], [0, .3, 0], .12), capsule([-.3, .32, 0], [.3, .32, 0], .07), box([0, .5, .04], [.3, .12, .12]),
        ...both(k => [sphere([k * .32, .32, 0], .085), capsule([k * .32, .32, 0], [k * .44, .02, .22], .05), sphere([k * .44, 0, .23], .06), capsule([k * .44, 0, .23], [k * .2, -.2, .52], .04), box([k * .18, -.24, .56], [.03, .1, .03])]),
        box([0, -.34, .62], [1.1, .04, .5]), box([0, -.24, .6], [.2, .16, .2]), ...both(k => [capsule([k * .5, -.36, .82], [k * .5, -.9, .82], .025), capsule([k * .5, -.36, .42], [k * .5, -.9, .42], .025)]), ring([0, -.9, .2], .98, .005, 'y')],
    };
    return names.map(name => {
      const parts = (defs[name] || defs.humanoid)(), total = parts.reduce((x, q) => x + q.a, 0), pts = [];
      for (const q of parts) { const n = Math.max(4, Math.round(N * q.a / total)); for (let i = 0; i < n; i++) pts.push(q.s()); }
      while (pts.length < N) pts.push(parts[(Math.random() * parts.length) | 0].s()); pts.length = N;
      pts.sort((a, b) => a[1] - b[1]);                       // by height, so each point travels to a nearby part of the next figure
      const out = new Float32Array(N * 3); pts.forEach((q, i) => { out[i * 3] = q[0]; out[i * 3 + 1] = q[1]; out[i * 3 + 2] = q[2]; }); return out;
    });
  }
  class Cloud {
    constructor(el) {
      this.el = el; this.canvas = $('canvas', el); this.ctx = this.canvas.getContext('2d');
      const names = (el.dataset.shapes || 'farm,arm,warehouse,racks,hotel,home').split(',');
      this.N = +el.dataset.points || (small.matches ? 2600 : 7200); this.shapes = cloudShapes(this.N, names); this.zoom = +el.dataset.zoom || 1;
      this.delay = new Float32Array(this.N); this.kind = new Uint8Array(this.N); this.buf = new Float32Array(this.N * 4);
      for (let i = 0; i < this.N; i++) { this.delay[i] = Math.random(); this.kind[i] = Math.random() < .11 ? 1 : 0; }
      const scope = el.closest('[data-pin]'); this.items = scope ? $$('[data-cloud-item]', scope) : [];
      this.a = 0; this.b = 0; this.k = 0; this.spin = +el.dataset.spin || 0; this.auto = true; this.cur = -1; this.visible = false; this.running = false;
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.loop(); }, { threshold: .02 }).observe(el);
      this.size(); this.label(0); this.draw(0);
    }
    size() { const r = this.el.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); if (!r.width) return; this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d); this.dpr = d; }
    label(i) { if (i === this.cur) return; this.cur = i; this.items.forEach((it, k) => it.classList.toggle('on', k === i)); }
    setF(f) { const n = this.shapes.length - 1; f = clamp(f, 0, n); this.a = Math.min(n, Math.floor(f)); this.b = Math.min(n, this.a + 1); this.k = f - this.a; this.label(Math.round(f)); }
    loop() {
      if (this.running) return; this.running = true;
      const step = t => {
        if (!this.visible) { this.running = false; return; }
        if (this.auto && !reduced && this.shapes.length > 1) { const n = this.shapes.length, c = t / 4600, i = Math.floor(c) % n, k = clamp((c - Math.floor(c) - .66) / .34); this.a = i; this.b = (i + 1) % n; this.k = k; this.label(k > .5 ? this.b : this.a); }
        this.draw(reduced ? 0 : t); requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    draw(t) {
      const { ctx, canvas, N, buf } = this, A = this.shapes[this.a], B = this.shapes[this.b], k = this.k, w = canvas.width, h = canvas.height, sc = Math.min(w, h) * .5 * this.zoom, cx = w / 2, cy = h * .5;
      const yaw = t * .00021 + this.spin, cs = Math.cos(yaw), sn = Math.sin(yaw), ct = Math.cos(-.17), st = Math.sin(-.17), scan = Math.sin(t * .0008) * 1.05;
      for (let i = 0; i < N; i++) {
        const j = i * 3, d = this.delay[i], kk = clamp(k * 1.7 - d * .7), e = kk * kk * (3 - 2 * kk), sw = Math.sin(e * Math.PI) * .24;
        const x = A[j] + (B[j] - A[j]) * e + Math.sin(d * 40 + t * .001) * sw, y = A[j + 1] + (B[j + 1] - A[j + 1]) * e, z = A[j + 2] + (B[j + 2] - A[j + 2]) * e + Math.cos(d * 31) * sw;
        const x1 = x * cs + z * sn, z1 = -x * sn + z * cs, y1 = y * ct - z1 * st, z2 = y * st + z1 * ct, pr = 3.2 / (3.2 - z2), near = Math.abs(y - scan) < .03, o = i * 4;
        buf[o] = cx + x1 * sc * pr; buf[o + 1] = cy - y1 * sc * pr; buf[o + 2] = (this.kind[i] ? 2.2 : 1.35) * pr * this.dpr * (near ? 1.6 : 1); buf[o + 3] = Math.min(1, clamp(.34 + (z2 + 1) * .4) * (near ? 1.7 : 1)) * (this.kind[i] || near ? -1 : 1);
      }
      ctx.clearRect(0, 0, w, h);
      for (let pass = 0; pass < 2; pass++) { ctx.fillStyle = pass ? '#fcd454' : '#f4f3ef';
        for (let i = 0; i < N; i++) { const o = i * 4, a = buf[o + 3]; if ((a < 0) !== !!pass) continue; const s = buf[o + 2]; ctx.globalAlpha = Math.abs(a); ctx.fillRect(buf[o] - s / 2, buf[o + 1] - s / 2, s, s); } }
      ctx.globalAlpha = 1;
    }
  }
  const clouds = $$('[data-cloud]').map(el => (el._cloud = new Cloud(el)));

  /* ----- Opening: real footage held back in the dark. A frame of light follows the machine, and inside the frame the
           picture is clear: the frame is the cover. The pointer carries it; scrolling widens it until it takes in everything. ----- */
  class Cover {
    constructor(el) {
      this.el = el; this.canvas = $('canvas', el); this.ctx = this.canvas.getContext('2d'); this.poster = $('.cover-poster img', el) || $('img.cover-poster', el);
      this.clips = $$('.cover-film', el).map(v => ({ v, flip: !small.matches && v.hasAttribute('data-flip'), track: ((small.matches && v.dataset.trackM) || v.dataset.track).split(';').map(k => k.split(',').map(Number)) }));
      Object.assign(this, { i: 0, box: null, pp: 0, px: 0, py: 0, moved: -1e9, swap: -1e9, visible: false, running: false });
      el.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; this.px = e.clientX; this.py = e.clientY; this.moved = performance.now(); });
      el.addEventListener('pointerleave', () => { this.moved = -1e9; });
      this.clips.forEach((c, k) => c.v.addEventListener('ended', () => { if (k === this.i) this.next(); }));
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.loop(); else this.clips[this.i].v.pause(); }, { threshold: .02 }).observe(el);
      this.poster?.addEventListener('load', () => this.draw(performance.now()));
      this.size();
    }
    size() { const r = this.canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5); if (!r.width) return; this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d); this.dpr = d; this.draw(performance.now()); }
    start(c) { prime(c.v); c.v.loop = this.clips.length < 2; c.v.play().catch(() => {}); }
    next() {
      const prev = this.clips[this.i]; this.i = (this.i + 1) % this.clips.length; const cur = this.clips[this.i];
      try { cur.v.currentTime = 0; } catch {} this.start(cur); prev.v.classList.remove('on'); cur.v.classList.add('on'); this.swap = performance.now();
    }
    loop() {
      if (this.running) return; if (reduced) { this.draw(performance.now()); return; }
      this.running = true; this.start(this.clips[this.i]);
      const step = now => {
        if (!this.visible || reduced) { this.running = false; return; }
        const r = this.el.getBoundingClientRect(), total = r.height - innerHeight; this.pp = total > 0 ? clamp(-r.top / total) : 0; this.el.style.setProperty('--pp', this.pp.toFixed(4));
        const c = this.clips[this.i], n = this.clips[(this.i + 1) % this.clips.length]; if (n !== c && c.v.currentTime > 1.2 && !n.v.dataset.ready) { prime(n.v); n.v.loop = false; n.v.load(); }
        this.draw(now); requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    draw(now) {
      const { ctx, canvas } = this, W = canvas.width, H = canvas.height, d = this.dpr || 1; if (!W) return;
      const c = this.clips[this.i], live = c.v.readyState >= 2, src = live ? c.v : (this.i === 0 && this.poster && this.poster.complete && this.poster.naturalWidth ? this.poster : null);
      ctx.clearRect(0, 0, W, H); if (!src) return;
      const vw = live ? c.v.videoWidth : src.naturalWidth, vh = live ? c.v.videoHeight : src.naturalHeight, sc = Math.max(W / vw, H / vh), dw = vw * sc, dh = vh * sc, ox = (W - dw) / 2, oy = (H - dh) / 2;
      // where the machine is in this film, at this moment
      const t = live ? c.v.currentTime : 0, tr = c.track; let k = 0; while (k < tr.length - 2 && t > tr[k + 1][0]) k++;
      const A = tr[k], B = tr[Math.min(k + 1, tr.length - 1)], u = B[0] > A[0] ? clamp((t - A[0]) / (B[0] - A[0])) : 0, mix = j => A[j] + (B[j] - A[j]) * u;
      let cx = ox + mix(1) * dw, cy = oy + mix(2) * dh; const bw = clamp(mix(3) * dw, 150 * d, W * .96), bh = clamp(mix(4) * dh, 190 * d, H * .9);
      const held = now - this.moved < 2400 && this.pp < .04; if (held) { cx = this.px * d; cy = this.py * d; }
      cx = clamp(cx, bw / 2 + 10 * d, W - bw / 2 - 10 * d); cy = clamp(cy, bh / 2 + 10 * d, H - bh / 2 - 10 * d);
      const b = this.box || (this.box = [cx, cy, bw, bh]), ease = held ? .2 : .085; b[0] += (cx - b[0]) * ease; b[1] += (cy - b[1]) * ease; b[2] += (bw - b[2]) * .1; b[3] += (bh - b[3]) * .1;
      const sw = clamp((now - this.swap) / 700), pulse = sw < 1 ? 1 - .14 * Math.sin(Math.PI * sw) : 1, e = clamp(this.pp / .78), g = e * e * (3 - 2 * e);
      const w = b[2] * pulse + (W - b[2] * pulse) * g, h = b[3] * pulse + (H - b[3] * pulse) * g, x = (b[0] - b[2] * pulse / 2) * (1 - g), y = (b[1] - b[3] * pulse / 2) * (1 - g), rad = 14 * d * (1 - g);
      const path = () => { ctx.beginPath(); ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad); ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath(); };
      ctx.save(); path(); ctx.clip(); if (c.flip) { ctx.translate(W, 0); ctx.scale(-1, 1); } ctx.drawImage(src, ox, oy, dw, dh); ctx.restore();
      const a = 1 - clamp(g * 1.5); if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a * .9; ctx.strokeStyle = '#fcd454'; ctx.lineWidth = 1.1 * d; ctx.shadowColor = 'rgba(252,212,84,.55)'; ctx.shadowBlur = 22 * d; path(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = a; ctx.lineWidth = 2.6 * d; ctx.lineCap = 'round'; const L = Math.min(26 * d, w * .16), q = 7 * d;          // corner marks
      for (const [sx, sy] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const X = x - q + sx * (w + 2 * q), Y = y - q + sy * (h + 2 * q), dx = sx ? -1 : 1, dy = sy ? -1 : 1; ctx.beginPath(); ctx.moveTo(X + dx * L, Y); ctx.lineTo(X, Y); ctx.lineTo(X, Y + dy * L); ctx.stroke(); }
      ctx.restore();
    }
  }
  const covers = $$('[data-cover]').map(el => new Cover(el));

  /* ----- Scroll engine: one rAF loop feeds CSS variables and scene state ----- */
  const exits = $$('[data-exit]');            // --p: 0 → 1 as the element leaves past the top
  const scrubs = $$('[data-scrub]');          // --p: 0 → 1 while the element travels through the viewport
  const views = $$('[data-view]');            // --v: where the element centre sits in the viewport (parallax)
  const grows = $$('[data-grow]');            // --g: 0 → 1 as the element rises into view (frame opens)
  const blooms = $$('[data-bloom]');          // --c: 0 → 1 colour arrives
  const statements = $$('[data-words]').filter(el => !el.closest('[data-pin]'));
  const roads = $$('.road2');
  const hows = $$('[data-how],[data-focus]').map(el => ({ rows: $$('.hrow,[data-focus-item]', el), imgs: $$('.how-media img', el), cur: -1 }));
  const pins = $$('[data-pin]').map(el => ({
    el, stage: $('.pin-stage', el), at: $$('[data-at]', el).map(e => ({ e, v: +e.dataset.at })), steps: $$('[data-step]', el), card: $('[data-card]', el),
    words: $$('[data-words]', el), seqs: $$('[data-seq]', el), rail: $('[data-rail]', el), panels: $$('.panel', el), bar: $('[data-rail-bar]', el), count: $('[data-rail-count]', el),
    film: $('.pin-media video[data-ambient-pin]', el), cloud: $('[data-cloud][data-cloud-scroll]', el)?._cloud, stageN: -1, active: -1
  }));
  function setPanel(pin, idx) {
    if (pin.active === idx) return; pin.active = idx;
    pin.panels.forEach((p, i) => { const on = i === idx; p.classList.toggle('is-active', on); p.classList.toggle('is-color', on); const v = $('video', p); if (v) { if (on) playFilm(v); else v.pause(); } });
    if (pin.count) pin.count.textContent = String(idx + 1).padStart(2, '0');
  }
  let ticking = false;
  function frame() {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    headerTick(y);
    for (const el of exits) { const r = el.getBoundingClientRect(); el.style.setProperty('--p', reduced ? 0 : clamp(-r.top / (r.height * .9)).toFixed(4)); }
    for (const el of scrubs) { const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) continue; el.style.setProperty('--p', reduced ? .6 : clamp((vh - r.top) / (vh + r.height)).toFixed(4)); }
    for (const el of views) { const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) continue; el.style.setProperty('--v', reduced ? .5 : clamp((r.top + r.height / 2) / vh, -.3, 1.3).toFixed(4)); }
    for (const el of grows) { const r = el.getBoundingClientRect(); if (r.top > vh + 100) continue; el.style.setProperty('--g', reduced ? 1 : clamp((vh - r.top) / (vh * .82)).toFixed(4)); }
    for (const el of blooms) { const r = el.getBoundingClientRect(); if (r.top > vh + 100) continue; el.style.setProperty('--c', reduced ? 1 : clamp((vh * .62 - r.top) / (vh * .55)).toFixed(4)); }
    for (const s of freeSeqs) { const r = s.el.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) continue; s.draw(clamp((vh - r.top) / (vh + r.height))); }
    for (const el of statements) { const r = el.getBoundingClientRect(); light(el, reduced ? 1 : clamp((vh * .86 - r.top) / (vh * .5 + r.height))); }
    for (const el of roads) {
      const r = el.getBoundingClientRect(), p = reduced ? 1 : clamp((vh * .82 - r.top) / (vh * .5)); el.style.setProperty('--p', p.toFixed(4));
      const items = $$('li', el); items.forEach((li, i) => li.classList.toggle('reached', i > 0 && p > i / items.length + .06));
    }
    for (const h of hows) {
      let best = 0, dist = 1e9; h.rows.forEach((row, i) => { const r = row.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh * .5); if (d < dist) { dist = d; best = i; } });
      if (h.cur !== best) { h.cur = best; h.rows.forEach((row, i) => row.classList.toggle('on', i === best)); h.imgs.forEach((im, i) => im.classList.toggle('on', i === best)); }
    }
    for (const pin of pins) {
      const r = pin.el.getBoundingClientRect(); if (r.bottom < -vh || r.top > vh * 2) continue;
      const pinned = wide.matches && !reduced, total = r.height - vh;
      const p = pinned ? (total > 0 ? clamp(-r.top / total) : 0) : 1;
      pin.el.style.setProperty('--pp', p.toFixed(4));
      pin.el.style.setProperty('--enter', pinned ? clamp((vh - r.top) / vh).toFixed(4) : 1);
      for (const t of pin.at) t.e.classList.toggle('on', p >= t.v);
      if (pin.steps.length) {
        const n = pin.steps.length, stage = !pinned ? n : (r.top > vh * .45 ? 0 : Math.min(n, 1 + Math.floor(p * n * .999)));
        if (stage !== pin.stageN) { pin.stageN = stage; pin.steps.forEach((s, i) => s.classList.toggle('on', !pinned || i === Math.max(0, stage - 1))); if (pin.card) pin.card.className = pin.card.className.replace(/\bs\d\b/g, '').trim() + ' s' + stage; }
      }
      for (const el of pin.words) { const [a, b] = (el.dataset.range || '0,.55').split(',').map(Number); if (pinned) light(el, span(p, a, b)); else { const wr = el.getBoundingClientRect(); light(el, reduced ? 1 : clamp((vh * .86 - wr.top) / (vh * .5 + wr.height))); } }
      for (const el of pin.seqs) { const [a, b] = (el.dataset.range || '0,1').split(',').map(Number); if (pinned) el._seq.draw(span(p, a, b)); }
      if (pin.cloud) { pin.cloud.auto = !pinned; if (pinned) { pin.cloud.setF(span(p, .05, .95) * (pin.cloud.shapes.length - 1)); pin.cloud.spin = p * 2.6; } }
      if (pin.film) { if (r.top < vh && r.bottom > 0 && !pinned) playFilm(pin.film); else pin.film.pause(); }
      if (pin.rail && pinned) {
        const q = span(p, .05, .93), max = Math.max(0, pin.rail.scrollWidth - pin.stage.clientWidth);
        pin.rail.style.transform = `translate3d(${(-q * max).toFixed(1)}px,0,0)`;
        if (pin.bar) pin.bar.style.transform = `scaleX(${q.toFixed(4)})`;
        setPanel(pin, Math.min(pin.panels.length - 1, Math.round(q * (pin.panels.length - 1))));
      }
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { seqs.forEach(s => { s.size(); s.draw(s.p, true); }); clouds.forEach(c => c.size()); covers.forEach(v => v.size()); onScroll(); });
  wide.addEventListener('change', () => { pins.forEach(pin => { if (pin.rail) pin.rail.style.transform = ''; }); onScroll(); });
  doc.addEventListener('indem-motion', onScroll);
  doc.addEventListener('indem-motion', () => covers.forEach(v => { if (reduced) v.clips.forEach(c => c.v.pause()); else if (v.visible) v.loop(); }));

  /* Swipe row on small screens: the centred panel becomes the active one */
  pins.filter(pin => pin.rail).forEach(pin => {
    const railIO = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting && !(wide.matches && !reduced)) setPanel(pin, pin.panels.indexOf(e.target)); }), { root: pin.rail, threshold: .6 });
    pin.panels.forEach(p => railIO.observe(p));
  });

  /* ----- Film reel (hero): one film plays at a time, cross-fades to the next ----- */
  $$('[data-reel]').forEach(reel => {
    const host = reel.closest('[data-reel-host]') || reel.parentElement;
    const slides = $$('.reel-slide', reel), tabs = $$('[data-reel-tab]', host), toggle = $('[data-reel-toggle]', host);
    let index = 0, timer = 0, visible = true, userPaused = false, started = 0, remaining = 0;
    const DUR = 5600, videoOf = s => $('video', s);
    const canRun = () => visible && !userPaused && !reduced && !doc.hidden;
    function show(i) {
      clearTimeout(timer); index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle('is-active', k === index); const v = videoOf(s); if (v && k !== index) v.pause(); });
      tabs.forEach((t, k) => { t.classList.toggle('is-active', k === index); t.classList.toggle('is-done', k < index); t.setAttribute('aria-current', k === index ? 'true' : 'false'); });
      prime(videoOf(slides[index])); prime(videoOf(slides[(index + 1) % slides.length]));
      remaining = DUR; run();
    }
    function run() {
      clearTimeout(timer); host.classList.toggle('is-paused', !canRun());
      const v = videoOf(slides[index]);
      if (!canRun()) { v?.pause(); return; }
      v?.play().catch(() => {});
      started = performance.now(); timer = setTimeout(() => show(index + 1), remaining);
    }
    function hold() { if (started) { remaining = Math.max(600, remaining - (performance.now() - started)); started = 0; } clearTimeout(timer); host.classList.add('is-paused'); videoOf(slides[index])?.pause(); }
    tabs.forEach((t, k) => t.addEventListener('click', () => show(k)));
    toggle?.addEventListener('click', () => { userPaused = !userPaused; toggle.setAttribute('aria-label', userPaused ? 'Play film' : 'Pause film'); userPaused ? hold() : run(); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? run() : hold(); }, { threshold: .15 }).observe(reel);
    doc.addEventListener('visibilitychange', () => doc.hidden ? hold() : run());
    doc.addEventListener('indem-motion', () => reduced ? hold() : run());
    host.style.setProperty('--dur', DUR + 'ms');
    show(0);
  });

  /* ----- Ambient films: play only while on screen ----- */
  const ambient = $$('video[data-ambient]');
  const ambientIO = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting && !reduced) playFilm(e.target); else e.target.pause(); }), { threshold: .2 });
  ambient.forEach(v => ambientIO.observe(v));
  doc.addEventListener('indem-motion', () => { if (reduced) $$('video').forEach(v => v.pause()); });
  /* Films inside a module play while the pointer is over it */
  $$('[data-hover-film]').forEach(box => { const v = $('video', box); if (!v) return; box.addEventListener('pointerenter', () => playFilm(v)); box.addEventListener('pointerleave', () => v.pause()); });

  /* ----- Black and white until touched: on touch screens, colour arrives as a module reaches the middle ----- */
  if (!canHover) {
    const hueIO = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-color', e.isIntersecting)), { rootMargin: '-34% 0px -34% 0px' });
    $$('.film:not(.bg)').forEach(el => { if (!el.closest('.panel')) hueIO.observe(el); });
  }

  /* ----- Dialogs (media credits, data & privacy) ----- */
  $$('[data-open]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.open)?.showModal()));
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
  });
  const openCredits = () => { const d = $('#credits'); if (location.hash === '#credits' && d && !d.open) d.showModal(); };
  openCredits(); addEventListener('hashchange', openCredits);

  root.classList.remove('no-js');
  applyMotion();
  requestAnimationFrame(() => { root.classList.add('ready'); frame(); });
})();
