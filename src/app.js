// Scores come from the released packages, pinned to exact versions.
import * as OKCA3 from 'https://cdn.jsdelivr.net/npm/@pawn002/okca@3.0.0/dist/esm/index.js';
import * as OKCA2 from 'https://cdn.jsdelivr.net/npm/@pawn002/okca@2.0.3/dist/esm/index.js';

const TAGS = ['candor-badge', 'candor-heading', 'candor-text', 'candor-card', 'candor-switch', 'candor-radio', 'candor-input', 'candor-button', 'candor-slider', 'candor-table', 'candor-accessible-text', 'candor-code', 'candor-tabs', 'candor-tab-panel'];
await Promise.all(TAGS.map((t) => customElements.whenDefined(t)));
// Stopgap for pawn002/candor#376: in dark mode a checked candor-switch's deep track has no edge against the page
// (OKCA 1.4 vs the 3.0 non-text floor). Give it the off state's control edge until Candor ships the fix.
const switchEdge = new CSSStyleSheet();
switchEdge.replaceSync('@media (prefers-color-scheme: dark) { .switch-input:checked + .switch-track { border-color: var(--color-border-control); } }');
for (const sw of document.querySelectorAll('candor-switch')) { await sw.updateComplete; sw.shadowRoot?.adoptedStyleSheets.push(switchEdge); }

// The veil fraction of OKCA 3.0.0's scatter observer (SCATTER_K in the package). Used only to draw
// the veiled samples; every scatter score comes from the package itself.
const FULL = 0.155;
const $ = (id) => document.getElementById(id);
const TRIO = [
  { fg: '#767676', bg: '#ffffff', tag: 'Just passes WCAG AA' },
  { fg: '#2f2f2f', bg: '#ffffff', tag: 'Darker text' },
  { fg: '#ffffff', bg: '#767676', tag: 'Same greys, reversed' },
];
const PRESETS = [
  ['#767676', '#ffffff', '#767676 on white'],
  ['#ffffff', '#767676', 'White on #767676'],
  ['#ff69b4', '#1a1a1a', 'Hot pink on #1a1a1a'],
  ['#ffffff', '#ff8c00', 'White on orange'],
  ['#1d4ed8', '#ffffff', 'Blue-700 on white'],
  ['#cccccc', '#333333', '#cccccc on #333333'],
];
const state = { a: '#767676', b: '#ffffff', k: FULL, sim: true, reader: 'aa', chroma: 0, hue: 0, bChroma: 0, bHue: 0, tRange: [0, 1], bRange: [0, 1] };

const norm = (v) => { const m = String(v).trim().toLowerCase().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/); if (!m) return null; return '#' + (m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]); };
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const enc = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const toHex = (rgb) => '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, enc(c))) * 255).toString(16).padStart(2, '0')).join('');
const lum = (h) => { const c = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const wcag = (f, b) => { const x = lum(f), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// OKLab -> linear sRGB (Ottosson). Builds slider colours only; every score comes from the OKCA builds.
const labToLin = (L, a, b) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
};
const inGamut = (rgb) => rgb.every((c) => c >= -1e-6 && c <= 1 + 1e-6);
const colourAt = (L, chroma, hue) => { // hold L and hue, pull chroma inward to the sRGB boundary
  const at = (c) => labToLin(L, c * Math.cos(hue), c * Math.sin(hue));
  if (inGamut(at(chroma))) return toHex(at(chroma));
  let lo = 0, hi = chroma;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (inGamut(at(m))) lo = m; else hi = m; }
  return toHex(at(lo));
};
// Hex input is quantised to 8 bits, so its own chroma can sit a hair outside the boundary; allow that hair.
const inGamutLoose = (L, chroma, hue) => labToLin(L, chroma * Math.cos(hue), chroma * Math.sin(hue)).every((c) => c >= -2e-3 && c <= 1 + 2e-3);
// The lightnesses at which this chroma and hue fit in sRGB: the run of in-gamut L containing L0.
// Chroma is held, so a saturated colour can only travel this far before it would have to lose colour.
const lightRange = (chroma, hue, L0) => {
  if (chroma < 1e-4) return [0, 1];
  const ok = (L) => inGamutLoose(L, chroma, hue);
  const step = 0.001; let lo = L0, hi = L0;
  while (lo - step >= 0 && ok(lo - step)) lo -= step;
  while (hi + step <= 1 && ok(hi + step)) hi += step;
  return [+lo.toFixed(3), +hi.toFixed(3)];
};
const textAt = (L) => colourAt(L, state.chroma, state.hue);
const bgAt = (L) => colourAt(L, state.bChroma, state.bHue);
const veiled = (fg, bg, k) => toHex([1, 3, 5].map((i) => { const t = lin(parseInt(fg.slice(i, i + 2), 16) / 255), b = lin(parseInt(bg.slice(i, i + 2), 16) / 255); return (t + k * b) / (1 + k); }));
const okca = (fg, bg, k) => OKCA3.contrast(fg, bg, k > 0 ? { observer: 'scatter' } : undefined);
const verdict = (v) => (v >= 7 ? ['success', 'Passes AAA'] : v >= 4.5 ? ['success', 'Passes AA'] : v >= 3 ? ['warning', 'Large text only'] : ['error', 'Fails']);
const badge = (v) => { const [variant, text] = verdict(v); const el = document.createElement('candor-badge'); el.setAttribute('size', 'sm'); el.setAttribute('variant', variant); el.textContent = text; return el; };
// One spectrum, two points on it: the 20/80 reader has everything the 20/40 reader has, and more.
// Its own scatter is not measured, so the 80-year-old veil stands in as a floor.
const READERS = { aa: { blur: 1.6, target: 4.5, enlarge: false, acuity: '20/40' }, aaa: { blur: 3.1, target: 7, enlarge: true, acuity: '20/80' } };
const R_ = () => READERS[state.reader];
const readerBadge = (v) => { const ok = v >= R_().target; const b = document.createElement('candor-badge'); b.setAttribute('size', 'sm'); b.setAttribute('variant', ok ? 'success' : 'error'); b.textContent = ok ? 'Enough' : 'Not enough'; return b; };
const el = (tag, attrs = {}, text) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };

function sample(fg, bg, k) {
  const on = state.sim, r = R_();
  const kk = k;
  const enlarged = on && r.enlarge;
  const box = el('div', { class: enlarged ? 'sample enlarged' : 'sample' });
  box.style.background = bg;
  box.style.color = on && kk > 0 ? veiled(fg, bg, kk) : fg;
  const seen = el('div', { class: 'stack-tight' });
  if (on) { seen.style.filter = `blur(${r.blur}px)`; seen.setAttribute('aria-hidden', 'true'); }
  seen.append(el('span', { class: 'big' }, 'The quick brown fox'), el('span', { class: 'small' }, `Body text at ${enlarged ? 32 : 16} px, ${fg} on ${bg}.`));
  box.append(seen);
  if (on) box.append(el('span', { class: 'sr-only' }, `${fg} on ${bg}, shown as this reader sees it.`));
  const wrap = el('div', { class: 'stack-tight' });
  const note = !on ? 'As displayed.' : `${r.acuity} blur${r.enlarge ? ', text doubled' : ''}${kk > 0 ? ', plus this eye\'s scatter veil.' : ', no veil.'}`;
  wrap.append(box, el('candor-accessible-text', { role_: 'annotation' }, note));
  return wrap;
}

function renderTrio() {
  const host = $('trio'); host.replaceChildren();
  TRIO.forEach((c, i) => {
    const w = wcag(c.fg, c.bg), e = okca(c.fg, c.bg, FULL);
    const card = el('candor-card', { variant: 'outlined', padding: 'sm', role: 'group', 'aria-labelledby': `trio-h-${i}` });
    const body = el('div', { class: 'stack' });
    const h = el('candor-heading', { level: 'h3', id: `trio-h-${i}` }, c.tag);
    const table = el('candor-table', { compact: '', 'numeric-columns': '[1]', caption: `Scores, ${c.fg} on ${c.bg}` });
    table.headers = ['Measure', 'Score', 'Verdict'];
    table.rows = [{ cells: ['WCAG 2.x', w.toFixed(2), badge(w)], isHeader: true }, { cells: ['This reader', e.toFixed(1), readerBadge(e)], isHeader: true }];
    const scroll = el('div', { class: 'table-scroll' }); scroll.append(table);
    body.append(sample(c.fg, c.bg, FULL), h, scroll, el('candor-accessible-text', { role_: 'annotation' }, `This reader needs ${R_().target.toFixed(1)}.`));
    card.append(body); host.append(card);
  });
}

function renderRows(fg, bg) {
  const w = wcag(fg, bg);
  const cur = state.k === 0 ? 2 : 3;
  const r = [
    ['WCAG 2.x', w, w.toFixed(2)],
    ['OKCA 2.0.3', OKCA2.contrast(fg, bg)],
    ['OKCA 3.0 default', okca(fg, bg, 0)],
    ['80-year-old eye, full display', okca(fg, bg, FULL)],
  ];
  const t = $('exp-table');
  t.caption = `Scores, ${fg} on ${bg}`;
  t.headers = ['Scorer', 'Score', 'Verdict'];
  t.rows = r.map(([n, v, txt], i) => ({ cells: [i === cur ? `${n} (chosen eye)` : n, txt || v.toFixed(1), badge(v)], isHeader: true }));
}

// The map: text lightness across, background lightness down (dark at the top), each at its colour's own hue.
// Recomputed only when something other than the two lightnesses changes; dragging a slider
// only moves the marker.
const EYE_NAME = { 0: 'default observer', [FULL]: '80-year-old eye' };
const MAP_N = 72;
let mapCache = { key: '', eye: null, wc: null };
const mapK = () => state.k;
function mapGrid() {
  const key = [state.chroma, state.hue, state.bChroma, state.bHue, mapK(), R_().target, state.tRange, state.bRange].join('|');
  if (mapCache.key === key) return mapCache;
  const N = MAP_N, T = R_().target, k = mapK();
  const texts = [], bgs = [];
  for (let i = 0; i < N; i++) { texts.push(textAt((i + 0.5) / N)); bgs.push(bgAt((i + 0.5) / N)); }
  const eye = new Uint8Array(N * N), wc = new Uint8Array(N * N), out = new Uint8Array(N * N);
  const inR = (i, [lo, hi]) => { const L = (i + 0.5) / N; return L >= lo - 0.5 / N && L <= hi + 0.5 / N; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { // y = background index, 0 = darkest
    if (!inR(x, state.tRange) || !inR(y, state.bRange)) { out[y * N + x] = 1; continue; }
    const t = texts[x], b = bgs[y];
    wc[y * N + x] = wcag(t, b) >= T ? 1 : 0;
    eye[y * N + x] = wc[y * N + x] && okca(t, b, k) >= T ? 1 : 0;
  }
  mapCache = { key, eye, wc, out };
  return mapCache;
}
function drawMap() { drawGrid($('map'), mapGrid(), [$('L').value, $('BL').value]); }
function drawGrid(cv, g, marker) {
  const dpr = window.devicePixelRatio || 1, W = Math.round(cv.clientWidth * dpr);
  if (!W) return;
  cv.width = cv.height = W;
  const N = MAP_N, c = cv.getContext('2d'), cell = W / N, tok = (n) => resolve(getComputedStyle(document.body).getPropertyValue(n).trim());
  c.fillStyle = tok('--color-bg-subtle'); c.fillRect(0, 0, W, W);
  c.fillStyle = tok('--color-icon-success');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g.eye[y * N + x]) c.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
  // Lightnesses this chroma cannot reach in sRGB: hatched, so the edge of the gamut reads as a wall.
  const hatch = document.createElement('canvas'); hatch.width = hatch.height = Math.round(8 * dpr);
  const hc = hatch.getContext('2d'); hc.fillStyle = tok('--color-bg-page'); hc.fillRect(0, 0, hatch.width, hatch.height);
  hc.strokeStyle = tok('--color-border-strong'); hc.lineWidth = dpr; hc.beginPath(); hc.moveTo(0, hatch.height); hc.lineTo(hatch.width, 0); hc.stroke();
  c.fillStyle = c.createPattern(hatch, 'repeat');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g.out[y * N + x]) c.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
  // WCAG boundary: an edge wherever a cell and its neighbour disagree.
  // Drawn over a page-coloured halo, so the line keeps its contrast where it meets the green cells.
  c.lineCap = 'round'; c.beginPath();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (g.out[y * N + x]) continue;
    const v = g.wc[y * N + x], px = x * cell, py = y * cell;
    if (x + 1 < N && !g.out[y * N + x + 1] && g.wc[y * N + x + 1] !== v) { c.moveTo(px + cell, py); c.lineTo(px + cell, py + cell); }
    if (y + 1 < N && !g.out[(y + 1) * N + x] && g.wc[(y + 1) * N + x] !== v) { c.moveTo(px, py + cell); c.lineTo(px + cell, py + cell); }
  }
  c.strokeStyle = tok('--color-bg-page'); c.lineWidth = 4 * dpr; c.stroke();
  c.strokeStyle = tok('--color-text-default'); c.lineWidth = 2 * dpr; c.stroke();
  if (!marker) return;
  const r = 7 * dpr, pad = r + 2 * dpr, clampXY = (v) => Math.min(W - pad, Math.max(pad, v)), hx = clampXY(marker[0] * W), hy = clampXY(marker[1] * W);
  c.lineWidth = 4 * dpr; c.strokeStyle = tok('--color-bg-page'); c.beginPath(); c.arc(hx, hy, r, 0, 2 * Math.PI); c.stroke();
  c.lineWidth = 2 * dpr; c.strokeStyle = tok('--color-text-default'); c.beginPath(); c.arc(hx, hy, r, 0, 2 * Math.PI); c.stroke();
}
function renderMap() {
  const g = mapGrid(), N = MAP_N, T = R_().target.toFixed(1);
  const eyeName = EYE_NAME[state.k];
  $('map-h').textContent = `Where the ${eyeName} reaches ${T}, this reader's threshold`;
  $('legend-eye').textContent = `Passes, ${eyeName}`;
  const share = (arr, lo, hi) => { let n = 0, p = 0; for (let y = 0; y < N; y++) { const L = (y + 0.5) / N; if (L < lo || L > hi) continue; for (let x = 0; x < N; x++) { if (g.out[y * N + x]) continue; n++; p += arr[y * N + x]; } } return n ? Math.round((100 * p) / n) : null; };
  const dE = share(g.eye, 0, 0.3), dW = share(g.wc, 0, 0.3), lE = share(g.eye, 0.8, 1), lW = share(g.wc, 0.8, 1);
  const part = (label, e, w) => (e === null ? `${label}, the background cannot keep its chroma, so there is nothing to score.` : `${label}, ${e}% of reachable text lightnesses reach ${T} for the ${eyeName}, against ${w}% for WCAG.`);
  const fmt = ([lo, hi]) => (hi - lo < 0.01 ? `L ${lo.toFixed(2)} only` : `L ${lo.toFixed(2)} to ${hi.toFixed(2)}`);
  const span = [state.chroma > 1e-4 ? `the text keeps its chroma ${state.tRange[1] - state.tRange[0] < 0.01 ? 'at' : 'between'} ${fmt(state.tRange)}` : '', state.bChroma > 1e-4 ? `the background keeps its chroma ${state.bRange[1] - state.bRange[0] < 0.01 ? 'at' : 'between'} ${fmt(state.bRange)}` : ''].filter(Boolean);
  $('map-read').textContent = `${part('On dark backgrounds (L 0.3 or below)', dE, dW)} ${part('On light backgrounds (L 0.8 or above)', lE, lW)} Hue and chroma are held; ${span.length ? span.join(', and ') + ', and the hatched area is out of reach in sRGB.' : 'both colours are neutral, so every lightness is reachable.'}`;
  const strip = (f, [lo, hi]) => { const cols = []; for (let i = 0; i <= 20; i++) cols.push(f(lo + ((hi - lo) * i) / 20)); return `linear-gradient(to right, ${cols.join(', ')})`; };
  $('L').gradient = strip(textAt, state.tRange); $('BL').gradient = strip(bgAt, state.bRange);
  drawMap();
}

// The open question: the two candidate answers on neutral greys, at AA. Fixed inputs, so each
// grid is computed once.
const FORK_PAIRS = [
  ['#000000', '#ffffff', 'Black on white'], ['#ffffff', '#000000', 'White on black'],
  ['#2f2f2f', '#ffffff', '#2f2f2f on white'], ['#ffffff', '#2f2f2f', 'White on #2f2f2f'],
  ['#333333', '#cccccc', '#333333 on #cccccc'], ['#cccccc', '#333333', '#cccccc on #333333'],
  ['#767676', '#ffffff', '#767676 on white'], ['#ffffff', '#767676', 'White on #767676'],
];
const forkCache = {};
function forkGrid(k) {
  if (forkCache[k]) return forkCache[k];
  const N = MAP_N, greys = []; for (let i = 0; i < N; i++) greys.push(colourAt((i + 0.5) / N, 0, 0));
  const eye = new Uint8Array(N * N), wc = new Uint8Array(N * N), out = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = greys[x], b = greys[y];
    wc[y * N + x] = wcag(t, b) >= 4.5 ? 1 : 0;
    eye[y * N + x] = wc[y * N + x] && okca(t, b, k) >= 4.5 ? 1 : 0;
  }
  return (forkCache[k] = { eye, wc, out });
}
// Table cells render inside candor-table's shadow root, where page classes don't reach; style inline.
const chip = (fg, bg, label) => {
  const w = el('span'); w.style.cssText = 'display:inline-flex;align-items:center;gap:var(--spacing-xs);white-space:nowrap';
  const s = el('span', { 'aria-hidden': 'true' }, 'Aa');
  s.style.cssText = `display:inline-grid;place-items:center;inline-size:2rem;block-size:1.5rem;border-radius:var(--radius-sm);box-shadow:inset 0 0 0 var(--border-width-thin) var(--color-border-strong);font-family:var(--font-family-accessible);font-weight:var(--font-weight-bold);font-size:var(--font-size-sm);letter-spacing:0.04em;color:${fg};background:${bg}`;
  w.append(s, document.createTextNode(label)); return w;
};
function renderFork() {
  const t = $('fork-table');
  t.caption = 'Scores for each pair, both ways round';
  t.headers = ['Pair', 'WCAG 2.x', 'OKCA 2.0.3', '3.0 default', '3.0 scatter'];
  t.rows = FORK_PAIRS.map(([fg, bg, label]) => ({ cells: [chip(fg, bg, label), wcag(fg, bg).toFixed(2), OKCA2.contrast(fg, bg).toFixed(1), okca(fg, bg, 0).toFixed(1), okca(fg, bg, FULL).toFixed(1)], isHeader: true }));
  drawFork();
  [0, FULL].forEach((k, i) => {
    const g = forkGrid(k), N = MAP_N;
    const share = (arr, lo, hi) => { let n = 0, p = 0; for (let y = 0; y < N; y++) { const L = (y + 0.5) / N; if (L < lo || L > hi) continue; for (let x = 0; x < N; x++) { n++; p += arr[y * N + x]; } } return Math.round((100 * p) / n); };
    $(`fork-read-${i}`).textContent = `Dark backgrounds (L 0.3 or below): ${share(g.eye, 0, 0.3)}% of text lightnesses reach 4.5. Light backgrounds (L 0.8 or above): ${share(g.eye, 0.8, 1)}%. WCAG 2.x: ${share(g.wc, 0, 0.3)}% and ${share(g.wc, 0.8, 1)}%.`;
  });
}
function drawFork() { [0, FULL].forEach((k, i) => drawGrid($(`fork-map-${i}`), forkGrid(k), null)); }

function renderReader() {
  const hint = $('eye-hint');
  const low = state.reader === 'aaa';
  hint.textContent = low ? 'The low-vision reader\'s own scatter is not measured. Its eye is at least as clouded as the 80-year-old eye, so treat that veil as a floor.' : '';
  hint.hidden = !low;
}
function renderExplore() {
  renderReader();
  edgeAll();
  $('exp-sample').replaceChildren(sample(state.a, state.b, state.k));
  renderRows(state.a, state.b);
  renderMap();
}
function adoptText(hex) {
  const lab = OKCA3.hexToOklab(hex);
  state.chroma = Math.hypot(lab[1], lab[2]); state.hue = Math.atan2(lab[2], lab[1]);
  state.a = hex; $('a-hex').value = hex; $('a-pick').value = hex;
  state.tRange = lightRange(state.chroma, state.hue, lab[0]);
  Object.assign($('L'), { min: state.tRange[0], max: state.tRange[1], value: Math.max(state.tRange[0], Math.min(state.tRange[1], +lab[0].toFixed(3))) });
}
function adoptBg(hex) {
  const lab = OKCA3.hexToOklab(hex);
  state.bChroma = Math.hypot(lab[1], lab[2]); state.bHue = Math.atan2(lab[2], lab[1]);
  state.b = hex; $('b-hex').value = hex; $('b-pick').value = hex;
  state.bRange = lightRange(state.bChroma, state.bHue, lab[0]);
  Object.assign($('BL'), { min: state.bRange[0], max: state.bRange[1], value: Math.max(state.bRange[0], Math.min(state.bRange[1], +lab[0].toFixed(3))) });
}
function setPair(a, b) { $('a-hex').error = ''; $('b-hex').error = ''; adoptBg(b); adoptText(a); renderExplore(); }

// Wiring, on Candor's own events: input = live value, change = committed value.
$('trio-sim').addEventListener('change', (e) => { state.sim = e.detail; renderTrio(); renderExplore(); });
document.querySelectorAll('candor-radio[name="reader"]').forEach((r) => r.addEventListener('change', (e) => { state.reader = e.detail; renderTrio(); renderExplore(); }));
document.querySelectorAll('candor-radio[name="eye"]').forEach((r) => r.addEventListener('change', (e) => { state.k = +e.detail; renderExplore(); }));
$('L').valueTextFn = (v) => `L ${(+v).toFixed(3)}, text ${textAt(+v)}`;
$('L').addEventListener('input', (e) => { const hex = textAt(+e.detail); state.a = hex; $('a-hex').value = hex; $('a-pick').value = hex; renderExplore(); });
$('BL').valueTextFn = (v) => `L ${(+v).toFixed(3)}, background ${bgAt(+v)}`;
$('BL').addEventListener('input', (e) => { const hex = bgAt(+e.detail); state.b = hex; $('b-hex').value = hex; $('b-pick').value = hex; renderExplore(); });
// Clicking or dragging on the map sets both lightnesses; the sliders stay the keyboard route.
const mapPick = (e) => {
  const r = $('map').getBoundingClientRect(), clampTo = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
  const tl = clampTo((e.clientX - r.left) / r.width, state.tRange), bl = clampTo((e.clientY - r.top) / r.height, state.bRange);
  $('L').value = +tl.toFixed(3); $('BL').value = +bl.toFixed(3);
  state.a = textAt(tl); state.b = bgAt(bl);
  for (const [s, v] of [['a', state.a], ['b', state.b]]) { $(s + '-hex').value = v; $(s + '-pick').value = v; }
  renderExplore();
};
$('map').addEventListener('pointerdown', (e) => { $('map').setPointerCapture(e.pointerId); mapPick(e); });
$('map').addEventListener('pointermove', (e) => { if (e.buttons) mapPick(e); });
new ResizeObserver(() => drawMap()).observe($('map'));
const forkRO = new ResizeObserver(() => drawFork()); forkRO.observe($('fork-map-0')); forkRO.observe($('fork-map-1'));
for (const side of ['a', 'b']) {
  $(side + '-hex').addEventListener('input', (e) => {
    const v = norm(e.detail);
    if (!v) { $(side + '-hex').error = 'Enter a hex colour such as #767676 or #fff.'; return; }
    $(side + '-hex').error = '';
    if (side === 'a') adoptText(v); else adoptBg(v);
    renderExplore();
  });
  $(side + '-pick').addEventListener('input', (e) => {
    const v = e.target.value; $(side + '-hex').value = v; $(side + '-hex').error = '';
    if (side === 'a') adoptText(v); else adoptBg(v);
    renderExplore();
  });
}
$('swap').addEventListener('click', () => setPair(state.b, state.a));
const presets = $('presets');
PRESETS.forEach(([a, b, t]) => {
  const btn = el('candor-button', { variant: 'tertiary', size: 'small' });
  const sa = el('span', { class: 'swatch', 'aria-hidden': 'true' }); sa.style.background = a;
  const sb = el('span', { class: 'swatch', 'aria-hidden': 'true' }); sb.style.background = b;
  btn.append(sa, sb, document.createTextNode(t));
  btn.addEventListener('click', () => setPair(a, b));
  presets.append(btn);
});

// Colour pickers: match the text input's height and top edge, and show an edge only when the swatch
// nearly matches the card it sits on.
const resolve = (() => { const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); return (css) => { c.clearRect(0, 0, 1, 1); c.fillStyle = css; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''); }; })();
const surface = () => resolve(getComputedStyle(document.body).getPropertyValue('--color-bg-surface').trim());
const edgeAll = () => { const bg = surface(); for (const side of ['a', 'b']) { const pick = $(side + '-pick'); pick.classList.toggle('edge', wcag(pick.value, bg) < 1.5); } };
const fit = () => document.querySelectorAll('.colour-field').forEach((f) => {
  const field = f.querySelector('candor-input'), inner = field.shadowRoot?.querySelector('input'), pick = f.querySelector('input[type="color"]');
  if (!inner) return; const r = inner.getBoundingClientRect(), top = r.top - f.getBoundingClientRect().top;
  pick.style.marginTop = `${top}px`; pick.style.blockSize = pick.style.inlineSize = `${r.height}px`;
});
const ro = new ResizeObserver(fit); document.querySelectorAll('.colour-field candor-input').forEach((x) => ro.observe(x));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { edgeAll(); drawMap(); drawFork(); });
renderFork();
renderTrio();
setPair(state.a, state.b);
fit();
