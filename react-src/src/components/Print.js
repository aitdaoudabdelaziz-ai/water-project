// الطباعة: فاتورة (أو وصل أداء إن كانت مؤداة)، صفحة A4 لكل واحدة
import { useEffect } from 'react';
import { tot, n2, RN, due, tierLines } from '../lib/calc.js';

export function doPrint(name) {
  const C = window.Capacitor, P = C && C.Plugins && C.Plugins.WaterPrint;
  if (C && C.isNativePlatform && C.isNativePlatform() && P) { P.print({ name: name || 'AlFath' }).catch(() => window.print()); return; }
  window.print();
}

export default function PrintArea({ D, ids, assoc, onDone }) {
  useEffect(() => {
    const done = () => onDone(); window.addEventListener('afterprint', done);
    const t = setTimeout(() => doPrint('AlFath-Water'), 120);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [ids]);
  const C = D.cfg;
  return (
    <div className="print-area" aria-hidden="true">
      {ids.map(id => { const i = D.invs.find(x => x.id === id); if (!i) return null;
        const s = Object.assign({}, D.subs.find(x => x.id === i.s), i.ov || {}), c = +(i.n - i.o).toFixed(3), lines = i.tr ? tierLines(c, i.tr) : [{ q: c, price: i.price, amt: c * i.price }];
        return (
          <section className="pg" key={id}>
            <header className="pg-h">
              <img src={C.logo || '../icon-192.png'} alt="" />
              <div><b>{assoc}</b><span>لجنة الماء الصالح للشرب</span>{(C.phone || C.email) && <small>{[C.phone && 'الهاتف ' + C.phone, C.email].filter(Boolean).join('، ')}</small>}</div>
              <div className="pg-n"><b>{i.paid ? 'وصل أداء' : 'فاتورة الماء'}</b><span>رقم <bdi dir="ltr">{i.num}</bdi></span><small>{RN[i.r]} {i.y}</small></div>
            </header>
            <div className="pg-sub"><div><span>المشترك</span><b>{s.name}</b></div><div><span>رقم العداد</span><b>{s.meter}</b></div>
              <div><span>العنوان</span><b>{s.addr || '—'}</b></div><div><span>تاريخ الإصدار</span><b>{i.date}</b></div></div>
            <table className="pg-t"><thead><tr><th>القراءة القديمة</th><th>القراءة الجديدة</th><th>الاستهلاك</th></tr></thead>
              <tbody><tr><td>{i.o}</td><td>{i.n}</td><td>{c} م³</td></tr></tbody></table>
            <table className="pg-t"><thead><tr><th>البيان</th><th>الكمية</th><th>الثمن</th><th>المبلغ (درهم)</th></tr></thead>
              <tbody>{lines.map((l, k) => <tr key={k}><td>{i.tr ? 'الشطر ' + (k + 1) : 'الاستهلاك'}</td><td>{l.q} م³</td><td>{n2(l.price)}</td><td>{n2(l.amt)}</td></tr>)}
                {+i.fee ? <tr><td>الواجب الثابت</td><td></td><td></td><td>{n2(i.fee)}</td></tr> : null}</tbody>
              <tfoot><tr><td colSpan="3">المجموع</td><td>{n2(tot(i))}</td></tr></tfoot></table>
            <div className={'pg-st' + (i.paid ? ' paid' : '')}>{i.paid ? `أُدّي المبلغ ${i.pw === 'b' ? 'بنكياً' : 'نقداً'} بتاريخ ${i.pd}` : `آخر أجل للأداء: ${due(i, C.due)}`}</div>
            {C.rib && !i.paid && <p className="pg-f">الأداء البنكي: {C.bank ? C.bank + '، ' : ''}RIB <bdi dir="ltr">{C.rib}</bdi></p>}
            <footer className="pg-sig"><span>توقيع أمين المال</span><span>ختم الجمعية</span></footer>
          </section>); })}
    </div>
  );
}
