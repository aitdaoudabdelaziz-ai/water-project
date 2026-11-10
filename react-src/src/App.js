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

const TABS = [
  ['home', 'الرئيسية', 'M3 11 12 4l9 7M5 10v10h14V10'],
  ['reads', 'القراءات', 'M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11Zm-2.5 11.5a2.5 2.5 0 0 0 2.5 2.5'],
  ['invoices', 'الفواتير', 'M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3Zm3 5h4m-4 4h4'],
  ['subs', 'المشتركون', 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75'],
  ['data', 'البيانات', 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
];
const THEME = 'w1react_theme';

export default function App() {
  const [{ data, source }, setDs] = useState(() => loadSaved() || { data: demoData(), source: 'بيانات تجريبية' });
  const [tab, setTab] = useState('home');
  const [init, setInit] = useState(null);
  const now = new Date(), Y = now.getFullYear(), R = Math.floor(now.getMonth() / 3);
  const [sel, setSel] = useState({ y: Y, r: R });
  const [reading, setReading] = useState(null);   // { id, queue }
  const [invoice, setInvoice] = useState(null);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem(THEME) || ''; } catch { return ''; } });
  const X = useDerived(data);

  useEffect(() => { if (theme) document.documentElement.dataset.th = theme; else delete document.documentElement.dataset.th;
    try { localStorage.setItem(THEME, theme); } catch { /* */ } }, [theme]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  /** كل تعديل: نسخة جديدة من البيانات ← حفظ في w1react */
  // التعديل متزامن حتى ترجع العملية نتيجتها (خطأ أو عدد) مباشرة
  const cur = useRef(null); if (!cur.current || cur.current.data !== data) cur.current = { data, source };
  const update = useCallback(fn => {
    const prev = cur.current, D2 = JSON.parse(JSON.stringify(prev.data)); fn(D2);
    cur.current = { data: D2, source: prev.source }; saveCopy(D2, prev.source); setDs(cur.current);
  }, []);
  const go = (t, opts) => { setInit(opts || null); setTab(t); };
  const pick = (d, src) => { saveCopy(d, src); setDs({ data: d, source: src }); go('home'); };
  const assoc = data.cfg.aname || 'جمعية الفتح للتنمية والتعاون';
  const act = { update, assoc,
    openReading: (id, queue) => setReading({ id, queue: queue || null }),
    openInvoice: id => setInvoice(id) };
  const next = () => { const q = reading.queue || [], k = q.indexOf(reading.id);
    const rest = q.slice(k + 1).concat(q.slice(0, k)).find(id => !data.reads[id + '|' + sel.y + '|' + sel.r]);
    setReading(rest != null ? { id: rest, queue: q } : null); };
  const dark = theme === 'dark' || (!theme && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <DataCtx.Provider value={{ D: data, X, Y, R, act, sel, setSel }}>
      <div className="preview" role="note">نسخة React التجريبية: لا تؤثر على برنامجك. <a href="../cloud/">البرنامج الحالي</a></div>
      <header className="top">
        <img src="../icon-192.png" alt="" width="44" height="44" />
        <div className="brand"><b>{assoc}</b><small>لجنة الماء الصالح للشرب</small></div>
        <button type="button" className="icon" onClick={() => setReading({ id: null, queue: null })} aria-label="تحصيل سريع" title="تحصيل سريع">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg></button>
        <button type="button" className="icon" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>{dark ? '☀' : '☾'}</button>
      </header>
      <main className="main">
        {tab === 'home' && <Dashboard go={go} />}
        {tab === 'reads' && <Readings />}
        {tab === 'invoices' && <Invoices key={JSON.stringify(init)} init={init} />}
        {tab === 'subs' && <Subscribers />}
        {tab === 'data' && <DataSource current={source} onPick={pick} />}
      </main>
      <nav className="nav" aria-label="التنقل">
        {TABS.map(([id, label, d]) => (
          <button key={id} type="button" className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg><span>{label}</span>
            {id === 'invoices' && X.debtBySub.size > 0 && <i className="nb" aria-label={X.debtBySub.size + ' مشترك عليهم ديون'}>{X.debtBySub.size > 99 ? '99+' : X.debtBySub.size}</i>}
          </button>))}
      </nav>
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
