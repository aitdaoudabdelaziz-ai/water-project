// App.js — نسخة React من برنامج الماء
// المرحلة 2: القراءات، إصدار الفواتير، الدفع، التحصيل السريع، واتساب.
// التعديلات تُحفظ في نسخة React فقط (w1react) — بيانات البرنامج الأصلي لا تُلمس.
import { useCallback, useEffect, useRef, useState } from 'react';
import { DataCtx, useDerived, useData } from './lib/useData.js';
import { norm } from './lib/calc.js';
import Sheet from './components/Sheet.js';
import { loadSaved, saveCopy, demoData } from './lib/store.js';
import Dashboard from './screens/Dashboard.js';
import Readings from './screens/Readings.js';
import Invoices from './screens/Invoices.js';
import Subscribers from './screens/Subscribers.js';
import DataSource from './screens/DataSource.js';
import ReadingSheet from './screens/ReadingSheet.js';
import InvoiceSheet from './screens/InvoiceSheet.js';
import Finance from './screens/Finance.js';
import Settings from './screens/Settings.js';
import Login from './screens/Login.js';
import PrintArea from './components/Print.js';
import Thermal from './components/Thermal.js';
import { perms, session } from './lib/auth.js';
import { connect, push, setRemote, WERR } from './lib/cloud.js';
import { cloudIds } from './lib/ops.js';

// [المعرّف، الاسم، الأيقونة، الصلاحية، في «المزيد» على الهاتف]
const TABS = [
  ['home', 'الرئيسية', 'M3 11 12 4l9 7M5 10v10h14V10', 'dash'],
  ['reads', 'القراءات', 'M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11Zm-2.5 11.5a2.5 2.5 0 0 0 2.5 2.5', 'v1'],
  ['invoices', 'الفواتير', 'M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3Zm3 5h4m-4 4h4', 'v2'],
  ['subs', 'المشتركون', 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75', 'v0'],
  ['finance', 'المالية', 'M3 7h18v12H3zM3 11h18M7 15h3', 'v3', 1],
  ['settings', 'الإعدادات', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z', 'admin', 1],
  ['data', 'البيانات', 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3', 'admin', 1],
];
const THEME = 'w1react_theme';
/** نسخة احتياطية من بيانات السحابة على الجهاز قبل أول تعديل في كل يوم (آخر 3 نسخ) */
export const CBAK = 'w1react_cloudbak';
function cloudBackup(D) {
  try { const L = JSON.parse(localStorage.getItem(CBAK) || '[]'), day = new Date().toISOString().slice(0, 10);
    if (L.length && L[0].day === day) return;
    L.unshift({ day, at: Date.now(), data: D }); localStorage.setItem(CBAK, JSON.stringify(L.slice(0, 3)));
  } catch { /* مساحة غير كافية: نكمل */ } }

export default function App() {
  const [{ data, source }, setDs] = useState(() => { const x = loadSaved(); if (x) return x; const d = { data: demoData(), source: 'بيانات تجريبية' }; saveCopy(d.data, d.source); return d; });
  const [tab, setTab] = useState('home');
  const [init, setInit] = useState(null);
  const now = new Date(), Y = now.getFullYear(), R = Math.floor(now.getMonth() / 3);
  const [sel, setSel] = useState({ y: Y, r: R });
  const [reading, setReading] = useState(null);   // { id, queue }
  const [invoice, setInvoice] = useState(null);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem(THEME) || ''; } catch { return ''; } });
  const X = useDerived(data);
  const [cu, setCu] = useState(() => session.get());
  // السحابة: قراءة فقط في هذه الخطوة. البيانات المحلية لنسخة React تبقى كما هي.
  const [cloudOn, setCloudOn] = useState(() => { try { return localStorage.getItem('w1react_cloud') === '1'; } catch { return false; } });
  const [cloud, setCloud] = useState({ status: 'off' });
  const local = useRef(null);
  useEffect(() => {
    if (!cloudOn) { setCloud({ status: 'off' }); if (local.current) { setDs(local.current); local.current = null; } return; }
    try { const c = JSON.parse(localStorage.getItem('w1react_cloudcache') || 'null'); if (c && c.subs) { if (!local.current) local.current = cur.current; setDs({ data: c, source: 'السحابة (نسخة محفوظة)' }); } } catch { /* */ }
    let stop = () => {}, alive = true;
    connect(ev => { if (!alive) return; setCloud(ev);
      if (ev.data) { if (!local.current) local.current = cur.current; try { localStorage.setItem('w1react_cloudcache', JSON.stringify(ev.data)); } catch { /* */ }
        remote.current = ev.data; setDs({ data: ev.data, source: 'السحابة' }); } }).then(f => { stop = f; });
    return () => { alive = false; stop(); };
  }, [cloudOn]);
  const setCloudMode = on => { try { on ? localStorage.setItem('w1react_cloud', '1') : localStorage.removeItem('w1react_cloud'); } catch { /* */ } setCloudOn(on); };
  // الكتابة في السحابة: مفتاح منفصل، يُفعَّل يدوياً من «البيانات»
  const [cloudWrite, setCW] = useState(() => { try { return localStorage.getItem('w1react_cloudwrite') === '1'; } catch { return false; } });
  const setCloudWrite = on => { try { on ? localStorage.setItem('w1react_cloudwrite', '1') : localStorage.removeItem('w1react_cloudwrite'); } catch { /* */ } setCW(on); };
  const readOnly = cloudOn && !cloudWrite;
  cloudIds(cloudOn && cloudWrite);
  const remote = useRef(null); // آخر بيانات وصلت من السحابة
  const P = perms(data, cu);
  const [more, setMore] = useState(false);
  const [printIds, setPrintIds] = useState(null);
  const [thermIds, setThermIds] = useState(null);

  useEffect(() => { if (theme) document.documentElement.dataset.th = theme; else delete document.documentElement.dataset.th;
    try { localStorage.setItem(THEME, theme); } catch { /* */ } }, [theme]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  /** كل تعديل: نسخة جديدة من البيانات ← حفظ في w1react */
  // التعديل متزامن حتى ترجع العملية نتيجتها (خطأ أو عدد) مباشرة
  const wr = useRef({}); wr.current = { on: cloudOn && cloudWrite, status: cloud.status, user: cloud.user };
  const cur = useRef(null); if (!cur.current || cur.current.data !== data) cur.current = { data, source };
  const update = useCallback(fn => {
    const prev = cur.current;
    if (prev.source && prev.source.startsWith('السحابة')) {
      const W = wr.current;
      if (!W.on) { alert('بيانات السحابة للقراءة فقط. فعّل «الحفظ في السحابة» من صفحة البيانات.'); return; }
      if (W.status !== 'live' || !remote.current) { alert('لم يكتمل الاتصال بالسحابة بعد. انتظر قليلاً ثم أعد المحاولة.'); return; }
      const base = remote.current, D2 = JSON.parse(JSON.stringify(prev.data)); fn(D2);
      cloudBackup(base);
      cur.current = { data: D2, source: 'السحابة' }; setDs(cur.current);
      try { localStorage.setItem('w1react_cloudcache', JSON.stringify(D2)); } catch { /* */ }
      push(D2, W.user || '').catch(e => { alert(WERR(e)); setRemote(base); try { localStorage.setItem('w1react_cloudcache', JSON.stringify(base)); } catch { /* */ } remote.current = base; cur.current = { data: base, source: 'السحابة' }; setDs(cur.current); });
      return;
    }
    const D2 = JSON.parse(JSON.stringify(prev.data)); fn(D2);
    cur.current = { data: D2, source: prev.source }; saveCopy(D2, prev.source); setDs(cur.current);
  }, []);
  const go = (t, opts) => { setInit(opts || null); setTab(t); };
  const pick = (d, src) => { saveCopy(d, src); setDs({ data: d, source: src }); go('home'); };
  const assoc = data.cfg.aname || 'جمعية الفتح للتنمية والتعاون';
  const login = u => { session.set(u); setCu(u); };
  const allowed = t => t[3] === 'dash' ? P.dash : t[3] === 'admin' ? P.admin : P.can(t[3]);
  const tabs = TABS.filter(allowed);
  useEffect(() => { if (!tabs.some(t => t[0] === tab) && tabs.length) setTab(tabs[0][0]); }, [tab, tabs.length, cu]);
  const can = k => (readOnly && (k === 'ed' || k === 'del')) ? false : P.can(k);
  const act = { update, assoc, can, readOnly, goData: () => go('data'), cloudOn, cloud, setCloudMode, cloudWrite: cloudOn && cloudWrite, setCloudWrite, admin: P.admin, user: P.user, login, print: ids => setPrintIds(ids), thermal: ids => setThermIds(ids),
    openReading: (id, queue) => setReading({ id, queue: queue || null }),
    openInvoice: id => setInvoice(id) };
  const next = () => { const q = reading.queue || [], k = q.indexOf(reading.id);
    const rest = q.slice(k + 1).concat(q.slice(0, k)).find(id => !data.reads[id + '|' + sel.y + '|' + sel.r]);
    setReading(rest != null ? { id: rest, queue: q } : null); };
  const dark = theme === 'dark' || (!theme && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <DataCtx.Provider value={{ D: data, X, Y, R, act, sel, setSel }}>
      <div className="preview" role="note">{cloudOn && cloudWrite ? 'نسخة React: الحفظ في السحابة مفعّل — تعديلاتك تظهر في البرنامج الحالي.' : 'نسخة React التجريبية: لا تؤثر على برنامجك.'} <a href="../cloud/">البرنامج الحالي</a></div>
      <header className="top">
        <img src="../icon-192.png" alt="" width="44" height="44" />
        <div className="brand"><b>{assoc}</b><small>لجنة الماء الصالح للشرب</small></div>
        {cloudOn && <span className={'cchip c-' + cloud.status} role="status" title={cloud.error || ''}>☁<span className="ct"> {cloud.status === 'live' ? (cloudWrite ? (cloud.pending ? 'جارٍ الحفظ…' : 'السحابة ✓') : 'السحابة (قراءة)') : cloud.status === 'login' ? 'سجّل الدخول' : cloud.status === 'error' ? 'خطأ' : '...'}</span></span>}
        <button type="button" className="icon" onClick={() => setReading({ id: null, queue: null })} aria-label="تحصيل سريع" title="تحصيل سريع">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg></button>
        <button type="button" className="icon" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>{dark ? '☀' : '☾'}</button>
      </header>
      {P.needLogin && <Login D={data} assoc={assoc} onLogin={login} />}
      {!P.needLogin && <>
      <main className="main">
        {tab === 'home' && <Dashboard go={go} />}
        {tab === 'reads' && <Readings />}
        {tab === 'invoices' && <Invoices key={JSON.stringify(init)} init={init} />}
        {tab === 'subs' && <Subscribers />}
        {tab === 'finance' && <Finance />}
        {tab === 'settings' && <Settings />}
        {tab === 'data' && <DataSource current={source} onPick={pick} />}
      </main>
      <nav className="nav" aria-label="التنقل">
        {tabs.map(([id, label, d, , m]) => (
          <button key={id} type="button" className={(tab === id ? 'on' : '') + (m ? ' in-more' : '')} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg><span>{label}</span>
            {id === 'invoices' && X.debtBySub.size > 0 && <i className="nb" aria-label={X.debtBySub.size + ' مشترك عليهم ديون'}>{X.debtBySub.size > 99 ? '99+' : X.debtBySub.size}</i>}
          </button>))}
        {tabs.some(t => t[4]) && <button type="button" className={'more-b' + (tabs.some(t => t[4] && t[0] === tab) ? ' on' : '')} onClick={() => setMore(true)} aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" /></svg><span>المزيد</span></button>}
      </nav>
      {more && <Sheet title="المزيد" onClose={() => setMore(false)} labelId="mo-t">
        <div className="opts">{tabs.filter(t => t[4]).map(([id, label]) => <button key={id} type="button" className="opt" onClick={() => { setMore(false); go(id); }}><b>{label}</b></button>)}
          {P.user && <button type="button" className="opt" onClick={() => { setMore(false); login(null); }}><b>خروج</b><small>{P.user.u}</small></button>}</div>
      </Sheet>}
      </>}
      {printIds && <PrintArea D={data} ids={printIds} onDone={() => setPrintIds(null)} onThermal={() => { setThermIds(printIds); setPrintIds(null); }} />}
      {thermIds && <Thermal ids={thermIds} onDone={() => setThermIds(null)} />}
      {reading && (reading.id == null
        ? <QuickPick onPick={id => setReading({ id, queue: null })} onClose={() => setReading(null)} />
        : <ReadingSheet key={reading.id} subId={reading.id} y={sel.y} r={sel.r} onClose={() => setReading(null)} onNext={reading.queue ? next : null} />)}
      {invoice != null && <InvoiceSheet id={invoice} onClose={() => setInvoice(null)} />}
    </DataCtx.Provider>
  );
}

/** التحصيل السريع: اختيار المشترك بالاسم أو العداد */
function QuickPick({ onPick, onClose }) {
  const { D } = useData();
  const [q, setQ] = useState('');
  const t = norm(q.trim()), L = t ? D.subs.filter(s => norm(s.name).includes(t) || norm(s.meter).includes(t)).slice(0, 8) : [];
  return (
    <Sheet title="تحصيل سريع" sub="ابحث عن المشترك ثم سجّل القراءة واقبض" onClose={onClose} labelId="qp-t">
      <div className="search"><input data-autofocus value={q} onChange={e => setQ(e.target.value)} placeholder="الاسم أو رقم العداد" aria-label="بحث عن مشترك"
        onKeyDown={e => e.key === 'Enter' && L.length && onPick(L[0].id)} /></div>
      <ul className="rows">{L.map(s => <li key={s.id}><button type="button" className="rr" onClick={() => onPick(s.id)}><span className="rr-n"><b>{s.name}</b><small>العداد {s.meter}</small></span></button></li>)}</ul>
      {t && !L.length && <p className="note">لا يوجد مشترك بهذا الاسم أو العداد.</p>}
    </Sheet>
  );
}
