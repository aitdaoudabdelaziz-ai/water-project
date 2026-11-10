import { useMemo, useState } from 'react';
import { useData } from '../lib/useData.js';
import { tot, n2, fmt, RN, roundName, norm, due, today, daysBetween } from '../lib/calc.js';
import { Empty } from '../components/ui.js';

const PAGE = 80;
export default function Invoices({ init }) {
  const { D, X, Y } = useData();
  const years = useMemo(() => [...new Set(D.invs.map(i => i.y).concat(Y))].sort((a, b) => b - a), [D, Y]);
  const [y, setY] = useState(init && init.y != null ? String(init.y) : String(Y));
  const [r, setR] = useState(init && init.r != null ? String(init.r) : '');
  const [st, setSt] = useState(init && init.st != null ? init.st : '');
  const [q, setQ] = useState(''); const [lim, setLim] = useState(PAGE);
  const td = today();
  const list = useMemo(() => { const t = norm(q.trim());
    return X.live.filter(i => (y === '' || i.y == y) && (r === '' || i.r == r) && (st === '' || String(i.paid ? 1 : 0) === st)
      && (!t || norm(i.num).includes(t) || norm((X.byId.get(i.s) || {}).name).includes(t) || norm((X.byId.get(i.s) || {}).meter).includes(t)))
      .sort((a, b) => b.y - a.y || b.r - a.r || a.id - b.id); }, [X, y, r, st, q]);
  const sum = list.reduce((t, i) => t + tot(i), 0), paid = list.filter(i => i.paid).reduce((t, i) => t + tot(i), 0);
  return (
    <div className="stack">
      <div className="card toolbar">
        <h2>الفواتير <span className="cnt">{list.length}</span></h2>
        <div className="filters">
          <label>السنة<select value={y} onChange={e => { setY(e.target.value); setLim(PAGE); }}><option value="">الكل</option>{years.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
          <label>الجولة<select value={r} onChange={e => { setR(e.target.value); setLim(PAGE); }}><option value="">الكل</option>{RN.map((n, i) => <option key={i} value={i}>{n}</option>)}</select></label>
          <label>الحالة<select value={st} onChange={e => { setSt(e.target.value); setLim(PAGE); }}><option value="">الكل</option><option value="0">غير مؤداة</option><option value="1">مؤداة</option></select></label>
          <label className="grow">بحث<input value={q} onChange={e => { setQ(e.target.value); setLim(PAGE); }} placeholder="الرقم أو الاسم أو العداد" /></label>
        </div>
        <div className="sums">
          <div><span>المجموع</span><b><bdi dir="ltr">{fmt(sum)}</bdi> د.م</b></div>
          <div className="good"><span>المؤدى</span><b><bdi dir="ltr">{fmt(paid)}</bdi> د.م</b></div>
          <div className="bad"><span>الباقي</span><b><bdi dir="ltr">{fmt(sum - paid)}</bdi> د.م</b></div>
        </div>
      </div>
      {!list.length ? <Empty>لا توجد فواتير بهذه الشروط</Empty> : (
        <ul className="list inv">
          {list.slice(0, lim).map(i => { const s = X.byId.get(i.s) || {}, dd = due(i, D.cfg.due), lt = !i.paid ? daysBetween(dd, td) : 0; return (
            <li key={i.id} className={'inv-r' + (i.paid ? ' paid' : lt > 0 ? ' late' : ' un')}>
              <div className="inv-a"><b>{s.name}</b><small><bdi dir="ltr">{i.num}</bdi> · {roundName(i.r)} {i.y} · <bdi dir="ltr">{+(i.n - i.o).toFixed(3)}</bdi> م³</small></div>
              <div className="inv-b"><b><bdi dir="ltr">{n2(tot(i))}</bdi> <em>د.م</em></b>
                <small className={i.paid ? 'good' : lt > 0 ? 'bad' : ''}>{i.paid ? '✓ ' + (i.pw == 'b' ? 'بنكي' : 'نقداً') + ' ' + (i.pd || '') : lt > 0 ? `متأخرة ${lt} يوم` : 'تستحق ' + dd}</small></div>
            </li>); })}
        </ul>)}
      {list.length > lim && <button type="button" className="btn wide" onClick={() => setLim(lim + PAGE)}>عرض المزيد ({list.length - lim})</button>}
    </div>
  );
}
