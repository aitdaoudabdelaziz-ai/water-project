import { useMemo } from 'react';
import { useData } from '../lib/useData.js';
import { SHORT0 } from '../lib/brand.js';
import { MO, roundName, tot, key, fmt, n2, due, today, daysBetween } from '../lib/calc.js';
import { Kpi, CountUp, Empty } from '../components/ui.js';

// أيقونات بخطين: كحلي للشكل وذهبي للتفصيل (نفس روح التصميم المختار)
const I = {
  users: <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="16" r="7" className="i-n" /><path d="M5 40c1-8 6-12 13-12s12 4 13 12" className="i-n" /><circle cx="34" cy="18" r="5.5" className="i-g" /><path d="M31 28c7 0 11 4 12 11" className="i-g" /></svg>,
  coins: <svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="20" cy="13" rx="12" ry="5" className="i-g" /><path d="M8 13v8c0 3 5 5 12 5s12-2 12-5v-8" className="i-n" /><path d="M16 30v6c0 3 5 5 12 5s12-2 12-5v-8c0-3-5-5-12-5" className="i-n" /><path d="M16 30c0 3 5 5 12 5s12-2 12-5" className="i-g" /></svg>,
  gauge: <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 34a17 17 0 1 1 34 0" className="i-n" /><path d="M24 34 33 21" className="i-g" /><circle cx="24" cy="34" r="3" className="i-g" /><path d="M12 34h3M33 34h3M24 17v3" className="i-n" /></svg>,
  warn: <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="9" width="24" height="30" rx="3" className="i-n" /><path d="M12 17h12M12 23h12M12 29h7" className="i-n" /><path d="M36 22 45 39H27Z" className="i-g" /><path d="M36 28v5M36 36v.5" className="i-g" /></svg>,
  drop: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z" /></svg>,
  eye: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>,
  list: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v2h6V3M9 10h6M9 14h6M9 18h3" /></svg>,
  people: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .6 3.3 2.6 3.5 6" /></svg>,
  bill: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>,
  data: <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>,
};

export default function Dashboard({ go }) {
  const { D, X, Y, R, act } = useData();
  const k = useMemo(() => {
    const now = new Date(), cy = now.getFullYear(), cm = now.getMonth(), mIdx = Y == cy ? cm : 11;
    const paid = X.live.filter(i => i.paid), ym = i => String(i.pd || i.date || '').slice(0, 7);
    const mon = Array.from({ length: 12 }, (_, m) => paid.filter(i => ym(i) === Y + '-' + String(m + 1).padStart(2, '0')).reduce((t, i) => t + tot(i), 0));
    const inv = X.live.filter(i => i.y == Y), billed = inv.reduce((t, i) => t + tot(i), 0), coll = inv.filter(i => i.paid).reduce((t, i) => t + tot(i), 0);
    const debt = X.unpaid.reduce((t, i) => t + tot(i), 0), late = new Set(X.unpaid.map(i => i.s)).size;
    let ok = 0, cons = 0; D.subs.forEach(s => { const v = D.reads[key(s.id, Y, R)]; if (v) { ok++; cons += Math.max(0, v.n - v.o); } });
    const mk = cy + '-' + String(cm + 1).padStart(2, '0'), td = today();
    // التنبيهات: المشتركون الذين عليهم ديون، الأقدم تأخراً أولاً
    const by = new Map();
    X.unpaid.forEach(i => { const lt = daysBetween(due(i, D.cfg.due), td), o = by.get(i.s) || { s: i.s, sum: 0, n: 0, lt: -1e9, first: i };
      o.sum += tot(i); o.n++; if (lt > o.lt) { o.lt = lt; o.first = i; } by.set(i.s, o); });
    const alerts = [...by.values()].sort((a, b) => b.lt - a.lt || b.sum - a.sum);
    const nLate = alerts.filter(a => a.lt > 0).length;
    const last = paid.slice().sort((a, b) => String(b.pd || '').localeCompare(String(a.pd || '')) || b.id - a.id).slice(0, 6);
    return { mon, mIdx, pc: billed ? Math.round(coll / billed * 100) : 0, nPd: inv.filter(i => i.paid).length, nInv: inv.length, debt, late, ok, cons, alerts, nLate, last,
      nPay: X.live.filter(i => i.paid && String(i.pd || '').slice(0, 7) === mk).length, nCash: X.live.filter(i => i.paid && i.pw != 'b' && String(i.pd || '').slice(0, 7) === mk).length };
  }, [D, X, Y, R]);
  const name = D.cfg.short || D.cfg.aname || SHORT0;
  const wait = D.subs.length - k.ok;
  const date = new Date().toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="stack dash">
      <div className="ph">
        <div className="ph-t"><h2 id="ov">لوحة القيادة</h2><small>{name} <i>|</i> كما في <bdi dir="ltr">{date}</bdi></small></div>
        <div className="ph-a">
          <span className="ph-c">{I.drop}<b>{roundName(R)}</b> {Y}</span>
          <button type="button" className="bell" onClick={() => go('invoices', { st: '0' })} aria-label={'المتأخرون عن الأداء: ' + k.late}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            {k.late > 0 && <b>{k.late}</b>}
          </button>
          {act.can('ed') && <button type="button" className="cta" onClick={() => go('reads')}>{I.data}<span><b>تسجيل القراءات</b><small>تسجيل، تعديل، تحصيل</small></span></button>}
        </div>
      </div>

      <div className="kcards">
        <Kpi icon={I.coins} label={'مداخيل ' + MO[k.mIdx]} pill={<>{k.nPay} أداء <i>|</i> {k.nCash} نقداً</>} onClick={() => go('invoices', { st: '1' })}><CountUp value={Math.round(k.mon[k.mIdx])} format={fmt} /><em>د.م</em></Kpi>
        <Kpi icon={I.gauge} label={'الاستخلاص ' + Y} pill={<>{k.nPd} مؤداة <i>|</i> {k.nInv - k.nPd} متبقية</>} onClick={() => go('invoices')}><CountUp value={k.pc} suffix="%" format={v => Math.round(v)} /></Kpi>
        <Kpi icon={I.users} label="المشتركون" pill={<>{k.ok} قراءة <i>|</i> {wait} بانتظار</>} onClick={() => go('subs')}><CountUp value={D.subs.length} format={fmt} /></Kpi>
        <Kpi icon={I.warn} label="الديون" tone="bad" pill={<>{k.late} مشترك <i>|</i> {k.nLate} متأخر</>} onClick={() => go('invoices', { st: '0' })}><CountUp value={Math.round(k.debt)} format={fmt} /><em>د.م</em></Kpi>
      </div>

      <div className="dgrid">
        <section className="dpanel" aria-labelledby="lp">
          <h3 className="dp-h" id="lp">{I.bill}أحدث الأداءات</h3>
          {k.last.length ? <div className="tbl-w"><table className="tbl">
            <thead><tr><th>رقم الفاتورة</th><th className="c-d">تاريخ الأداء</th><th>المشترك</th><th className="c-r">الجولة</th><th>المبلغ</th><th>الطريقة</th><th>عرض</th></tr></thead>
            <tbody>{k.last.map(i => { const s = X.byId.get(i.s); return (
              <tr key={i.id}><td><bdi dir="ltr">{i.num}</bdi></td><td className="c-d"><bdi dir="ltr">{i.pd || ''}</bdi></td><td className="c-n">{s ? s.name : '—'}</td>
                <td className="c-r">{roundName(i.r)}</td><td><b><bdi dir="ltr">{n2(tot(i))}</bdi></b></td>
                <td><span className={'tag ' + (i.pw == 'b' ? 't-b' : 't-c')}>{i.pw == 'b' ? 'بنكياً' : 'نقداً'}</span></td>
                <td><button type="button" className="eye" onClick={() => act.openInvoice(i.id)} aria-label={'عرض فاتورة ' + i.num}>{I.eye}</button></td></tr>); })}</tbody>
          </table></div> : <Empty>لا توجد أداءات بعد</Empty>}
          <button type="button" className="more" onClick={() => go('invoices', { st: '1' })}>كل الأداءات ←</button>
        </section>

        <section className="dpanel al" aria-labelledby="al">
          <h3 className="dp-h" id="al"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 22 20H2Z" /><path d="M12 10v4M12 17v.5" /></svg>تنبيهات الأداء</h3>
          {k.alerts.slice(0, 5).map(a => { const s = X.byId.get(a.s); return (
            <button key={a.s} type="button" className="alr" onClick={() => act.openInvoice(a.first.id)}>
              <span className="alr-i">{I.bill}</span>
              <span className="alr-t"><b>{s ? s.name : '—'}</b><small>العداد {s ? s.meter : ''} <i>·</i> {a.n} فاتورة</small></span>
              <span className={'alr-s ' + (a.lt > 0 ? 'bad' : 'wait')}><em>{a.lt > 0 ? 'متأخر ' + a.lt + ' يوم' : 'غير مؤداة'}</em><b><bdi dir="ltr">{n2(a.sum)}</bdi> د.م</b></span>
            </button>); })}
          {!k.alerts.length && <Empty>✔ لا توجد ديون</Empty>}
          {k.alerts.length > 5 && <button type="button" className="more" onClick={() => go('invoices', { st: '0' })}>كل المتأخرين ({k.alerts.length}) ←</button>}
        </section>
      </div>

      <section className="strip" aria-label="الخزينة والاستهلاك">
        <div className="strip-h"><b>الخزينة</b><small>{roundName(R)} {Y}</small></div>
        <div className="tile"><span>الاستهلاك</span><b><bdi dir="ltr">{+k.cons.toFixed(2)}</bdi> <em>م³</em></b></div>
        <div className="tile tot"><span>الإجمالي</span><b><bdi dir="ltr">{fmt(X.balance[0] + X.balance[1])}</bdi> <em>د.م</em></b></div>
        <div className="tile"><span>الصندوق</span><b><bdi dir="ltr">{fmt(X.balance[0])}</bdi> <em>د.م</em></b></div>
        <div className="tile"><span>البنك</span><b><bdi dir="ltr">{fmt(X.balance[1])}</bdi> <em>د.م</em></b></div>
      </section>

      <p className="rule"><span>قراءات {roundName(R)}: <b><bdi dir="ltr">{k.ok} / {D.subs.length}</bdi></b></span><i /><span>بانتظار القراءة: <b>{wait}</b></span></p>


      <div className="acts">
        <button type="button" className="act a-n" onClick={() => go('subs')}>{I.people}عرض المشتركين</button>
        <button type="button" className="act" onClick={() => go('reads')}>{I.drop}تسجيل القراءات</button>
        <button type="button" className="act" onClick={() => go('invoices', { st: '0' })}>{I.list}الفواتير غير المؤداة</button>
        <p className="act-n"><b>ⓘ</b> اضغط على أي بطاقة أو سطر لفتح تفاصيله</p>
      </div>
    </div>
  );
}
