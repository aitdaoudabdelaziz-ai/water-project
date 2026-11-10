import { useDeferredValue, useMemo, useState } from 'react';
import { useData } from '../lib/useData.js';
import { key, prevNew, norm, roundName, tot, n2 } from '../lib/calc.js';
import { regRound } from '../lib/ops.js';
import RoundPicker from '../components/RoundPicker.js';
import { Empty } from '../components/ui.js';

const PAGE = 60;
export default function Readings() {
  const { D, X, act, sel, setSel } = useData();
  const { y, r } = sel;
  const [q, setQ] = useState(''); const dq = useDeferredValue(q);
  const [f, setF] = useState('wait'); const [lim, setLim] = useState(PAGE); const [msg, setMsg] = useState('');
  const years = useMemo(() => [...new Set(D.invs.map(i => i.y).concat(new Date().getFullYear(), y))].sort((a, b) => b - a), [D, y]);
  const done = D.subs.filter(s => D.reads[key(s.id, y, r)]).length, N = D.subs.length;
  const list = useMemo(() => { const t = norm(dq.trim());
    return D.subs.filter(s => { const has = !!D.reads[key(s.id, y, r)];
      return (f === '' || (f === 'wait' ? !has : has)) && (!t || norm(s.name).includes(t) || norm(s.meter).includes(t)); }); }, [D, dq, f, y, r]);
  const open = id => act.openReading(id, list.map(s => s.id));
  const issue = () => { let n = 0; act.update(D2 => { n = regRound(D2, y, r); });
    setMsg(n ? `أُصدرت أو حُدّثت ${n} فاتورة لـ${roundName(r)} ${y}.` : 'لا توجد قراءات مسجّلة في هذه الجولة.'); };
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-h"><h2>القراءات</h2><RoundPicker y={y} r={r} years={years} onChange={(yy, rr) => { setSel({ y: yy, r: rr }); setLim(PAGE); setMsg(''); }} /></div>
        <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={N} aria-valuenow={done} aria-label="القراءات المسجّلة">
          <div className="prog-b"><i style={{ width: (N ? done / N * 100 : 0) + '%' }} /></div>
          <span><b><bdi dir="ltr">{done}</bdi></b> من <bdi dir="ltr">{N}</bdi> قراءة مسجّلة</span>
        </div>
        <div className="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>
          <input value={q} onChange={e => { setQ(e.target.value); setLim(PAGE); }} placeholder="ابحث بالاسم أو رقم العداد" aria-label="بحث في القراءات" /></div>
        <div className="seg" role="radiogroup" aria-label="عرض">
          {[['wait', 'بانتظار القراءة'], ['done', 'مسجّلة'], ['', 'الكل']].map(([v, l]) =>
            <button key={v} type="button" role="radio" aria-checked={f === v} className={f === v ? 'on' : ''} onClick={() => { setF(v); setLim(PAGE); }}>{l}</button>)}
        </div>
        <button type="button" className="btn pri wide" onClick={issue}>إصدار فواتير {roundName(r)}</button>
        {msg && <p className="note" role="status">{msg}</p>}
      </section>
      {!list.length ? <Empty>{f === 'wait' ? 'سُجّلت كل القراءات في هذه الجولة.' : 'لا توجد نتائج.'}</Empty> : (
        <ul className="rows">
          {list.slice(0, lim).map(s => { const v = D.reads[key(s.id, y, r)], pv = prevNew(D, s.id, y, r), inv = D.invs.find(i => i.s === s.id && i.y == y && i.r == r); return (
            <li key={s.id}><button type="button" className="rr" onClick={() => open(s.id)}>
              <span className="rr-n"><b>{s.name}</b><small>العداد {s.meter}</small></span>
              <span className="rr-v"><small>السابقة</small><bdi dir="ltr">{v ? v.o : pv ?? '—'}</bdi></span>
              <span className="rr-v"><small>الجديدة</small><bdi dir="ltr">{v ? v.n : '—'}</bdi></span>
              <span className={'rr-s' + (inv ? (inv.paid ? ' paid' : ' inv') : v ? ' ok' : '')}>{inv ? (inv.paid ? 'مؤداة' : <><bdi dir="ltr">{n2(tot(inv))}</bdi> د.م</>) : v ? 'بدون فاتورة' : 'تسجيل'}</span>
            </button></li>); })}
        </ul>)}
      {list.length > lim && <button type="button" className="btn wide" onClick={() => setLim(lim + PAGE)}>عرض المزيد ({list.length - lim})</button>}
    </div>
  );
}
