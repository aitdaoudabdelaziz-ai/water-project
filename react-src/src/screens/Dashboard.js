import { useMemo } from 'react';
import { useData } from '../lib/useData.js';
import { SHORT0 } from '../lib/brand.js';
import { MO, RN, roundName, tot, key, fmt, n2, due, today, daysBetween, prevNew } from '../lib/calc.js';
import { Kpi, CountUp, Avatar, Empty } from '../components/ui.js';

const LIM = 5;
export default function Dashboard({ go }) {
  const { D, X, Y, R, act, setSel } = useData();
  const k = useMemo(() => {
    const now = new Date(), cy = now.getFullYear(), cm = now.getMonth(), mIdx = Y == cy ? cm : 11;
    const paid = X.live.filter(i => i.paid), ym = i => String(i.pd || i.date || '').slice(0, 7);
    const mon = Array.from({ length: 12 }, (_, m) => paid.filter(i => ym(i) === Y + '-' + String(m + 1).padStart(2, '0')).reduce((t, i) => t + tot(i), 0));
    const inv = X.live.filter(i => i.y == Y), billed = inv.reduce((t, i) => t + tot(i), 0), coll = inv.filter(i => i.paid).reduce((t, i) => t + tot(i), 0);
    const debt = X.unpaid.reduce((t, i) => t + tot(i), 0), late = new Set(X.unpaid.map(i => i.s)).size;
    let ok = 0, cons = 0; D.subs.forEach(s => { const v = D.reads[key(s.id, Y, R)]; if (v) { ok++; cons += Math.max(0, v.n - v.o); } });
    const mk = cy + '-' + String(cm + 1).padStart(2, '0');
    return { mon, mIdx, pc: billed ? Math.round(coll / billed * 100) : 0, nPd: inv.filter(i => i.paid).length, nInv: inv.length, debt, late, ok, cons,
      nPay: X.live.filter(i => i.paid && String(i.pd || '').slice(0, 7) === mk).length };
  }, [D, X, Y, R]);
  const mx = Math.max(1, ...k.mon);
  const td = today();
  const cur = X.live.filter(i => i.y == Y && i.r == R);
  const wait = D.subs.filter(s => !D.reads[key(s.id, Y, R)]);
  const un = cur.filter(i => !i.paid).sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.id - b.id);
  const pd = cur.filter(i => i.paid).sort((a, b) => String(b.pd || '').localeCompare(String(a.pd || '')) || b.id - a.id);
  const name = D.cfg.short || D.cfg.aname || SHORT0;

  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="ov">
        <div className="hero-h">
          <div><h2 id="ov">نظرة عامة</h2><small>{name}، {new Date().toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' })}</small></div>
          <button type="button" className="bell" onClick={() => go('invoices', { st: '0' })} aria-label={'المتأخرون عن الأداء: ' + k.late}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            {k.late > 0 && <b>{k.late}</b>}
          </button>
        </div>
        <div className="hero-g">
          <div className="kpis">
            <Kpi label={'مداخيل ' + MO[k.mIdx]} tone="pri" pill={k.nPay + ' أداء'} onClick={() => go('invoices', { st: '1' })}><CountUp value={Math.round(k.mon[k.mIdx])} format={fmt} /><em>د.م</em></Kpi>
            <Kpi label={'الاستخلاص ' + Y} pill={k.nPd + '/' + k.nInv} onClick={() => go('invoices')}><CountUp value={k.pc} suffix="%" format={v => Math.round(v)} /></Kpi>
            <Kpi label="المشتركون" pill={k.ok + ' قراءة'} onClick={() => go('subs')}><CountUp value={D.subs.length} format={fmt} /></Kpi>
            <Kpi label="الديون" tone="bad" pill={k.late + ' مشترك'} onClick={() => go('invoices', { st: '0' })}><CountUp value={Math.round(k.debt)} format={fmt} /><em>د.م</em></Kpi>
          </div>
          <div className="chart" role="img" aria-label={'المداخيل الشهرية ' + Y}>
            <div className="chart-t"><b>المداخيل الشهرية</b><span>{Y}</span></div>
            <div className="bars">{k.mon.map((v, m) => (
              <div key={m} className={'bar' + (m === k.mIdx ? ' cur' : '')} title={MO[m] + ': ' + fmt(v) + ' د.م'}>
                <i style={{ height: Math.max(4, v / mx * 100) + '%', animationDelay: m * 45 + 'ms' }} /><small>{MO[m].slice(0, 3)}</small>
              </div>))}</div>
          </div>
        </div>
        <div className="tiles">
          <div className="tile"><span>الاستهلاك في {roundName(R)}</span><b><bdi dir="ltr">{+k.cons.toFixed(2)}</bdi> م³</b><small>قراءات: <bdi dir="ltr">{k.ok} / {D.subs.length}</bdi></small></div>
          <div className="tile"><span>الخزينة</span><b><bdi dir="ltr">{fmt(X.balance[0] + X.balance[1])}</bdi> د.م</b><small>الصندوق <bdi dir="ltr">{fmt(X.balance[0])}</bdi>، البنك <bdi dir="ltr">{fmt(X.balance[1])}</bdi></small></div>
        </div>
      </section>

      <section className="card flow" aria-labelledby="fl">
        <div className="flow-t"><h3 id="fl">سير الجولة</h3><span>{roundName(R)} {Y}</span></div>
        <div className="cols">
          <Col title="بانتظار القراءة" dot="g" n={wait.length} more={() => go('subs')}>
            {wait.slice(0, LIM).map(s => { const pv = prevNew(D, s.id, Y, R); return (
              <Item key={s.id} sub={s} line={<>العداد {s.meter}{pv != null && <>، آخر قراءة <bdi dir="ltr">{pv}</bdi></>}</>} status="سجّل القراءة" onClick={() => { setSel({ y: Y, r: R }); act.openReading(s.id, wait.map(x => x.id)); }} />); })}
            {!wait.length && <Empty>✔ كل القراءات مسجّلة</Empty>}
          </Col>
          <Col title="غير مؤداة" dot="o" n={un.length} more={() => go('invoices', { y: Y, r: R, st: '0' })}>
            {un.slice(0, LIM).map(i => { const s = X.byId.get(i.s), dd = due(i, D.cfg.due), lt = daysBetween(dd, td); return (
              <Item key={i.id} sub={s} tone={lt > 0 ? 'late' : 'un'} line={<><bdi dir="ltr">{n2(tot(i))}</bdi> د.م، فاتورة <bdi dir="ltr">{i.num}</bdi></>} status={lt > 0 ? `متأخرة ${lt} يوم` : 'تستحق ' + dd} bad={lt > 0} onClick={() => act.openInvoice(i.id)} />); })}
            {!un.length && <Empty>لا توجد فواتير غير مؤداة</Empty>}
          </Col>
          <Col title="مؤداة" dot="ok" n={pd.length} more={() => go('invoices', { y: Y, r: R, st: '1' })}>
            {pd.slice(0, LIM).map(i => <Item key={i.id} sub={X.byId.get(i.s)} tone="paid" line={<><bdi dir="ltr">{n2(tot(i))}</bdi> د.م، {i.pw == 'b' ? 'بنكياً' : 'نقداً'}</>} status={'✓ ' + (i.pd || '')} good onClick={() => act.openInvoice(i.id)} />)}
            {!pd.length && <Empty>لا توجد أداءات بعد</Empty>}
          </Col>
        </div>
      </section>
    </div>
  );
}

function Col({ title, dot, n, more, children }) {
  return (
    <div className="col">
      <div className="col-h"><i className={'dot ' + dot} /><b>{title}</b><span className="cnt">{n}</span></div>
      {children}
      {n > LIM && <button type="button" className="more" onClick={more}>عرض الكل ({n})</button>}
    </div>
  );
}
function Item({ sub, line, status, tone, bad, good, onClick }) {
  return (
    <button type="button" onClick={onClick} className={'item' + (tone ? ' t-' + tone : '')}>
      <Avatar sub={sub} />
      <span className="item-i"><b>{sub ? sub.name : '—'}</b><small>{line}</small></span>
      <span className={'item-s' + (bad ? ' bad' : good ? ' good' : '')}>{status}</span>
    </button>
  );
}
