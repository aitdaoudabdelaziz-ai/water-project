// App.js — نقطة البداية لنسخة React من برنامج الماء (المرحلة 1: عرض فقط)
import { useEffect, useState } from 'react';
import { DataCtx, useDerived } from './lib/useData.js';
import { loadSaved, saveCopy, demoData } from './lib/store.js';
import Dashboard from './screens/Dashboard.js';
import Subscribers from './screens/Subscribers.js';
import Invoices from './screens/Invoices.js';
import DataSource from './screens/DataSource.js';

const TABS = [
  ['home', 'الرئيسية', 'M3 11 12 4l9 7M5 10v10h14V10'],
  ['subs', 'المشتركون', 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75'],
  ['invoices', 'الفواتير', 'M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3Zm3 5h4m-4 4h4'],
  ['data', 'البيانات', 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
];
const THEME = 'w1react_theme';

export default function App() {
  const [{ data, source }, setDs] = useState(() => loadSaved() || { data: demoData(), source: 'بيانات تجريبية' });
  const [tab, setTab] = useState('home');
  const [init, setInit] = useState(null);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem(THEME) || ''; } catch { return ''; } });
  const X = useDerived(data);
  const now = new Date(), Y = now.getFullYear(), R = Math.floor(now.getMonth() / 3);

  useEffect(() => { if (theme) document.documentElement.dataset.th = theme; else delete document.documentElement.dataset.th;
    try { localStorage.setItem(THEME, theme); } catch { /* */ } }, [theme]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  const go = (t, opts) => { setInit(opts || null); setTab(t); };
  const pick = (d, src) => { saveCopy(d, src); setDs({ data: d, source: src }); go('home'); };
  const dark = theme === 'dark' || (!theme && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <DataCtx.Provider value={{ D: data, X, Y, R }}>
      <div className="preview" role="note">⚛ نسخة React التجريبية — المرحلة 1 (عرض فقط). <a href="../cloud/">البرنامج الحالي ←</a></div>
      <header className="top">
        <img src="../icon-192.png" alt="" width="40" height="40" />
        <div className="brand"><b>{data.cfg.aname || 'جمعية الفتح للتنمية والتعاون'}</b><small>لجنة الماء الصالح للشرب · {source}</small></div>
        <button type="button" className="icon" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>{dark ? '☀' : '☾'}</button>
      </header>
      <main className="main">
        {tab === 'home' && <Dashboard go={go} />}
        {tab === 'subs' && <Subscribers />}
        {tab === 'invoices' && <Invoices key={JSON.stringify(init)} init={init} />}
        {tab === 'data' && <DataSource current={source} onPick={pick} />}
      </main>
      <nav className="nav" aria-label="التنقل">
        {TABS.map(([id, label, d]) => (
          <button key={id} type="button" className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg><span>{label}</span>
            {id === 'invoices' && X.debtBySub.size > 0 && <i className="nb">{X.debtBySub.size > 99 ? '99+' : X.debtBySub.size}</i>}
          </button>))}
      </nav>
    </DataCtx.Provider>
  );
}
