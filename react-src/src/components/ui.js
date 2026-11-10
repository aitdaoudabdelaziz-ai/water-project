import { useEffect, useRef, useState } from 'react';
import { initials } from '../lib/calc.js';

const BG = ['#DCEFE4', '#E7E1F5', '#F6E6CF', '#DDE9F6', '#F5DCDC', '#E3F0D2'];
const FG = ['#1E6B48', '#5B45A0', '#8A5A12', '#2A5C8F', '#9B3434', '#4E6B1E'];
export function Avatar({ sub, size = 42 }) {
  const k = (sub && sub.id || 0) % 6;
  return <span className="av" style={{ background: BG[k], color: FG[k], width: size, height: size }} aria-hidden="true">{initials(sub && sub.name)}</span>;
}

/** رقم يعدّ صعوداً عند الظهور (يتوقف مع «تقليل الحركة») */
export function CountUp({ value, suffix = '', format = v => v }) {
  const [v, setV] = useState(value);
  const first = useRef(true);
  useEffect(() => {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!first.current || reduce) { setV(value); return; }
    first.current = false;
    let raf; const t0 = performance.now(), T = 900;
    const step = t => { let k = Math.min(1, (t - t0) / T); k = 1 - Math.pow(1 - k, 3); setV(value * k); if (k < 1) raf = requestAnimationFrame(step); else setV(value); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <bdi dir="ltr">{format(v)}{suffix}</bdi>;
}

export function Kpi({ label, children, pill, tone, onClick }) {
  return (
    <button type="button" className={'kpi' + (tone ? ' kpi-' + tone : '')} onClick={onClick}>
      <span className="kpi-l">{label}</span>
      <b className="kpi-v">{children}</b>
      {pill != null && <i className="pill">{pill}</i>}
    </button>
  );
}

export function Empty({ children }) { return <div className="empty">{children}</div>; }

/** نافذة كلمة السر لفتح نسخة مشفّرة */
export function PasswordDialog({ onSubmit, onCancel, error }) {
  const [pw, setPw] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current && ref.current.focus(); }, []);
  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="pwt" onKeyDown={e => e.key === 'Escape' && onCancel()}>
      <form className="dlg-b" onSubmit={e => { e.preventDefault(); if (pw) onSubmit(pw); }}>
        <h3 id="pwt">🔐 نسخة مشفّرة</h3>
        <p>أدخل كلمة السر التي اخترتها عند حفظ هذه النسخة.</p>
        <input ref={ref} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة السر" aria-label="كلمة السر" />
        {error && <div className="err" role="alert">{error}</div>}
        <div className="row"><button className="btn pri" type="submit">فتح</button><button className="btn" type="button" onClick={onCancel}>إلغاء</button></div>
      </form>
    </div>
  );
}
