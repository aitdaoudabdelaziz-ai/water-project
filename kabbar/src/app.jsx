// برنامج تسيير تعاونية الكبار — React، بنفس تصميم برنامج الماء (الدفتر: كحلي + ذهبي + فيروزي)
import { useDeferredValue, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';

/* ================= البيانات والحفظ ================= */
const K = 'kb1';
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const dflt = () => ({
  ver: 1,
  cfg: {
    name: 'تعاونية الكبار', sub: 'تعاونية فلاحية - نبتة الكبار', addr: '', tel: '', ice: '', pres: '', logo: '',
    year: new Date().getFullYear(), cur: 'د.م', reserve: 10, dues: 100, share: 100,
    grades: [
      { id: 1, n: 'نونبريل (أقل من 7 ملم)', p: 25 },
      { id: 2, n: 'كابوسين (7 - 8 ملم)', p: 20 },
      { id: 3, n: 'كابوت (8 - 9 ملم)', p: 16 },
      { id: 4, n: 'كبير (أكثر من 9 ملم)', p: 12 },
    ],
    items: ['ملح', 'براميل', 'خل', 'أكياس'],
  },
  mem: [], rec: [], sal: [], pur: [], cash: [], bon: [],
});
function load() {
  try {
    const s = localStorage.getItem(K);
    if (s) { const d = JSON.parse(s), b = dflt(); return { ...b, ...d, cfg: { ...b.cfg, ...d.cfg } }; }
  } catch (e) { alert('خطأ في قراءة البيانات: ' + e.message); }
  return dflt();
}
let D = load();
let ver = 0; const subs = new Set();
const emit = () => { ver++; subs.forEach(f => f()); };
const useStore = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => ver);
let tmr;
function flush() {
  if (window.__nf) return;
  try {
    const day = today();
    if (localStorage.getItem(K + 'bd') !== day) { const old = localStorage.getItem(K); if (old) localStorage.setItem(K + 'b', old); localStorage.setItem(K + 'bd', day); }
    localStorage.setItem(K, JSON.stringify(D));
  } catch (e) { alert('تعذر الحفظ: ' + e.message); }
}
const upd = fn => { fn(D); emit(); clearTimeout(tmr); tmr = setTimeout(flush, 300); };
window.addEventListener('beforeunload', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

/* ================= الحسابات ================= */
const seq = a => a.reduce((m, x) => Math.max(m, +x.id || 0), 0) + 1;
const sum = (a, f) => a.reduce((s, x) => s + (+f(x) || 0), 0);
const num = v => parseFloat(String(v ?? '').replace(',', '.')) || 0;
const n2 = v => { const r = (Math.round((+v || 0) * 100) / 100).toFixed(2), [i, d] = r.split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F') + '.' + d; };
const fmt = v => String(Math.round(+v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
const kg = v => String(Math.round((+v || 0) * 1000) / 1000).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
const norm = s => String(s ?? '').toLowerCase().replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ْ]/g, '');
const memOf = id => D.mem.find(m => m.id == id);
const mn = id => (memOf(id) || {}).name || '—';
const gn = id => (D.cfg.grades.find(g => g.id == id) || {}).n || '—';
const CAT = {
  dues: 'واجب الانخراط', cap: 'رأس المال (الحصص)', sale: 'مبيعات', inc: 'مداخيل أخرى', sub: 'منحة / دعم',
  pur: 'مشتريات', adv: 'تسبيق للفلاح', pay: 'أداء مستحقات فلاح', tr: 'نقل', wag: 'أجور', rent: 'كراء', util: 'ماء وكهرباء', mnt: 'صيانة', exp: 'مصاريف أخرى',
};
const IN = ['dues', 'cap', 'sale', 'inc', 'sub'];
const EXP = ['tr', 'wag', 'rent', 'util', 'mnt', 'exp'];
const sg = c => (IN.includes(c.cat) ? 1 : -1);
const bal = mode => sum(D.cash.filter(c => !mode || c.mode === mode), c => sg(c) * c.amt);
const recVal = r => r.kg * r.p, salTot = s => s.kg * s.p, purTot = p => p.q * p.p;
const paidRef = (cat, id) => sum(D.cash.filter(c => c.cat === cat && c.ref == id), c => c.amt);
const stock = g => sum(D.rec.filter(r => r.g == g), r => r.kg) - sum(D.sal.filter(s => s.g == g), s => s.kg);
const inY = (d, y) => String(d || '').startsWith(String(y));
const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id);
function due(mid) {
  const val = sum(D.rec.filter(r => r.mem == mid), recVal) + sum(D.bon.filter(b => b.mem == mid), b => b.amt);
  const paid = sum(D.cash.filter(c => (c.cat === 'adv' || c.cat === 'pay') && c.mem == mid), c => c.amt);
  return { val, paid, rest: val - paid };
}
const duesPaid = (mid, y) => sum(D.cash.filter(c => c.cat === 'dues' && c.mem == mid && inY(c.date, y)), c => c.amt);
const fd = d => String(d || '').split('-').reverse().join('/');

function download(name, text, type) {
  const b = text instanceof Blob ? text : new Blob([text], { type }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
/* ================= Excel (.xlsx) تصدير واستيراد ================= */
const xe = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
const colL = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
/** ملف Excel حقيقي: ورقة واحدة من اليمين لليسار، رأس عريض */
async function xlsx(name, head, rows, sheet = 'Feuil1') {
  const all = [head, ...rows];
  const w = head.map((_, j) => Math.min(45, Math.max(8, ...all.map(r => String(r[j] ?? '').length + 2))));
  const cell = (v, i, j) => { const r = colL(j) + (i + 1), st = i === 0 ? ' s="1"' : '';
    if (typeof v === 'number' && isFinite(v)) return `<c r="${r}"${st}><v>${v}</v></c>`;
    if (v === '' || v == null) return '';
    return `<c r="${r}" t="inlineStr"${st}><is><t xml:space="preserve">${xe(v)}</t></is></c>`; };
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xe(sheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  z.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F2B44"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  z.file('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'
    + w.map((x, j) => `<col min="${j + 1}" max="${j + 1}" width="${x}" customWidth="1"/>`).join('') + '</cols><sheetData>'
    + all.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => cell(v, i, j)).join('')}</row>`).join('') + '</sheetData></worksheet>');
  download(name + '.xlsx', await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), null);
}
const csv = (name, head, rows) => xlsx(name, head, rows).catch(e => alert('تعذر إنشاء ملف Excel: ' + e.message));
/** قراءة أول ورقة من ملف xlsx (أو csv) ← مصفوفة صفوف */
async function readSheet(file) {
  if (/\.(csv|txt)$/i.test(file.name)) {
    const t = (await file.text()).replace(/^﻿/, ''), sep = (t.split('\n')[0].match(/;/g) || []).length >= (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) { const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { row.push(f); f = ''; } else if (ch === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; } else f += ch; }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  const z = await JSZip.loadAsync(await file.arrayBuffer());
  const X = async p => { const f = z.file(p); return f ? new DOMParser().parseFromString(await f.async('string'), 'application/xml') : null; };
  const wb = await X('xl/workbook.xml'); if (!wb) throw new Error('ليس ملف Excel (xlsx)');
  const rid = wb.getElementsByTagName('sheet')[0].getAttribute('r:id'), rels = await X('xl/_rels/workbook.xml.rels');
  let target = 'worksheets/sheet1.xml';
  if (rels) for (const r of rels.getElementsByTagName('Relationship')) if (r.getAttribute('Id') === rid) target = r.getAttribute('Target');
  const path = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
  const ss = await X('xl/sharedStrings.xml'), SS = ss ? [...ss.getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  const sh = await X(path); if (!sh) throw new Error('الورقة غير موجودة');
  const ci = r => { let n = 0; for (const ch of r.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  return [...sh.getElementsByTagName('row')].map(row => { const out = [];
    for (const c of row.getElementsByTagName('c')) { const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], j = ci(c.getAttribute('r') || colL(out.length));
      out[j] = t === 's' ? SS[+v.textContent] : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : v ? (t === 'str' || t === 'b' ? v.textContent : +v.textContent) : ''; }
    return Array.from(out, x => x ?? ''); });
}
function doPrint() {
  const C = window.Capacitor, P = C && C.Plugins && C.Plugins.WaterPrint;
  if (C && C.isNativePlatform && C.isNativePlatform() && P) { P.print({ name: 'Kabbar' }).catch(() => window.print()); return; }
  window.print();
}

/* ================= الهوية والأيقونات ================= */
const LOGO0 = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23EAF4EC' stroke='%232E8B57' stroke-width='3'/%3E%3Cpath d='M50 84V40M50 58C40 52 32 54 26 60M50 50c10-6 18-5 24 1' fill='none' stroke='%232E6B3F' stroke-width='3.5' stroke-linecap='round'/%3E%3Cellipse cx='30' cy='52' rx='7' ry='5' fill='%2356A86B'/%3E%3Cellipse cx='70' cy='44' rx='7' ry='5' fill='%2356A86B'/%3E%3Ccircle cx='50' cy='30' r='9' fill='%237BB661'/%3E%3Ccircle cx='38' cy='38' r='5' fill='%23E2A42B'/%3E%3Ccircle cx='63' cy='32' r='5' fill='%23E2A42B'/%3E%3C/svg%3E";
const logoOf = () => D.cfg.logo || LOGO0;
const I = {
  users: <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="16" r="7" className="i-n" /><path d="M5 40c1-8 6-12 13-12s12 4 13 12" className="i-n" /><circle cx="34" cy="18" r="5.5" className="i-g" /><path d="M31 28c7 0 11 4 12 11" className="i-g" /></svg>,
  coins: <svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="20" cy="13" rx="12" ry="5" className="i-g" /><path d="M8 13v8c0 3 5 5 12 5s12-2 12-5v-8" className="i-n" /><path d="M16 30v6c0 3 5 5 12 5s12-2 12-5v-8c0-3-5-5-12-5" className="i-n" /><path d="M16 30c0 3 5 5 12 5s12-2 12-5" className="i-g" /></svg>,
  scale: <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 8v32M12 40h24" className="i-n" /><path d="M8 14h32" className="i-n" /><path d="M12 14 5 28h14Z" className="i-g" /><path d="M36 14l-7 14h14Z" className="i-g" /><circle cx="24" cy="8" r="2.5" className="i-n" /></svg>,
  warn: <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="9" width="24" height="30" rx="3" className="i-n" /><path d="M12 17h12M12 23h12M12 29h7" className="i-n" /><path d="M36 22 45 39H27Z" className="i-g" /><path d="M36 28v5M36 36v.5" className="i-g" /></svg>,
  leaf: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15Zm0 0 8-8" /></svg>,
  eye: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>,
  pen: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
  cash: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>,
  bill: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>,
  people: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .6 3.3 2.6 3.5 6" /></svg>,
  box: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10" /></svg>,
  hand: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 14h4l5 2h4a2 2 0 0 0 0-4h-3M7 14v6M10 20h7l4-5" /><circle cx="15" cy="6" r="3" /></svg>,
};
// [المعرّف، الاسم، الأيقونة، في «المزيد» على الهاتف]
const TABS = [
  ['home', 'الرئيسية', 'M3 11 12 4l9 7M5 10v10h14V10'],
  ['rec', 'الاستلام', 'M12 3v18M5 21h14M4 7h16M7 7l-3 7h6Zm10 0-3 7h6Z'],
  ['far', 'الفلاحون', 'M3 14h4l5 2h4a2 2 0 0 0 0-4h-3M7 14v6M10 20h7l4-5M15 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  ['mem', 'المنخرطون', 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75'],
  ['sal', 'المبيعات', 'M3 4h2l2.5 11h11L21 7H6.5M9 20h.01M18 20h.01', 1],
  ['pur', 'المشتريات', 'M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10', 1],
  ['cash', 'المالية', 'M3 7h18v12H3zM3 11h18M7 15h3', 1],
  ['dist', 'توزيع الفائض', 'M12 3v9h9A9 9 0 1 1 12 3Zm3-1a8 8 0 0 1 7 7h-7Z', 1],
  ['set', 'الإعدادات', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z', 1],
];

/* ================= مكونات عامة (منقولة من برنامج الماء) ================= */
const BG = ['#DCEFE4', '#E7E1F5', '#F6E6CF', '#DDE9F6', '#F5DCDC', '#E3F0D2'];
const FG = ['#1E6B48', '#5B45A0', '#8A5A12', '#2A5C8F', '#9B3434', '#4E6B1E'];
const initials = n => String(n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('');
function Avatar({ m, size = 42 }) {
  const k = (m && m.id || 0) % 6;
  return <span className="av" style={{ background: BG[k], color: FG[k], width: size, height: size }} aria-hidden="true">{initials(m && m.name)}</span>;
}
function CountUp({ value, format = v => v, suffix = '' }) {
  const [v, setV] = useState(value); const first = useRef(true);
  useEffect(() => {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!first.current || reduce) { setV(value); return; }
    first.current = false; let raf; const t0 = performance.now();
    const step = t => { let k = Math.min(1, (t - t0) / 900); k = 1 - Math.pow(1 - k, 3); setV(value * k); if (k < 1) raf = requestAnimationFrame(step); else setV(value); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <bdi dir="ltr">{format(v)}{suffix}</bdi>;
}
function Kpi({ label, children, pill, tone, onClick, icon }) {
  return <button type="button" className={'kpi kpi-ic' + (tone ? ' kpi-' + tone : '')} onClick={onClick}>
    <span className="kpi-i">{icon}</span>
    <span className="kpi-c"><span className="kpi-l">{label}</span><b className="kpi-v">{children}</b>{pill != null && <span className="pill">{pill}</span>}</span>
  </button>;
}
const Empty = ({ children }) => <div className="empty">{children}</div>;
const M = ({ v }) => <bdi dir="ltr">{n2(v)}</bdi>;
const Kg = ({ v }) => <bdi dir="ltr">{kg(v)}</bdi>;
function Sheet({ title, sub, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => { const prev = document.activeElement; const el = ref.current && ref.current.querySelector('[data-autofocus]') || ref.current; el && el.focus(); return () => prev && prev.focus && prev.focus(); }, []);
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return <div className="dlg" role="dialog" aria-modal="true" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="dlg-b sheet" ref={ref} tabIndex={-1}>
      <div className="sheet-h"><div><h3>{title}</h3>{sub && <small>{sub}</small>}</div><button type="button" className="x" onClick={onClose} aria-label="إغلاق">✕</button></div>
      {children}
    </div>
  </div>;
}
const Field = ({ l, children, w }) => <label className={'field' + (w ? ' kb-w' : '')}>{l}{children}</label>;
const MemSel = ({ v, set, all }) => <select value={v} onChange={e => set(e.target.value)}>
  <option value="">{all ? 'الكل' : '— اختر —'}</option>
  {D.mem.filter(m => all || m.active !== false || m.id == v).slice().sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(m => <option key={m.id} value={m.id}>{m.id} - {m.name}</option>)}
</select>;
const GSel = ({ v, set, all }) => <select value={v} onChange={e => set(e.target.value)}>{all && <option value="">الكل</option>}{D.cfg.grades.map(g => <option key={g.id} value={g.id}>{g.n}</option>)}</select>;
const ModeSel = ({ v, set }) => <select value={v} onChange={e => set(e.target.value)}><option value="cash">نقداً (الصندوق)</option><option value="bank">بنكياً</option></select>;
const IconBtn = ({ i, label, onClick, cls }) => <button type="button" className={'eye ' + (cls || '')} onClick={onClick} aria-label={label} title={label}>{i}</button>;
const confirmDel = (msg, fn) => { if (confirm(msg)) upd(fn); };

/* ================= واجهة عامة: النوافذ والطباعة ================= */
const ui = { tab: 'home', sheet: null, print: null };
const setUI = o => { Object.assign(ui, o); emit(); };
const open = node => setUI({ sheet: node });
const close = () => setUI({ sheet: null });
const printDoc = (pages, label) => setUI({ print: { pages, label } });

function PrintView() {
  const [z, setZ] = useState(() => Math.min(1, (innerWidth - 16) / 794));
  useEffect(() => { const r = () => setZ(Math.min(1, (innerWidth - 16) / 794)); addEventListener('resize', r); return () => removeEventListener('resize', r); }, []);
  const done = () => setUI({ print: null });
  useEffect(() => { const k = e => e.key === 'Escape' && done(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  return <div className="pv" role="dialog" aria-modal="true" aria-label="معاينة الطباعة" style={{ '--z': z }}>
    <div className="pv-bar"><button type="button" className="btn pri" onClick={doPrint} autoFocus>🖨 طباعة</button><span>{ui.print.label}</span><button type="button" className="btn" onClick={done}>إغلاق</button></div>
    <div className="pp">{ui.print.pages}</div>
  </div>;
}
/** صفحة مطبوعة بنفس روح فاتورة الماء: شريط داكن، صناديق خضراء فاتحة، جداول بزرقة */
function Pg({ title, sub, children, sign, half }) {
  const c = D.cfg;
  return <div className={'kpg' + (half ? ' half' : '')}>
    <div className="khd"><div><div className="t1">{title}</div>{sub && <div className="t2">{sub}</div>}</div>
      <div className="md"><div className="as">{c.name}</div><div className="ct">{c.addr}</div><div className="lc">{c.sub}</div></div><img src={logoOf()} alt="" /></div>
    <div className="kbody">{children}</div>
    {sign && <div className="ksig">{sign.map(s => <div key={s}>{s}</div>)}</div>}
    <div className="kft">{c.name}{c.addr ? ' - ' + c.addr : ''}{c.tel ? ' | الهاتف: ' + c.tel : ''}{c.ice ? ' | ICE: ' + c.ice : ''}</div>
  </div>;
}
function printRec(r) {
  printDoc(<Pg half title="وصل استلام المحصول" sub={'رقم ' + r.id} sign={['توقيع الفلاح', 'توقيع المسؤول']}>
    <div className="krow">
      <div className="kbx"><h4>الفلاح:</h4><div><b>الاسم:</b> {mn(r.mem)}</div><div><b>رقم المنخرط:</b> {r.mem}</div><div><b>الدوار:</b> {(memOf(r.mem) || {}).douar || '—'}</div></div>
      <div className="kbx"><h4>الاستلام:</h4><div><b>رقم الوصل:</b> {r.id}</div><div><b>التاريخ:</b> {fd(r.date)}</div>{r.note && <div><b>ملاحظة:</b> {r.note}</div>}</div>
    </div>
    <table className="ktb"><tbody><tr><th>الصنف</th><th>الوزن (كلغ)</th><th>الثمن (د.م/كلغ)</th><th>المبلغ (د.م)</th></tr>
      <tr><td>{gn(r.g)}</td><td>{kg(r.kg)}</td><td>{n2(r.p)}</td><td>{n2(recVal(r))}</td></tr></tbody></table>
    <div className="ktt">المبلغ المستحق للفلاح: {n2(recVal(r))} درهم</div>
  </Pg>, 'وصل استلام');
}
function printSal(s) {
  const pd = paidRef('sale', s.id), t = salTot(s);
  printDoc(<Pg half title="فاتورة بيع" sub={'رقم ' + s.id} sign={['الزبون', 'توقيع المسؤول']}>
    <div className="krow">
      <div className="kbx"><h4>الزبون:</h4><div><b>الاسم:</b> {s.cl}</div></div>
      <div className="kbx"><h4>الفاتورة:</h4><div><b>الرقم:</b> {s.id}</div><div><b>التاريخ:</b> {fd(s.date)}</div></div>
    </div>
    <table className="ktb"><tbody><tr><th>المنتوج</th><th>الوزن (كلغ)</th><th>الثمن (د.م/كلغ)</th><th>المبلغ (د.م)</th></tr>
      <tr><td>كبار - {gn(s.g)}</td><td>{kg(s.kg)}</td><td>{n2(s.p)}</td><td>{n2(t)}</td></tr></tbody></table>
    <div className="ktr"><div className="ktt"><div>المجموع: {n2(t)} درهم</div><div>المؤدى: {n2(pd)} درهم</div><div className="gr">الباقي: {n2(t - pd)} درهم</div></div>{t - pd < 0.005 && <div className="kps">✔ مدفوعة</div>}</div>
  </Pg>, 'فاتورة');
}
function printSt(mid) {
  const m = memOf(mid), d = due(mid);
  const rs = D.rec.filter(r => r.mem == mid).sort(byDate), bs = D.bon.filter(b => b.mem == mid);
  const ps = D.cash.filter(c => (c.cat === 'adv' || c.cat === 'pay') && c.mem == mid).sort(byDate);
  printDoc(<Pg title="كشف حساب فلاح" sub={'بتاريخ ' + fd(today())} sign={['توقيع الفلاح', 'توقيع المسؤول']}>
    <div className="krow"><div className="kbx"><h4>الفلاح:</h4><div><b>الاسم:</b> {m.name}</div><div><b>رقم المنخرط:</b> {m.id}</div><div><b>البطاقة:</b> {m.cin || '—'} — <b>الدوار:</b> {m.douar || '—'}</div></div>
      <div className="kbx"><h4>الحساب:</h4><div><b>القيمة:</b> {n2(d.val)}</div><div><b>المدفوع:</b> {n2(d.paid)}</div><div><b>المتبقي له:</b> {n2(d.rest)} درهم</div></div></div>
    <div className="kbr">الاستلامات</div>
    <table className="ktb"><tbody><tr><th>التاريخ</th><th>الصنف</th><th>الوزن (كلغ)</th><th>الثمن</th><th>المبلغ</th></tr>
      {rs.map(r => <tr key={r.id}><td>{fd(r.date)}</td><td>{gn(r.g)}</td><td>{kg(r.kg)}</td><td>{n2(r.p)}</td><td>{n2(recVal(r))}</td></tr>)}
      {bs.map(b => <tr key={'b' + b.year}><td>{b.year}</td><td colSpan={3}>نصيب من توزيع الفائض</td><td>{n2(b.amt)}</td></tr>)}
      <tr className="kt"><td colSpan={2}>المجموع</td><td>{kg(sum(rs, r => r.kg))}</td><td></td><td>{n2(d.val)}</td></tr></tbody></table>
    <div className="kbr">الأداءات والتسبيقات</div>
    <table className="ktb"><tbody><tr><th>التاريخ</th><th>النوع</th><th>الطريقة</th><th>المبلغ</th></tr>
      {ps.map(c => <tr key={c.id}><td>{fd(c.date)}</td><td>{CAT[c.cat]}</td><td>{c.mode === 'bank' ? 'بنكياً' : 'نقداً'}</td><td>{n2(c.amt)}</td></tr>)}
      <tr className="kt"><td colSpan={3}>المجموع</td><td>{n2(d.paid)}</td></tr></tbody></table>
    <div className="ktt">المتبقي للفلاح: {n2(d.rest)} درهم</div>
  </Pg>, 'كشف حساب');
}
const printList = (title, head, rows, foot) => printDoc(<Pg title={title} sub={'بتاريخ ' + fd(today())}>
  <table className="ktb"><tbody><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
    {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
    {foot && <tr className="kt">{foot.map((c, j) => <td key={j}>{c}</td>)}</tr>}</tbody></table>
</Pg>, title);

/* ================= النماذج ================= */
function Form({ onSave, children, ok = 'حفظ', ok2 }) {
  const [err, setErr] = useState('');
  const go = pr => { const e = onSave(pr); if (e) setErr(e); };
  return <form className="form two" onSubmit={e => { e.preventDefault(); go(false); }} onChange={() => err && setErr('')}>
    {children}
    {err && <p className="err kb-w" role="alert">{err}</p>}
    <div className="row kb-w"><button type="submit" className="btn pri">{ok}</button>
      {ok2 && <button type="button" className="btn" onClick={() => go(true)}>{ok2}</button>}
      <button type="button" className="btn ghost" onClick={close}>إلغاء</button></div>
  </form>;
}
function MemSheet({ m }) {
  const [f, sf] = useState(m ? { ...m } : { name: '', cin: '', tel: '', douar: '', date: today(), shares: '1', active: true });
  const [cap, setCap] = useState(true);
  const s = k => e => sf({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = () => {
    if (!f.name.trim()) return 'أدخل الاسم الكامل';
    if (f.cin.trim() && D.mem.some(x => x.id !== (m && m.id) && norm(x.cin) === norm(f.cin.trim()))) return 'رقم البطاقة مسجل لمنخرط آخر';
    upd(D => {
      const o = { ...f, name: f.name.trim(), cin: f.cin.trim(), shares: num(f.shares) };
      if (m) Object.assign(D.mem.find(x => x.id === m.id), o);
      else { o.id = seq(D.mem); D.mem.push(o); if (cap && o.shares > 0) D.cash.push({ id: seq(D.cash), date: o.date, cat: 'cap', amt: o.shares * D.cfg.share, mode: 'cash', mem: o.id, note: o.shares + ' حصة' }); }
    });
    close();
  };
  return <Sheet title={m ? 'تعديل منخرط' : 'إضافة منخرط'} onClose={close}><Form onSave={save} ok={m ? 'حفظ التعديل' : 'إضافة المنخرط'}>
    <Field l="الاسم الكامل *"><input value={f.name} onChange={s('name')} data-autofocus autoComplete="off" /></Field>
    <Field l="رقم البطاقة الوطنية"><input value={f.cin} onChange={s('cin')} autoComplete="off" /></Field>
    <Field l="الهاتف"><input value={f.tel} onChange={s('tel')} inputMode="tel" dir="ltr" /></Field>
    <Field l="الدوار"><input value={f.douar} onChange={s('douar')} /></Field>
    <Field l="تاريخ الانخراط"><input type="date" value={f.date} onChange={s('date')} /></Field>
    <Field l="عدد الحصص"><input type="number" min="0" value={f.shares} onChange={s('shares')} inputMode="numeric" /></Field>
    {m ? <label className="chk kb-w"><input type="checkbox" checked={f.active !== false} onChange={s('active')} /> منخرط نشيط</label>
      : <label className="chk kb-w"><input type="checkbox" checked={cap} onChange={e => setCap(e.target.checked)} /> تسجيل قيمة الحصص في الصندوق (<M v={num(f.shares) * D.cfg.share} /> {D.cfg.cur})</label>}
  </Form></Sheet>;
}
function RecSheet({ r, mem }) {
  const g0 = D.cfg.grades[0] || { id: '', p: 0 };
  const [f, sf] = useState(r ? { ...r, kg: String(r.kg), p: String(r.p) } : { date: today(), mem: mem || '', g: g0.id, kg: '', p: String(g0.p), note: '' });
  const s = k => e => sf({ ...f, [k]: e.target.value });
  const save = pr => {
    if (!f.mem) return 'اختر الفلاح'; if (!(num(f.kg) > 0)) return 'أدخل الوزن';
    let o; upd(D => { o = { ...f, mem: +f.mem, g: +f.g, kg: num(f.kg), p: num(f.p) }; if (r) Object.assign(D.rec.find(x => x.id === r.id), o); else { o.id = seq(D.rec); D.rec.push(o); } });
    close(); if (pr) printRec(o);
  };
  return <Sheet title={r ? 'تعديل استلام رقم ' + r.id : 'استلام المحصول'} sub="وزن الكبار المسلَّم من الفلاح" onClose={close}><Form onSave={save} ok="حفظ" ok2="حفظ وطباعة الوصل">
    <Field l="الفلاح *" w><MemSel v={f.mem} set={v => sf({ ...f, mem: v })} /></Field>
    <Field l="التاريخ"><input type="date" value={f.date} onChange={s('date')} /></Field>
    <Field l="الصنف"><GSel v={f.g} set={g => sf({ ...f, g, p: String((D.cfg.grades.find(x => x.id == g) || {}).p ?? f.p) })} /></Field>
    <Field l="الوزن (كلغ) *"><input type="number" step="0.001" min="0" inputMode="decimal" value={f.kg} onChange={s('kg')} data-autofocus={f.mem ? true : undefined} /></Field>
    <Field l="الثمن (د.م / كلغ)"><input type="number" step="0.01" min="0" inputMode="decimal" value={f.p} onChange={s('p')} /></Field>
    <Field l="ملاحظة" w><input value={f.note} onChange={s('note')} /></Field>
    <div className="kb-tot kb-w"><span>المبلغ المستحق للفلاح</span><b><M v={num(f.kg) * num(f.p)} /> <em>{D.cfg.cur}</em></b></div>
  </Form></Sheet>;
}
function SalSheet() {
  const g0 = D.cfg.grades[0] || { id: '' };
  const [f, sf] = useState({ date: today(), cl: '', g: g0.id, kg: '', p: '', paid: '', mode: 'cash', note: '' });
  const s = k => e => sf({ ...f, [k]: e.target.value });
  const st = stock(f.g), t = num(f.kg) * num(f.p);
  const save = pr => {
    if (!f.cl.trim()) return 'أدخل اسم الزبون'; if (!(num(f.kg) > 0) || !(num(f.p) > 0)) return 'أدخل الوزن والثمن';
    if (num(f.paid) > t + 0.005) return 'المبلغ المؤدى أكبر من المجموع';
    if (num(f.kg) > st + 1e-9 && !confirm('المخزون غير كافٍ (' + kg(st) + ' كلغ). متابعة؟')) return;
    let o; upd(D => { o = { id: seq(D.sal), date: f.date, cl: f.cl.trim(), g: +f.g, kg: num(f.kg), p: num(f.p), note: f.note }; D.sal.push(o);
      if (num(f.paid) > 0) D.cash.push({ id: seq(D.cash), date: f.date, cat: 'sale', amt: num(f.paid), mode: f.mode, ref: o.id, note: o.cl }); });
    close(); if (pr) printSal(o);
  };
  return <Sheet title="بيع جديد" onClose={close}><Form onSave={save} ok="حفظ" ok2="حفظ وطباعة الفاتورة">
    <Field l="الزبون *"><input list="kb-cl" value={f.cl} onChange={s('cl')} data-autofocus /><datalist id="kb-cl">{[...new Set(D.sal.map(x => x.cl))].map(c => <option key={c} value={c} />)}</datalist></Field>
    <Field l="التاريخ"><input type="date" value={f.date} onChange={s('date')} /></Field>
    <Field l="الصنف"><GSel v={f.g} set={g => sf({ ...f, g })} /><small>المخزون: <Kg v={st} /> كلغ</small></Field>
    <Field l="الوزن (كلغ) *"><input type="number" step="0.001" inputMode="decimal" value={f.kg} onChange={s('kg')} /></Field>
    <Field l="الثمن (د.م / كلغ) *"><input type="number" step="0.01" inputMode="decimal" value={f.p} onChange={s('p')} /></Field>
    <Field l="المبلغ المؤدى الآن"><input type="number" step="0.01" inputMode="decimal" value={f.paid} onChange={s('paid')} /><small><button type="button" className="more kb-lnk" onClick={() => sf({ ...f, paid: String(Math.round(t * 100) / 100) })}>أداء كامل: {n2(t)}</button></small></Field>
    <Field l="طريقة الأداء"><ModeSel v={f.mode} set={v => sf({ ...f, mode: v })} /></Field>
    <Field l="ملاحظة"><input value={f.note} onChange={s('note')} /></Field>
    <div className="kb-tot kb-w"><span>المجموع <small>الباقي: <M v={t - num(f.paid)} /></small></span><b><M v={t} /> <em>{D.cfg.cur}</em></b></div>
  </Form></Sheet>;
}
function PurSheet() {
  const [f, sf] = useState({ date: today(), sup: '', item: D.cfg.items[0] || '', q: '', p: '', paid: '', mode: 'cash', note: '' });
  const s = k => e => sf({ ...f, [k]: e.target.value });
  const t = num(f.q) * num(f.p);
  const save = () => {
    if (!f.item.trim() || !(num(f.q) > 0)) return 'أدخل المادة والكمية';
    upd(D => { const o = { id: seq(D.pur), date: f.date, sup: f.sup.trim(), item: f.item.trim(), q: num(f.q), p: num(f.p), note: f.note }; D.pur.push(o);
      if (num(f.paid) > 0) D.cash.push({ id: seq(D.cash), date: f.date, cat: 'pur', amt: num(f.paid), mode: f.mode, ref: o.id, note: o.item }); });
    close();
  };
  return <Sheet title="شراء جديد" onClose={close}><Form onSave={save}>
    <Field l="المادة *"><input list="kb-it" value={f.item} onChange={s('item')} data-autofocus /><datalist id="kb-it">{D.cfg.items.map(c => <option key={c} value={c} />)}</datalist></Field>
    <Field l="المورد"><input list="kb-sp" value={f.sup} onChange={s('sup')} /><datalist id="kb-sp">{[...new Set(D.pur.map(x => x.sup).filter(Boolean))].map(c => <option key={c} value={c} />)}</datalist></Field>
    <Field l="التاريخ"><input type="date" value={f.date} onChange={s('date')} /></Field>
    <Field l="الكمية *"><input type="number" step="0.001" inputMode="decimal" value={f.q} onChange={s('q')} /></Field>
    <Field l="ثمن الوحدة"><input type="number" step="0.01" inputMode="decimal" value={f.p} onChange={s('p')} /></Field>
    <Field l="المبلغ المؤدى الآن"><input type="number" step="0.01" inputMode="decimal" value={f.paid} onChange={s('paid')} /><small><button type="button" className="more kb-lnk" onClick={() => sf({ ...f, paid: String(Math.round(t * 100) / 100) })}>أداء كامل: {n2(t)}</button></small></Field>
    <Field l="طريقة الأداء"><ModeSel v={f.mode} set={v => sf({ ...f, mode: v })} /></Field>
    <Field l="ملاحظة"><input value={f.note} onChange={s('note')} /></Field>
    <div className="kb-tot kb-w"><span>المجموع</span><b><M v={t} /> <em>{D.cfg.cur}</em></b></div>
  </Form></Sheet>;
}
/** عملية مالية: preset = { cat, mem, ref, amt, lock, title } */
function CashSheet({ preset = {} }) {
  const [f, sf] = useState({ date: today(), cat: preset.cat || 'exp', amt: preset.amt > 0 ? String(Math.round(preset.amt * 100) / 100) : '', mode: 'cash', mem: preset.mem || '', note: '' });
  const s = k => e => sf({ ...f, [k]: e.target.value });
  const needMem = ['dues', 'cap', 'adv', 'pay'].includes(f.cat);
  const save = () => {
    if (!(num(f.amt) > 0)) return 'أدخل المبلغ'; if (needMem && !f.mem) return 'اختر المنخرط';
    if (sg(f) < 0 && f.mode && num(f.amt) > bal(f.mode) + 0.005 && !confirm('الرصيد ' + (f.mode === 'bank' ? 'البنكي' : 'في الصندوق') + ' غير كافٍ (' + n2(bal(f.mode)) + '). متابعة؟')) return;
    upd(D => D.cash.push({ id: seq(D.cash), date: f.date, cat: f.cat, amt: num(f.amt), mode: f.mode, mem: needMem ? +f.mem : undefined, ref: preset.ref, note: f.note }));
    close();
  };
  const cats = preset.lock ? [f.cat] : Object.keys(CAT).filter(c => c !== 'sale' && c !== 'pur');
  return <Sheet title={preset.title || 'عملية جديدة'} onClose={close}><Form onSave={save}>
    <Field l="النوع"><select value={f.cat} onChange={s('cat')} disabled={preset.lock}>
      <optgroup label="مداخيل">{cats.filter(c => IN.includes(c)).map(c => <option key={c} value={c}>{CAT[c]}</option>)}</optgroup>
      <optgroup label="مصاريف">{cats.filter(c => !IN.includes(c)).map(c => <option key={c} value={c}>{CAT[c]}</option>)}</optgroup></select></Field>
    {needMem && <Field l="المنخرط *"><MemSel v={f.mem} set={v => sf({ ...f, mem: v })} /></Field>}
    <Field l="المبلغ *"><input type="number" step="0.01" inputMode="decimal" value={f.amt} onChange={s('amt')} data-autofocus /></Field>
    <Field l="التاريخ"><input type="date" value={f.date} onChange={s('date')} /></Field>
    <Field l="طريقة الأداء"><ModeSel v={f.mode} set={v => sf({ ...f, mode: v })} /></Field>
    <Field l="ملاحظة"><input value={f.note} onChange={s('note')} /></Field>
  </Form></Sheet>;
}

/* ================= الشاشات ================= */
function Head({ title, cnt, children, sub }) {
  return <div className="panel-h"><h2>{title}{cnt != null && <> <span className="cnt">{cnt}</span></>}</h2>{sub}<div className="kb-acts">{children}</div></div>;
}
function Search({ q, setQ, ph }) {
  return <div className="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>
    <input value={q} onChange={e => setQ(e.target.value)} placeholder={ph} aria-label={ph} /></div>;
}
function Chips({ v, set, opts }) {
  return <div className="chips" role="group">{opts.map(([k, l]) => <button key={k} type="button" className={'chip' + (v === k ? ' on' : '')} aria-pressed={v === k} onClick={() => set(k)}>{l}</button>)}</div>;
}

function Dashboard({ go }) {
  const y = D.cfg.year;
  const ry = D.rec.filter(r => inY(r.date, y)), sy = D.sal.filter(s => inY(s.date, y));
  const rcv = sum(D.sal, s => salTot(s) - paidRef('sale', s.id));
  const owed = D.mem.map(m => ({ m, d: due(m.id) })).filter(x => x.d.rest > 0.004).sort((a, b) => b.d.rest - a.d.rest);
  const act = D.mem.filter(m => m.active !== false), noDues = act.filter(m => duesPaid(m.id, y) < D.cfg.dues).length;
  const last = D.rec.slice().sort(byDate).reverse().slice(0, 6);
  const tot = sum(D.cfg.grades, g => stock(g.id));
  return <div className="stack dash">
    <div className="ph">
      <div className="ph-t"><h2>لوحة القيادة</h2><small>{D.cfg.name} <i>|</i> كما في <bdi dir="ltr">{fd(today())}</bdi></small></div>
      <div className="ph-a">
        <span className="ph-c">{I.leaf}<b>موسم</b> {y}</span>
        <button type="button" className="bell" onClick={() => go('far')} aria-label={'فلاحون لهم مستحقات: ' + owed.length}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>{owed.length > 0 && <b>{owed.length}</b>}</button>
        <button type="button" className="cta" onClick={() => open(<RecSheet />)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M5 21h14M4 7h16M7 7l-3 7h6Zm10 0-3 7h6Z" /></svg><span><b>استلام المحصول</b><small>وزن، وصل، مستحقات</small></span></button>
      </div>
    </div>
    <div className="kcards">
      <Kpi icon={I.coins} label={'مبيعات ' + y} pill={<>{sy.length} بيع <i>|</i> <Kg v={sum(sy, s => s.kg)} /> كلغ</>} onClick={() => go('sal')}><CountUp value={Math.round(sum(sy, salTot))} format={fmt} /><em>{D.cfg.cur}</em></Kpi>
      <Kpi icon={I.scale} label={'المستلم ' + y} pill={<>{ry.length} استلام <i>|</i> {new Set(ry.map(r => r.mem)).size} فلاح</>} onClick={() => go('rec')}><CountUp value={Math.round(sum(ry, r => r.kg))} format={fmt} /><em>كلغ</em></Kpi>
      <Kpi icon={I.users} label="المنخرطون" pill={<>{act.length} نشيط <i>|</i> {noDues} بدون واجب</>} onClick={() => go('mem')}><CountUp value={D.mem.length} format={fmt} /></Kpi>
      <Kpi icon={I.warn} tone="bad" label="مستحقات الفلاحين" pill={<>{owed.length} فلاح <i>|</i> ديون الزبناء {fmt(rcv)}</>} onClick={() => go('far')}><CountUp value={Math.round(sum(owed, x => x.d.rest))} format={fmt} /><em>{D.cfg.cur}</em></Kpi>
    </div>
    <div className="dgrid">
      <section className="dpanel">
        <h3 className="dp-h">{I.bill}أحدث الاستلامات</h3>
        {last.length ? <div className="tbl-w"><table className="tbl">
          <thead><tr><th>الوصل</th><th className="c-d">التاريخ</th><th>الفلاح</th><th className="c-r">الصنف</th><th>الوزن</th><th>المبلغ</th><th>عرض</th></tr></thead>
          <tbody>{last.map(r => <tr key={r.id}><td><bdi dir="ltr">{r.id}</bdi></td><td className="c-d"><bdi dir="ltr">{r.date}</bdi></td><td className="c-n">{mn(r.mem)}</td><td className="c-r">{gn(r.g)}</td>
            <td><Kg v={r.kg} /></td><td><b><M v={recVal(r)} /></b></td><td><IconBtn i={I.eye} label="وصل الاستلام" onClick={() => printRec(r)} /></td></tr>)}</tbody>
        </table></div> : <Empty>لا توجد استلامات بعد — ابدأ بزر «استلام المحصول»</Empty>}
        <button type="button" className="more" onClick={() => go('rec')}>كل الاستلامات ←</button>
      </section>
      <section className="dpanel al">
        <h3 className="dp-h"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 22 20H2Z" /><path d="M12 10v4M12 17v.5" /></svg>مستحقات للأداء</h3>
        {owed.slice(0, 5).map(({ m, d }) => <button key={m.id} type="button" className="alr" onClick={() => open(<FarmerSheet id={m.id} />)}>
          <span className="alr-i">{I.hand}</span>
          <span className="alr-t"><b>{m.name}</b><small>رقم {m.id} <i>·</i> {D.rec.filter(r => r.mem === m.id).length} استلام</small></span>
          <span className="alr-s wait"><em>متبقي له</em><b><M v={d.rest} /> {D.cfg.cur}</b></span>
        </button>)}
        {!owed.length && <Empty>✔ لا توجد مستحقات متبقية</Empty>}
        {owed.length > 5 && <button type="button" className="more" onClick={() => go('far')}>كل الفلاحين ({owed.length}) ←</button>}
      </section>
    </div>
    <section className="strip" aria-label="الخزينة والمخزون">
      <div className="strip-h"><b>الخزينة</b><small>موسم {y}</small></div>
      <div className="tile tot"><span>الإجمالي</span><b><bdi dir="ltr">{fmt(bal())}</bdi> <em>{D.cfg.cur}</em></b></div>
      <div className="tile"><span>الصندوق</span><b><bdi dir="ltr">{fmt(bal('cash'))}</bdi> <em>{D.cfg.cur}</em></b></div>
      <div className="tile"><span>البنك</span><b><bdi dir="ltr">{fmt(bal('bank'))}</bdi> <em>{D.cfg.cur}</em></b></div>
      <div className="tile"><span>المخزون</span><b><Kg v={tot} /> <em>كلغ</em></b></div>
    </section>
    <p className="rule">{D.cfg.grades.map((g, i) => <span key={g.id}>{i > 0 && <i className="kb-dot" />}{g.n.split(' (')[0]}: <b><Kg v={stock(g.id)} /></b> كلغ</span>)}</p>
    <div className="acts">
      <button type="button" className="act a-n" onClick={() => go('mem')}>{I.people}المنخرطون</button>
      <button type="button" className="act" onClick={() => open(<SalSheet />)}>{I.cash}بيع جديد</button>
      <button type="button" className="act" onClick={() => go('far')}>{I.hand}أداء مستحقات الفلاحين</button>
      <p className="act-n"><b>ⓘ</b> اضغط على أي بطاقة أو سطر لفتح تفاصيله</p>
    </div>
  </div>;
}

function Members() {
  const [q, setQ] = useState(''); const dq = useDeferredValue(q); const [f, setF] = useState('');
  const y = D.cfg.year, t = norm(dq.trim());
  const list = D.mem.filter(m => (!t || [m.id, m.name, m.cin, m.tel, m.douar].some(v => norm(v).includes(t)))
    && (f === '' || (f === 'on' ? m.active !== false : f === 'off' ? m.active === false : m.active !== false && duesPaid(m.id, y) < D.cfg.dues)));
  return <div className="stack">
    <div className="panel toolbar">
      <h2>المنخرطون <span className="cnt">{list.length}</span></h2>
      <button type="button" className="btn pri" onClick={() => open(<MemSheet />)}>＋ منخرط جديد</button>
      <Search q={q} setQ={setQ} ph="بحث بالاسم أو الرقم أو البطاقة أو الدوار" />
      <Chips v={f} set={setF} opts={[['', 'الكل'], ['on', 'نشيط'], ['off', 'متوقف'], ['nd', 'لم يؤدِّ واجب ' + y]]} />
      <div className="kb-acts">
        <button type="button" className="btn" onClick={() => printList('لائحة المنخرطين', ['الرقم', 'الاسم', 'البطاقة', 'الهاتف', 'الدوار', 'الحصص', 'واجب ' + y], list.map(m => [m.id, m.name, m.cin, m.tel, m.douar, m.shares, duesPaid(m.id, y) >= D.cfg.dues ? '✔' : '—']))}>🖨 طباعة اللائحة</button>
        <button type="button" className="btn" onClick={() => exportMembers(list)}>⬇ تصدير Excel</button>
        <label className="btn">⬆ استيراد Excel<input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) importMembers(f); }} /></label>
      </div>
    </div>
    {!list.length ? <Empty>لا يوجد منخرطون مطابقون</Empty> : <div>
      <div className="lh lh-s" aria-hidden="true"><span>المنخرط</span><span>واجب {y}</span></div>
      <ul className="list">{list.map(m => <li key={m.id}><button type="button" className={'row-b' + (m.active === false ? ' kb-off' : '')} onClick={() => open(<MemDetail id={m.id} />)}>
        <Avatar m={m} />
        <span className="row-i"><b>{m.name}</b><small>رقم {m.id}{m.douar ? '، ' + m.douar : ''}{m.tel ? <>، <bdi dir="ltr">{m.tel}</bdi></> : null}</small></span>
        {m.active === false ? <span className="tag">متوقف</span> : duesPaid(m.id, y) >= D.cfg.dues ? <span className="tag good">مؤدى</span> : <span className="tag bad">غير مؤدى</span>}
      </button></li>)}</ul></div>}
  </div>;
}
const MH = ['الرقم', 'الاسم الكامل', 'رقم البطاقة', 'الهاتف', 'الدوار', 'تاريخ الانخراط', 'عدد الحصص', 'الحالة'];
function exportMembers(list) {
  const y = D.cfg.year;
  csv('adherents-' + today(), [...MH, 'واجب ' + y, 'المتبقي له'], list.map(m => [m.id, m.name, m.cin || '', m.tel || '', m.douar || '', m.date || '', +m.shares || 0,
    m.active === false ? 'متوقف' : 'نشيط', Math.round(duesPaid(m.id, y) * 100) / 100, Math.round(due(m.id).rest * 100) / 100]));
}
const ALIAS = {
  id: ['الرقم', 'رقم', 'رقم المنخرط', 'ر.ت', 'n', 'n°', 'no', 'id', 'numero', 'numéro'],
  name: ['الاسم الكامل', 'الاسم', 'الإسم', 'الاسم والنسب', 'اسم المنخرط', 'nom', 'nom complet', 'nom et prenom', 'nom et prénom', 'name'],
  cin: ['رقم البطاقة', 'البطاقة', 'رقم البطاقة الوطنية', 'البطاقة الوطنية', 'cin', 'cni'],
  tel: ['الهاتف', 'هاتف', 'رقم الهاتف', 'tel', 'tél', 'telephone', 'téléphone', 'phone', 'gsm'],
  douar: ['الدوار', 'دوار', 'العنوان', 'douar', 'adresse'],
  date: ['تاريخ الانخراط', 'التاريخ', 'date', "date d'adhésion", 'date adhesion'],
  shares: ['عدد الحصص', 'الحصص', 'parts', 'nb parts'],
  active: ['الحالة', 'actif', 'statut'],
};
const hkey = h => { const t = norm(String(h).trim()).replace(/\s+/g, ' '); for (const k in ALIAS) if (ALIAS[k].some(a => norm(a) === t)) return k; return null; };
function toDate(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return d.toISOString().slice(0, 10); }
  const s = String(v ?? '').trim(); let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
  return '';
}
async function importMembers(file) {
  let rows; try { rows = await readSheet(file); } catch (e) { return alert('تعذرت قراءة الملف: ' + e.message); }
  rows = rows.filter(r => r.some(c => String(c).trim() !== ''));
  const hi = rows.slice(0, 6).findIndex(r => r.some(c => hkey(c) === 'name'));
  if (hi < 0) return alert('لم أجد عمود «الاسم» في الملف.\nيجب أن يحتوي السطر الأول على عناوين الأعمدة، مثل: الاسم الكامل، رقم البطاقة، الهاتف، الدوار.\nنصيحة: صدّر اللائحة أولاً واستعمل نفس الملف كنموذج.');
  const cols = {}; rows[hi].forEach((h, j) => { const k = hkey(h); if (k && cols[k] == null) cols[k] = j; });
  const get = (r, k) => cols[k] == null ? '' : r[cols[k]] ?? '';
  const seenC = new Set(), seenN = new Set(), plan = [];
  rows.slice(hi + 1).forEach((r, i) => {
    const line = hi + i + 2, name = String(get(r, 'name')).trim();
    if (!name) { plan.push({ line, st: 'skip', why: 'بدون اسم', o: { name: '—' } }); return; }
    const o = { name, cin: String(get(r, 'cin')).trim(), tel: String(get(r, 'tel')).trim(), douar: String(get(r, 'douar')).trim(), date: toDate(get(r, 'date')),
      shares: cols.shares != null && String(get(r, 'shares')).trim() !== '' ? num(get(r, 'shares')) : null,
      active: cols.active != null && String(get(r, 'active')).trim() !== '' ? !/^(متوقف|0|non|inactif|false|لا)$/i.test(String(get(r, 'active')).trim()) : null };
    const kc = norm(o.cin), kn = norm(name).replace(/\s+/g, ' ');
    if ((kc && seenC.has(kc)) || (!kc && seenN.has(kn))) { plan.push({ line, st: 'skip', why: 'مكرر في الملف', o }); return; }
    if (kc) seenC.add(kc); seenN.add(kn);
    const fid = num(get(r, 'id'));
    const ex = (kc && D.mem.find(m => norm(m.cin) === kc)) || (fid && D.mem.find(m => m.id === fid && norm(m.name).replace(/\s+/g, ' ') === kn)) || D.mem.find(m => norm(m.name).replace(/\s+/g, ' ') === kn && (!kc || !m.cin));
    plan.push({ line, st: ex ? 'upd' : 'new', o, id: ex && ex.id });
  });
  if (!plan.some(p => p.st !== 'skip')) return alert('لا توجد أسطر صالحة للاستيراد في هذا الملف.');
  open(<ImportSheet plan={plan} file={file.name} cols={Object.keys(cols)} />);
}
function ImportSheet({ plan, file, cols }) {
  const [cap, setCap] = useState(false);
  const n = k => plan.filter(p => p.st === k).length;
  const go = () => {
    flush(); try { localStorage.setItem(K + 'pre', JSON.stringify(D)); } catch { /* */ }
    upd(D => plan.forEach(p => {
      if (p.st === 'skip') return; const o = { ...p.o };
      if (p.st === 'upd') { const m = D.mem.find(x => x.id === p.id); for (const k of ['cin', 'tel', 'douar', 'date']) if (o[k]) m[k] = o[k]; if (o.shares != null) m.shares = o.shares; if (o.active != null) m.active = o.active; m.name = o.name; return; }
      const m = { id: seq(D.mem), name: o.name, cin: o.cin, tel: o.tel, douar: o.douar, date: o.date || today(), shares: o.shares ?? 0, active: o.active ?? true };
      D.mem.push(m);
      if (cap && m.shares > 0) D.cash.push({ id: seq(D.cash), date: m.date, cat: 'cap', amt: m.shares * D.cfg.share, mode: 'cash', mem: m.id, note: m.shares + ' حصة (استيراد)' });
    }));
    close(); alert('✔ تم الاستيراد: ' + n('new') + ' منخرط جديد، ' + n('upd') + ' تحديث.');
  };
  const T = { new: ['جديد', 'good'], upd: ['تحديث', 'kb-wait'], skip: ['متجاهَل', 'bad'] };
  return <Sheet title="استيراد المنخرطين من Excel" sub={file} onClose={close}>
    <dl className="facts"><div><dt>منخرطون جدد</dt><dd className="good">{n('new')}</dd></div><div><dt>تحديث معلومات</dt><dd>{n('upd')}</dd></div><div><dt>أسطر متجاهَلة</dt><dd className={n('skip') ? 'bad' : ''}>{n('skip')}</dd></div></dl>
    <p className="note">الأعمدة المعروفة: {cols.map(k => ({ id: 'الرقم', name: 'الاسم', cin: 'البطاقة', tel: 'الهاتف', douar: 'الدوار', date: 'التاريخ', shares: 'الحصص', active: 'الحالة' }[k])).join('، ')}. المنخرط الموجود يُعرف برقم البطاقة أو بالاسم، فتُحدَّث معلوماته ولا يتكرر.</p>
    <div className="tbl-w kb-p0"><table className="tbl"><thead><tr><th>السطر</th><th>الاسم</th><th>البطاقة</th><th>الحالة</th></tr></thead>
      <tbody>{plan.slice(0, 200).map(p => <tr key={p.line}><td>{p.line}</td><td className="c-n">{p.o.name}</td><td>{p.o.cin || '—'}</td><td><span className={'tag ' + T[p.st][1]}>{T[p.st][0]}{p.why ? ' — ' + p.why : ''}</span></td></tr>)}</tbody></table></div>
    {plan.length > 200 && <p className="note">… و{plan.length - 200} سطر آخر</p>}
    {n('new') > 0 && <label className="chk kb-mt"><input type="checkbox" checked={cap} onChange={e => setCap(e.target.checked)} /> تسجيل قيمة حصص المنخرطين الجدد في الصندوق</label>}
    <div className="row"><button type="button" className="btn pri" onClick={go} disabled={!n('new') && !n('upd')}>استيراد {n('new') + n('upd')} منخرط</button><button type="button" className="btn ghost" onClick={close}>إلغاء</button></div>
  </Sheet>;
}
function MemDetail({ id }) {
  useStore(); const m = memOf(id); if (!m) return null;
  const y = D.cfg.year, d = due(id), dp = duesPaid(id, y);
  const rs = D.rec.filter(r => r.mem === id).sort(byDate).reverse();
  return <Sheet title={m.name} sub={'منخرط رقم ' + m.id + (m.active === false ? ' — متوقف' : '')} onClose={close}>
    <dl className="facts">
      <div><dt>الهاتف</dt><dd><bdi dir="ltr">{m.tel || '—'}</bdi></dd></div>
      <div><dt>البطاقة</dt><dd>{m.cin || '—'}</dd></div>
      <div><dt>الدوار</dt><dd>{m.douar || '—'}</dd></div>
      <div><dt>الحصص</dt><dd>{m.shares || 0}</dd></div>
      <div><dt>واجب {y}</dt><dd className={dp >= D.cfg.dues ? 'good' : 'bad'}><M v={dp} /></dd></div>
      <div><dt>المتبقي له</dt><dd className={d.rest > 0.004 ? 'bad' : 'good'}><M v={d.rest} /> {D.cfg.cur}</dd></div>
    </dl>
    <div className="row">
      <button type="button" className="btn pri" onClick={() => open(<RecSheet mem={id} />)}>＋ استلام محصول</button>
      {dp < D.cfg.dues && <button type="button" className="btn pay" onClick={() => open(<CashSheet preset={{ cat: 'dues', mem: id, amt: D.cfg.dues - dp, lock: 1, title: 'أداء واجب ' + y + ' — ' + m.name }} />)}>أداء الواجب</button>}
      <button type="button" className="btn" onClick={() => printSt(id)}>🖨 كشف الحساب</button>
      <button type="button" className="btn" onClick={() => open(<MemSheet m={m} />)}>✎ تعديل المعلومات</button>
      <button type="button" className="btn ghost danger" onClick={() => {
        if (D.rec.some(r => r.mem === id) || D.cash.some(c => c.mem === id)) return alert('لا يمكن حذف منخرط له عمليات. اجعله «متوقفاً» من زر التعديل.');
        confirmDel('حذف المنخرط «' + m.name + '»؟', D => { D.mem = D.mem.filter(x => x.id !== id); }); close(); }}>🗑 حذف</button>
    </div>
    <h4>الاستلامات</h4>
    {!rs.length ? <Empty>لا توجد استلامات</Empty> : <div className="tbl-w kb-p0"><table className="tbl"><thead><tr><th>الوصل</th><th>التاريخ</th><th>الصنف</th><th>الوزن</th><th>المبلغ</th></tr></thead>
      <tbody>{rs.map(r => <tr key={r.id} className="click" onClick={() => printRec(r)}><td>{r.id}</td><td><bdi dir="ltr">{r.date}</bdi></td><td>{gn(r.g)}</td><td><Kg v={r.kg} /></td><td><M v={recVal(r)} /></td></tr>)}</tbody></table></div>}
  </Sheet>;
}

const yRange = () => ({ a: D.cfg.year + '-01-01', b: D.cfg.year + '-12-31' });
const inR = (d, r) => (!r.a || d >= r.a) && (!r.b || d <= r.b);
const Range = ({ r, set }) => <><label>من<input type="date" value={r.a} onChange={e => set({ ...r, a: e.target.value })} /></label><label>إلى<input type="date" value={r.b} onChange={e => set({ ...r, b: e.target.value })} /></label></>;

function Receptions() {
  const [r, setR] = useState(yRange); const [m, setM] = useState(''); const [g, setG] = useState('');
  const list = D.rec.filter(x => inR(x.date, r) && (!m || x.mem == m) && (!g || x.g == g)).sort(byDate).reverse();
  return <div className="stack">
    <section className="panel">
      <Head title="استلام المحصول" cnt={list.length}><button type="button" className="btn pri" onClick={() => open(<RecSheet />)}>＋ استلام جديد</button></Head>
      <div className="filters"><Range r={r} set={setR} /><label className="grow">الفلاح<MemSel v={m} set={setM} all /></label><label>الصنف<GSel v={g} set={setG} all /></label></div>
      <div className="sums"><div><span>عدد الاستلامات</span><b>{list.length}</b></div><div><span>الوزن (كلغ)</span><b><Kg v={sum(list, x => x.kg)} /></b></div><div><span>القيمة ({D.cfg.cur})</span><b><M v={sum(list, recVal)} /></b></div></div>
      <div className="kb-acts">
        <button type="button" className="btn" onClick={() => printList('سجل استلام المحصول', ['الوصل', 'التاريخ', 'الفلاح', 'الصنف', 'الوزن', 'الثمن', 'المبلغ'], list.map(x => [x.id, fd(x.date), mn(x.mem), gn(x.g), kg(x.kg), n2(x.p), n2(recVal(x))]), ['', '', '', 'المجموع', kg(sum(list, x => x.kg)), '', n2(sum(list, recVal))])}>🖨 طباعة السجل</button>
        <button type="button" className="btn" onClick={() => csv('receptions', ['N', 'Date', 'Adherent', 'Calibre', 'Kg', 'Prix', 'Montant'], list.map(x => [x.id, x.date, mn(x.mem), gn(x.g), x.kg, x.p, recVal(x)]))}>⬇ Excel</button>
      </div>
    </section>
    <section className="dpanel">{!list.length ? <Empty>لا توجد استلامات في هذه الفترة</Empty> : <div className="tbl-w"><table className="tbl">
      <thead><tr><th>الوصل</th><th className="c-d">التاريخ</th><th>الفلاح</th><th className="c-r">الصنف</th><th>الوزن</th><th className="c-r">الثمن</th><th>المبلغ</th><th>إجراءات</th></tr></thead>
      <tbody>{list.map(x => <tr key={x.id}><td><bdi dir="ltr">{x.id}</bdi></td><td className="c-d"><bdi dir="ltr">{x.date}</bdi></td><td className="c-n">{mn(x.mem)}</td><td className="c-r">{gn(x.g)}</td><td><Kg v={x.kg} /></td><td className="c-r"><M v={x.p} /></td><td><b><M v={recVal(x)} /></b></td>
        <td className="kb-nw"><IconBtn i={I.eye} label="الوصل" onClick={() => printRec(x)} /><IconBtn i={I.pen} label="تعديل" onClick={() => open(<RecSheet r={x} />)} /><IconBtn i={I.trash} cls="kb-del" label="حذف" onClick={() => confirmDel('حذف الاستلام رقم ' + x.id + '؟', D => { D.rec = D.rec.filter(y => y.id !== x.id); })} /></td></tr>)}</tbody>
    </table></div>}</section>
  </div>;
}

function Farmers() {
  const [q, setQ] = useState(''); const dq = useDeferredValue(q); const [f, setF] = useState('owe');
  const y = D.cfg.year, t = norm(dq.trim());
  const rows = D.mem.filter(m => !t || [m.id, m.name, m.douar].some(v => norm(v).includes(t))).map(m => ({ m, d: due(m.id), ky: sum(D.rec.filter(r => r.mem === m.id && inY(r.date, y)), r => r.kg) }))
    .filter(x => f === '' || (f === 'owe' ? x.d.rest > 0.004 : x.d.rest <= 0.004)).sort((a, b) => b.d.rest - a.d.rest);
  return <div className="stack">
    <div className="panel toolbar">
      <h2>مستحقات الفلاحين <span className="cnt">{rows.length}</span></h2>
      <div className="bal">
        <div><span>قيمة المحصول</span><b><bdi dir="ltr">{fmt(sum(rows, x => x.d.val))}</bdi></b><small>مع نصيب التوزيع</small></div>
        <div><span>المدفوع</span><b><bdi dir="ltr">{fmt(sum(rows, x => x.d.paid))}</bdi></b><small>أداءات وتسبيقات</small></div>
        <div className="tot"><span>المتبقي للفلاحين</span><b><bdi dir="ltr">{fmt(sum(rows, x => x.d.rest))}</bdi> {D.cfg.cur}</b><small>{rows.filter(x => x.d.rest > 0.004).length} فلاح</small></div>
      </div>
      <Search q={q} setQ={setQ} ph="بحث بالاسم أو الرقم أو الدوار" />
      <Chips v={f} set={setF} opts={[['owe', 'لهم مستحقات'], ['ok', 'مُسوّاة'], ['', 'الكل']]} />
      <div className="kb-acts"><button type="button" className="btn" onClick={() => printList('مستحقات الفلاحين', ['الرقم', 'الاسم', 'كمية ' + y, 'القيمة', 'المدفوع', 'المتبقي'], rows.map(({ m, d, ky }) => [m.id, m.name, kg(ky), n2(d.val), n2(d.paid), n2(d.rest)]), ['', 'المجموع', kg(sum(rows, x => x.ky)), n2(sum(rows, x => x.d.val)), n2(sum(rows, x => x.d.paid)), n2(sum(rows, x => x.d.rest))])}>🖨 طباعة</button></div>
    </div>
    {!rows.length ? <Empty>لا يوجد فلاحون في هذه القائمة</Empty> : <div>
      <div className="lh lh-s" aria-hidden="true"><span>الفلاح</span><span>المتبقي له</span></div>
      <ul className="list">{rows.map(({ m, d, ky }) => <li key={m.id}><button type="button" className="row-b" onClick={() => open(<FarmerSheet id={m.id} />)}>
        <Avatar m={m} />
        <span className="row-i"><b>{m.name}</b><small><Kg v={ky} /> كلغ في {y}، المدفوع <bdi dir="ltr">{n2(d.paid)}</bdi></small></span>
        {d.rest > 0.004 ? <span className="tag kb-wait"><M v={d.rest} /> {D.cfg.cur}</span> : <span className="tag good">مُسوّى</span>}
      </button></li>)}</ul></div>}
  </div>;
}
function FarmerSheet({ id }) {
  useStore(); const m = memOf(id); if (!m) return null;
  const d = due(id), y = D.cfg.year;
  const ps = D.cash.filter(c => (c.cat === 'adv' || c.cat === 'pay') && c.mem === id).sort(byDate).reverse();
  return <Sheet title={m.name} sub={'حساب الفلاح رقم ' + m.id} onClose={close}>
    <dl className="facts">
      <div><dt>كمية {y}</dt><dd><Kg v={sum(D.rec.filter(r => r.mem === id && inY(r.date, y)), r => r.kg)} /> كلغ</dd></div>
      <div><dt>القيمة</dt><dd><M v={d.val} /></dd></div>
      <div><dt>المدفوع</dt><dd><M v={d.paid} /></dd></div>
      <div><dt>المتبقي له</dt><dd className={d.rest > 0.004 ? 'bad' : 'good'}><M v={d.rest} /> {D.cfg.cur}</dd></div>
      <div><dt>الاستلامات</dt><dd>{D.rec.filter(r => r.mem === id).length}</dd></div>
      <div><dt>الهاتف</dt><dd><bdi dir="ltr">{m.tel || '—'}</bdi></dd></div>
    </dl>
    <div className="row">
      {d.rest > 0.004 && <button type="button" className="btn pay" onClick={() => open(<CashSheet preset={{ cat: 'pay', mem: id, amt: d.rest, lock: 1, title: 'أداء مستحقات — ' + m.name }} />)}>أداء المستحقات</button>}
      <button type="button" className="btn" onClick={() => open(<CashSheet preset={{ cat: 'adv', mem: id, lock: 1, title: 'تسبيق — ' + m.name }} />)}>تسبيق</button>
      <button type="button" className="btn" onClick={() => printSt(id)}>🖨 كشف الحساب</button>
    </div>
    <h4>الأداءات والتسبيقات</h4>
    {!ps.length ? <Empty>لا توجد أداءات بعد</Empty> : <ul className="rows">{ps.map(c => <li key={c.id}><div className="fr kb-fr">
      <span className="fr-t t-out">−</span><span className="fr-i"><b>{CAT[c.cat]}</b><small><bdi dir="ltr">{c.date}</bdi>، {c.mode === 'bank' ? 'البنك' : 'الصندوق'}{c.note ? '، ' + c.note : ''}</small></span>
      <span className="fr-a"><M v={c.amt} /></span></div></li>)}</ul>}
  </Sheet>;
}

function Sales() {
  const [r, setR] = useState(yRange); const [f, setF] = useState('');
  const pd = x => paidRef('sale', x.id);
  const list = D.sal.filter(x => inR(x.date, r) && (f === '' || (f === 'due') === (salTot(x) - pd(x) > 0.004))).sort(byDate).reverse();
  const T = sum(list, salTot), P = sum(list, pd);
  return <div className="stack">
    <section className="panel">
      <Head title="المبيعات" cnt={list.length}><button type="button" className="btn pri" onClick={() => open(<SalSheet />)}>＋ بيع جديد</button></Head>
      <div className="filters"><Range r={r} set={setR} /></div>
      <Chips v={f} set={setF} opts={[['', 'الكل'], ['due', 'غير مؤداة'], ['ok', 'مؤداة']]} />
      <div className="sums"><div><span>المبيعات ({D.cfg.cur})</span><b><M v={T} /></b></div><div><span>المحصَّل</span><b><M v={P} /></b></div><div><span>الباقي عند الزبناء</span><b className={T - P > 0.004 ? 'bad' : ''}><M v={T - P} /></b></div></div>
      <div className="kb-acts">
        <button type="button" className="btn" onClick={() => printList('سجل المبيعات', ['الرقم', 'التاريخ', 'الزبون', 'الصنف', 'الوزن', 'الثمن', 'المجموع', 'المؤدى', 'الباقي'], list.map(x => [x.id, fd(x.date), x.cl, gn(x.g), kg(x.kg), n2(x.p), n2(salTot(x)), n2(pd(x)), n2(salTot(x) - pd(x))]), ['', '', '', 'المجموع', kg(sum(list, x => x.kg)), '', n2(T), n2(P), n2(T - P)])}>🖨 طباعة السجل</button>
        <button type="button" className="btn" onClick={() => csv('ventes', ['N', 'Date', 'Client', 'Calibre', 'Kg', 'Prix', 'Total', 'Paye', 'Reste'], list.map(x => [x.id, x.date, x.cl, gn(x.g), x.kg, x.p, salTot(x), pd(x), salTot(x) - pd(x)]))}>⬇ Excel</button>
      </div>
    </section>
    <section className="dpanel">{!list.length ? <Empty>لا توجد مبيعات في هذه الفترة</Empty> : <div className="tbl-w"><table className="tbl">
      <thead><tr><th>الرقم</th><th className="c-d">التاريخ</th><th>الزبون</th><th className="c-r">الصنف</th><th>الوزن</th><th>المجموع</th><th>الحالة</th><th>إجراءات</th></tr></thead>
      <tbody>{list.map(x => { const rest = salTot(x) - pd(x); return <tr key={x.id}><td>{x.id}</td><td className="c-d"><bdi dir="ltr">{x.date}</bdi></td><td className="c-n">{x.cl}</td><td className="c-r">{gn(x.g)}</td><td><Kg v={x.kg} /></td><td><b><M v={salTot(x)} /></b></td>
        <td>{rest > 0.004 ? <span className="tag bad">باقي <M v={rest} /></span> : <span className="tag good">مؤداة</span>}</td>
        <td className="kb-nw">{rest > 0.004 && <IconBtn i={I.cash} label="تحصيل" onClick={() => open(<CashSheet preset={{ cat: 'sale', ref: x.id, amt: rest, lock: 1, title: 'تحصيل — ' + x.cl }} />)} />}
          <IconBtn i={I.eye} label="الفاتورة" onClick={() => printSal(x)} />
          <IconBtn i={I.trash} cls="kb-del" label="حذف" onClick={() => confirmDel('حذف البيع رقم ' + x.id + ' وتحصيلاته؟', D => { D.sal = D.sal.filter(y => y.id !== x.id); D.cash = D.cash.filter(c => !(c.cat === 'sale' && c.ref === x.id)); })} /></td></tr>; })}</tbody>
    </table></div>}</section>
  </div>;
}

function Purchases() {
  const [r, setR] = useState(yRange);
  const pd = x => paidRef('pur', x.id);
  const list = D.pur.filter(x => inR(x.date, r)).sort(byDate).reverse();
  const T = sum(list, purTot), P = sum(list, pd);
  const items = [...new Set(list.map(x => x.item))];
  return <div className="stack">
    <section className="panel">
      <Head title="المشتريات" cnt={list.length}><button type="button" className="btn pri" onClick={() => open(<PurSheet />)}>＋ شراء جديد</button></Head>
      <div className="filters"><Range r={r} set={setR} /></div>
      <div className="sums"><div><span>المشتريات ({D.cfg.cur})</span><b><M v={T} /></b></div><div><span>المؤدى</span><b><M v={P} /></b></div><div><span>الباقي للموردين</span><b className={T - P > 0.004 ? 'bad' : ''}><M v={T - P} /></b></div></div>
      {items.length > 0 && <p className="note">{items.map(it => it + ': ' + kg(sum(list.filter(x => x.item === it), x => x.q))).join('  ·  ')}</p>}
      <div className="kb-acts">
        <button type="button" className="btn" onClick={() => printList('سجل المشتريات', ['الرقم', 'التاريخ', 'المورد', 'المادة', 'الكمية', 'ثمن الوحدة', 'المجموع', 'الباقي'], list.map(x => [x.id, fd(x.date), x.sup, x.item, kg(x.q), n2(x.p), n2(purTot(x)), n2(purTot(x) - pd(x))]), ['', '', '', '', '', 'المجموع', n2(T), n2(T - P)])}>🖨 طباعة السجل</button>
        <button type="button" className="btn" onClick={() => csv('achats', ['N', 'Date', 'Fournisseur', 'Article', 'Qte', 'PU', 'Total', 'Paye'], list.map(x => [x.id, x.date, x.sup, x.item, x.q, x.p, purTot(x), pd(x)]))}>⬇ Excel</button>
      </div>
    </section>
    <section className="dpanel">{!list.length ? <Empty>لا توجد مشتريات في هذه الفترة</Empty> : <div className="tbl-w"><table className="tbl">
      <thead><tr><th>الرقم</th><th className="c-d">التاريخ</th><th>المادة</th><th className="c-r">المورد</th><th>الكمية</th><th>المجموع</th><th>الحالة</th><th>إجراءات</th></tr></thead>
      <tbody>{list.map(x => { const rest = purTot(x) - pd(x); return <tr key={x.id}><td>{x.id}</td><td className="c-d"><bdi dir="ltr">{x.date}</bdi></td><td className="c-n">{x.item}</td><td className="c-r">{x.sup || '—'}</td><td><Kg v={x.q} /></td><td><b><M v={purTot(x)} /></b></td>
        <td>{rest > 0.004 ? <span className="tag bad">باقي <M v={rest} /></span> : <span className="tag good">مؤداة</span>}</td>
        <td className="kb-nw">{rest > 0.004 && <IconBtn i={I.cash} label="أداء" onClick={() => open(<CashSheet preset={{ cat: 'pur', ref: x.id, amt: rest, lock: 1, title: 'أداء — ' + x.item }} />)} />}
          <IconBtn i={I.trash} cls="kb-del" label="حذف" onClick={() => confirmDel('حذف الشراء رقم ' + x.id + ' وأداءاته؟', D => { D.pur = D.pur.filter(y => y.id !== x.id); D.cash = D.cash.filter(c => !(c.cat === 'pur' && c.ref === x.id)); })} /></td></tr>; })}</tbody>
    </table></div>}</section>
  </div>;
}

const MO = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
function Cash() {
  const ys = [...new Set(D.cash.map(c => +c.date.slice(0, 4)).concat(new Date().getFullYear(), +D.cfg.year))].sort((a, b) => b - a);
  const [y, setY] = useState(new Date().getFullYear()); const [mo, setMo] = useState(''); const [k, setK] = useState('');
  const s = mo === '' ? y + '-01-01' : y + '-' + pad(+mo + 1) + '-01', e = mo === '' ? y + '-12-31' : y + '-' + pad(+mo + 1) + '-31';
  const all = D.cash.slice().sort(byDate);
  const openB = m => sum(all.filter(c => c.date < s && c.mode === m), c => sg(c) * c.amt);
  const L = all.filter(c => c.date >= s && c.date <= e);
  const closeB = m => openB(m) + sum(L.filter(c => c.mode === m), c => sg(c) * c.amt);
  const tin = sum(L.filter(c => sg(c) > 0), c => c.amt), tout = sum(L.filter(c => sg(c) < 0), c => c.amt);
  const shown = L.filter(c => !k || (k === 'in') === (sg(c) > 0)).reverse();
  const who = c => c.mem ? mn(c.mem) : c.cat === 'sale' ? ((D.sal.find(x => x.id === c.ref) || {}).cl || '') : c.cat === 'pur' ? ((D.pur.find(x => x.id === c.ref) || {}).item || '') : '';
  return <div className="stack">
    <section className="panel">
      <Head title="المالية"><button type="button" className="btn pri" onClick={() => open(<CashSheet />)}>＋ عملية جديدة</button></Head>
      <div className="filters">
        <label>السنة<select value={y} onChange={e2 => setY(+e2.target.value)}>{ys.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        <label>الشهر<select value={mo} onChange={e2 => setMo(e2.target.value)}><option value="">السنة كاملة</option>{MO.map((n, i) => <option key={i} value={i}>{n}</option>)}</select></label>
        <label>النوع<select value={k} onChange={e2 => setK(e2.target.value)}><option value="">الكل</option><option value="in">مداخيل</option><option value="out">مصاريف</option></select></label>
      </div>
      <div className="bal">
        <div><span>الصندوق</span><b><bdi dir="ltr">{fmt(closeB('cash'))}</bdi></b><small>في بداية الفترة <bdi dir="ltr">{fmt(openB('cash'))}</bdi></small></div>
        <div><span>البنك</span><b><bdi dir="ltr">{fmt(closeB('bank'))}</bdi></b><small>في بداية الفترة <bdi dir="ltr">{fmt(openB('bank'))}</bdi></small></div>
        <div className="tot"><span>المجموع</span><b><bdi dir="ltr">{fmt(closeB('cash') + closeB('bank'))}</bdi> {D.cfg.cur}</b><small>المداخيل <bdi dir="ltr">{fmt(tin)}</bdi>، المصاريف <bdi dir="ltr">{fmt(tout)}</bdi></small></div>
      </div>
      <div className="kb-acts">
        <button type="button" className="btn" onClick={() => printList('سجل المالية ' + (mo === '' ? y : MO[mo] + ' ' + y), ['التاريخ', 'النوع', 'البيان', 'الطريقة', 'مدخول', 'مصروف'], shown.slice().reverse().map(c => [fd(c.date), CAT[c.cat], who(c) + (c.note ? ' ' + c.note : ''), c.mode === 'bank' ? 'بنك' : 'صندوق', sg(c) > 0 ? n2(c.amt) : '', sg(c) < 0 ? n2(c.amt) : '']), ['', '', '', 'المجموع', n2(tin), n2(tout)])}>🖨 طباعة</button>
        <button type="button" className="btn" onClick={() => csv('finances', ['Date', 'Categorie', 'Ref', 'Mode', 'Recette', 'Depense'], shown.slice().reverse().map(c => [c.date, CAT[c.cat], who(c) + ' ' + (c.note || ''), c.mode, sg(c) > 0 ? c.amt : '', sg(c) < 0 ? c.amt : '']))}>⬇ Excel</button>
      </div>
    </section>
    {!shown.length ? <Empty>لا توجد عمليات في هذه الفترة.</Empty> : <div>
      <div className="lh lh-f" aria-hidden="true"><span>النوع</span><span>البيان</span><span>المبلغ ({D.cfg.cur})</span></div>
      <ul className="rows">{shown.map(c => <li key={c.id}><button type="button" className="fr" onClick={() => open(<CashDetail id={c.id} who={who(c)} />)}>
        <span className={'fr-t ' + (sg(c) > 0 ? 't-in' : 't-out')}>{sg(c) > 0 ? '+' : '−'}</span>
        <span className="fr-i"><b>{CAT[c.cat]}{who(c) ? ' — ' + who(c) : ''}</b><small><bdi dir="ltr">{c.date}</bdi>، {c.mode === 'bank' ? 'البنك' : 'الصندوق'}{c.note ? '، ' + c.note : ''}</small></span>
        <span className={'fr-a ' + (sg(c) > 0 ? 't-in' : 't-out')}><M v={c.amt} /></span>
      </button></li>)}</ul></div>}
  </div>;
}
function CashDetail({ id, who }) {
  const c = D.cash.find(x => x.id === id); if (!c) return null;
  return <Sheet title={CAT[c.cat]} sub={who} onClose={close}>
    <dl className="facts">
      <div><dt>المبلغ</dt><dd className={sg(c) > 0 ? 'good' : 'bad'}><M v={c.amt} /> {D.cfg.cur}</dd></div>
      <div><dt>التاريخ</dt><dd><bdi dir="ltr">{c.date}</bdi></dd></div>
      <div><dt>الطريقة</dt><dd>{c.mode === 'bank' ? 'البنك' : 'الصندوق'}</dd></div>
    </dl>
    {c.note && <p className="note">{c.note}</p>}
    <div className="row"><button type="button" className="btn ghost danger" onClick={() => { if (confirm('حذف هذه العملية؟')) { upd(D => { D.cash = D.cash.filter(x => x.id !== id); }); close(); } }}>🗑 حذف العملية</button>
      <button type="button" className="btn" onClick={close}>إغلاق</button></div>
  </Sheet>;
}

function distCalc(y, basis) {
  const rev = sum(D.sal.filter(s => inY(s.date, y)), salTot);
  const oth = sum(D.cash.filter(c => (c.cat === 'inc' || c.cat === 'sub') && inY(c.date, y)), c => c.amt);
  const mat = sum(D.rec.filter(r => inY(r.date, y)), recVal);
  const pur = sum(D.pur.filter(p => inY(p.date, y)), purTot);
  const exp = sum(D.cash.filter(c => EXP.includes(c.cat) && inY(c.date, y)), c => c.amt);
  const surplus = rev + oth - mat - pur - exp;
  const reserve = Math.max(0, surplus) * (+D.cfg.reserve || 0) / 100;
  const dist = Math.max(0, surplus - reserve);
  const base = m => basis === 'sh' ? (+m.shares || 0) : sum(D.rec.filter(r => r.mem == m.id && inY(r.date, y)), r => r.kg);
  const ms = D.mem.map(m => ({ m, b: base(m) })).filter(x => x.b > 0), tb = sum(ms, x => x.b);
  ms.forEach(x => { x.pct = tb ? x.b / tb : 0; x.amt = Math.round(dist * x.pct * 100) / 100; });
  return { rev, oth, mat, pur, exp, surplus, reserve, dist, ms, tb };
}
function Dist() {
  const [y, setY] = useState(String(D.cfg.year)); const [b, setB] = useState('kg');
  const c = distCalc(y, b), done = D.bon.filter(x => String(x.year) === y);
  const lines = [['رقم المعاملات (المبيعات)', c.rev], ['مداخيل أخرى ومنح', c.oth], ['قيمة المحصول المستلم من الفلاحين', -c.mat], ['المشتريات', -c.pur], ['مصاريف التسيير', -c.exp]];
  const pages = () => <Pg title={'توزيع الفائض — ' + y} sub={b === 'sh' ? 'حسب الحصص' : 'حسب الكمية المسلَّمة'} sign={['الرئيس', 'أمين المال']}>
    <table className="ktb"><tbody>{lines.map(([l, v]) => <tr key={l}><td>{l}</td><td>{n2(v)}</td></tr>)}
      <tr className="kt"><td>الفائض</td><td>{n2(c.surplus)}</td></tr><tr><td>الاحتياطي ({D.cfg.reserve}%)</td><td>{n2(-c.reserve)}</td></tr><tr className="kt"><td>القابل للتوزيع</td><td>{n2(c.dist)}</td></tr></tbody></table>
    <div className="kbr">الأنصبة</div>
    <table className="ktb"><tbody><tr><th>الرقم</th><th>الاسم</th><th>{b === 'sh' ? 'الحصص' : 'الكمية (كلغ)'}</th><th>النسبة</th><th>النصيب (د.م)</th></tr>
      {c.ms.map(x => <tr key={x.m.id}><td>{x.m.id}</td><td>{x.m.name}</td><td>{kg(x.b)}</td><td>{(x.pct * 100).toFixed(2)}%</td><td>{n2(x.amt)}</td></tr>)}
      <tr className="kt"><td colSpan={2}>المجموع</td><td>{kg(c.tb)}</td><td>100%</td><td>{n2(sum(c.ms, x => x.amt))}</td></tr></tbody></table>
  </Pg>;
  return <div className="stack">
    <section className="panel">
      <Head title="توزيع الفائض" />
      <div className="filters">
        <label>السنة<input type="number" value={y} onChange={e => setY(e.target.value)} /></label>
        <label className="grow">أساس التوزيع<select value={b} onChange={e => setB(e.target.value)}><option value="kg">حسب الكمية المسلَّمة</option><option value="sh">حسب الحصص</option></select></label>
      </div>
      <div className="bal">
        <div><span>الفائض</span><b className={c.surplus < 0 ? 'bad' : ''}><bdi dir="ltr">{fmt(c.surplus)}</bdi></b><small>المداخيل ناقص التكاليف</small></div>
        <div><span>الاحتياطي ({D.cfg.reserve}%)</span><b><bdi dir="ltr">{fmt(c.reserve)}</bdi></b><small>يبقى في التعاونية</small></div>
        <div className="tot"><span>القابل للتوزيع</span><b><bdi dir="ltr">{fmt(c.dist)}</bdi> {D.cfg.cur}</b><small>على {c.ms.length} منخرط</small></div>
      </div>
      {done.length > 0 && <p className="state">✔ توزيع {y} معتمد: <M v={sum(done, x => x.amt)} /> {D.cfg.cur} أُضيفت إلى مستحقات الفلاحين</p>}
      <div className="kb-acts">
        <button type="button" className="btn pri" disabled={!c.ms.length || c.dist <= 0} onClick={() => {
          if (!confirm('اعتماد توزيع ' + y + '؟ سيُضاف نصيب كل منخرط إلى مستحقاته.' + (done.length ? '\n(يعوّض التوزيع السابق لهذه السنة)' : ''))) return;
          upd(D => { D.bon = D.bon.filter(x => String(x.year) !== y).concat(c.ms.map(x => ({ year: +y, mem: x.m.id, amt: x.amt }))); });
        }}>✔ اعتماد التوزيع</button>
        <button type="button" className="btn" onClick={() => printDoc(pages(), 'توزيع الفائض')}>🖨 طباعة</button>
      </div>
      <p className="note">المخزون غير المباع لا يدخل في حساب الفائض.</p>
    </section>
    <section className="dpanel"><h3 className="dp-h">{I.coins}الحساب</h3><div className="tbl-w"><table className="tbl kb-l"><tbody>
      {lines.map(([l, v]) => <tr key={l}><td>{l}</td><td><b className={v < 0 ? 'bad' : ''}><M v={v} /></b></td></tr>)}
      <tr className="kb-t"><td>الفائض</td><td><M v={c.surplus} /></td></tr><tr><td>الاحتياطي</td><td className="bad"><M v={-c.reserve} /></td></tr><tr className="kb-t"><td>القابل للتوزيع</td><td><M v={c.dist} /></td></tr>
    </tbody></table></div></section>
    <section className="dpanel"><h3 className="dp-h">{I.users}الأنصبة</h3>{!c.ms.length ? <Empty>لا توجد استلامات في {y}</Empty> : <div className="tbl-w"><table className="tbl">
      <thead><tr><th>الرقم</th><th>المنخرط</th><th>{b === 'sh' ? 'الحصص' : 'الكمية'}</th><th>النسبة</th><th>النصيب</th></tr></thead>
      <tbody>{c.ms.map(x => <tr key={x.m.id}><td>{x.m.id}</td><td className="c-n">{x.m.name}</td><td><Kg v={x.b} /></td><td><bdi dir="ltr">{(x.pct * 100).toFixed(2)}%</bdi></td><td><b><M v={x.amt} /></b></td></tr>)}</tbody>
    </table></div>}</section>
  </div>;
}

function readLogo(file, cb) {
  if (!file) return; const fr = new FileReader();
  fr.onload = () => { const img = new Image(); img.onload = () => { const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const k = Math.max(S / img.width, S / img.height), w = img.width * k, h = img.height * k;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h); cb(cv.toDataURL('image/jpeg', .85)); }; img.src = fr.result; };
  fr.readAsDataURL(file);
}
function Settings() {
  const c = D.cfg, fileRef = useRef();
  const set = (k, n) => e => upd(D => { D.cfg[k] = n ? num(e.target.value) : e.target.value; });
  const restore = txt => {
    let d; try { d = JSON.parse(txt); } catch { return alert('ملف غير صالح'); }
    if (!d || !Array.isArray(d.mem) || !d.cfg) return alert('ملف غير صالح: ليس نسخة من برنامج التعاونية');
    if (!confirm('سيتم تعويض كل البيانات الحالية بهذه النسخة (' + d.mem.length + ' منخرط). متابعة؟')) return;
    flush(); localStorage.setItem(K + 'pre', localStorage.getItem(K) || ''); localStorage.setItem(K, JSON.stringify(d)); window.__nf = 1; location.reload();
  };
  const F = (k, l, n, ex = {}) => <Field l={l}><input value={c[k]} onChange={set(k, n)} type={n ? 'number' : 'text'} {...ex} /></Field>;
  return <div className="stack">
    <section className="panel"><h2>معلومات التعاونية</h2>
      <div className="logo-row"><img src={logoOf()} alt="" /><label className="btn">تغيير الشعار<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; readLogo(f, u => upd(D => { D.cfg.logo = u; })); }} /></label>
        {c.logo && <button type="button" className="btn ghost" onClick={() => upd(D => { D.cfg.logo = ''; })}>الشعار الافتراضي</button>}</div>
      <div className="form two">{F('name', 'اسم التعاونية')}{F('sub', 'الوصف (تحت الاسم)')}{F('addr', 'العنوان')}{F('tel', 'الهاتف', 0, { dir: 'ltr' })}{F('ice', 'ICE / رقم التسجيل')}{F('pres', 'الرئيس')}</div>
    </section>
    <section className="panel"><h2>الموسم والأثمنة</h2>
      <div className="form two">{F('year', 'السنة الفلاحية', 1)}{F('cur', 'العملة')}{F('dues', 'الواجب السنوي', 1)}{F('share', 'قيمة الحصة', 1)}{F('reserve', 'نسبة الاحتياطي %', 1)}</div>
      <h4>أصناف الكبار والثمن عند الاستلام (د.م / كلغ)</h4>
      <div className="tiers">{c.grades.map((g, i) => <div className="kb-gr" key={g.id}>
        <input value={g.n} onChange={e => upd(D => { D.cfg.grades[i].n = e.target.value; })} aria-label="اسم الصنف" />
        <input className="mini" type="number" step="0.01" value={g.p} onChange={e => upd(D => { D.cfg.grades[i].p = num(e.target.value); })} aria-label="الثمن" />
        <button type="button" className="x" aria-label="حذف الصنف" onClick={() => { if (D.rec.some(r => r.g === g.id) || D.sal.some(s => s.g === g.id)) return alert('هذا الصنف مستعمل في عمليات، لا يمكن حذفه'); upd(D => { D.cfg.grades.splice(i, 1); }); }}>✕</button></div>)}</div>
      <button type="button" className="btn" onClick={() => upd(D => { D.cfg.grades.push({ id: seq(D.cfg.grades), n: 'صنف جديد', p: 0 }); })}>＋ إضافة صنف</button>
      <Field l="مواد الشراء (مفصولة بفاصلة)"><input defaultValue={c.items.join('، ')} onBlur={e => upd(D => { D.cfg.items = e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean); })} /></Field>
    </section>
    <section className="panel"><h2>البيانات</h2>
      <p className="note">البيانات محفوظة في هذا الجهاز. صدّر نسخة احتياطية بانتظام واحتفظ بها في مكان آمن.</p>
      <div className="opts">
        <button type="button" className="opt" onClick={() => { flush(); download('kabbar-' + today() + '.json', JSON.stringify(D), 'application/json'); }}><b>⬇ تصدير نسخة احتياطية</b><small>ملف JSON بكل البيانات</small></button>
        <button type="button" className="opt" onClick={() => fileRef.current.click()}><b>⬆ استرجاع نسخة</b><small>من ملف محفوظ سابقاً</small></button>
        <button type="button" className="opt" disabled={!localStorage.getItem(K + 'b')} onClick={() => restore(localStorage.getItem(K + 'b'))}><b>↺ نسخة الأمس</b><small>نسخة تلقائية من آخر يوم سابق</small></button>
      </div>
      <input type="file" accept=".json,application/json" ref={fileRef} hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) f.text().then(restore); }} />
      <div className="row"><button type="button" className="btn ghost danger" onClick={() => {
        if (prompt('لمسح كل البيانات اكتب كلمة: مسح') !== 'مسح') return;
        localStorage.setItem(K + 'pre', JSON.stringify(D)); D = dflt(); flush(); window.__nf = 1; location.reload(); }}>🗑 مسح كل البيانات</button></div>
    </section>
  </div>;
}

/* ================= التطبيق ================= */
const THEME = 'kbt';
function App() {
  useStore();
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME) || '');
  const [more, setMore] = useState(false);
  useEffect(() => { if (theme) document.documentElement.dataset.th = theme; else delete document.documentElement.dataset.th; localStorage.setItem(THEME, theme); }, [theme]);
  const tab = ui.tab;
  const go = t => { setUI({ tab: t }); window.scrollTo(0, 0); };
  const dark = theme === 'dark' || (!theme && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
  const owe = D.mem.filter(m => due(m.id).rest > 0.004).length;
  return <>
    <header className="top">
      <img src={logoOf()} alt="" width="44" height="44" />
      <div className="brand"><b>{D.cfg.name}</b><small>{D.cfg.sub}</small></div>
      <button type="button" className="icon" onClick={() => open(<RecSheet />)} aria-label="استلام سريع" title="استلام سريع"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg></button>
      <button type="button" className="icon" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>{dark ? '☀' : '☾'}</button>
    </header>
    <main className="main">
      {tab === 'home' && <Dashboard go={go} />}
      {tab === 'rec' && <Receptions />}
      {tab === 'far' && <Farmers />}
      {tab === 'mem' && <Members />}
      {tab === 'sal' && <Sales />}
      {tab === 'pur' && <Purchases />}
      {tab === 'cash' && <Cash />}
      {tab === 'dist' && <Dist />}
      {tab === 'set' && <Settings />}
    </main>
    <nav className="nav" aria-label="التنقل">
      <div className="side-b"><img src={logoOf()} alt="" /><b>{D.cfg.name}</b><small>تسيير التعاونية الفلاحية</small></div>
      {TABS.map(([id, label, d, m]) => <button key={id} type="button" className={(tab === id ? 'on' : '') + (m ? ' in-more' : '')} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg><span>{label}</span>
        {id === 'far' && owe > 0 && <i className="nb">{owe > 99 ? '99+' : owe}</i>}
      </button>)}
      <button type="button" className={'more-b' + (TABS.some(t => t[3] && t[0] === tab) ? ' on' : '')} onClick={() => setMore(true)} aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" /></svg><span>المزيد</span></button>
    </nav>
    {more && <Sheet title="المزيد" onClose={() => setMore(false)}><div className="opts">{TABS.filter(t => t[3]).map(([id, label]) => <button key={id} type="button" className="opt" onClick={() => { setMore(false); go(id); }}><b>{label}</b></button>)}</div></Sheet>}
    {ui.sheet}
    {ui.print && <PrintView />}
  </>;
}

window.__kb = { get D() { return D; }, flush };
createRoot(document.getElementById('root')).render(<App />);
