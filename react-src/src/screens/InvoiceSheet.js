import { useState } from 'react';
import { useData } from '../lib/useData.js';
import { tot, n2, roundName, due, today, daysBetween, tierLines } from '../lib/calc.js';
import { pay, unpay, openWhatsApp } from '../lib/ops.js';
import Sheet from '../components/Sheet.js';

export default function InvoiceSheet({ id, onClose }) {
  const { D, act } = useData();
  const [err, setErr] = useState('');
  const i = D.invs.find(x => x.id === id); if (!i) return null;
  const s = D.subs.find(x => x.id === i.s) || {}, c = +(i.n - i.o).toFixed(3), dd = due(i, D.cfg.due), lt = daysBetween(dd, today());
  return (
    <Sheet title={'فاتورة ' + i.num} sub={s.name + '، ' + roundName(i.r) + ' ' + i.y} onClose={onClose} labelId="is-t">
      <div className={'is-amt' + (i.paid ? ' paid' : lt > 0 ? ' late' : '')}>
        <b><bdi dir="ltr">{n2(tot(i))}</bdi></b><span>درهم</span>
        <small>{i.paid ? `مؤداة ${i.pw == 'b' ? 'بنكياً' : 'نقداً'} في ${i.pd}` : lt > 0 ? `متأخرة ${lt} يوم (آخر أجل ${dd})` : 'آخر أجل للأداء ' + dd}</small>
      </div>
      <table className="tbl"><tbody>
        <tr><th>القراءة</th><td>من <bdi dir="ltr">{i.o}</bdi> إلى <bdi dir="ltr">{i.n}</bdi></td></tr>
        <tr><th>الاستهلاك</th><td><bdi dir="ltr">{c}</bdi> م³</td></tr>
        {i.tr ? tierLines(c, i.tr).map((l, k) => <tr key={k}><th>شطر {k + 1}</th><td><bdi dir="ltr">{l.q} × {n2(l.price)} = {n2(l.amt)}</bdi></td></tr>)
          : <tr><th>الثمن</th><td><bdi dir="ltr">{c} × {n2(i.price)} = {n2(c * i.price)}</bdi></td></tr>}
        {+i.fee ? <tr><th>واجب ثابت</th><td><bdi dir="ltr">{n2(i.fee)}</bdi></td></tr> : null}
        <tr><th>تاريخ الإصدار</th><td>{i.date}</td></tr>
      </tbody></table>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row">
        {!i.paid && <><button type="button" className="btn pay" data-autofocus onClick={() => act.update(D2 => pay(D2, [i.id], 'c'))}>تأكيد الدفع نقداً</button>
          <button type="button" className="btn" onClick={() => act.update(D2 => pay(D2, [i.id], 'b'))}>تأكيد الدفع بنكياً</button></>}
        <button type="button" className="btn wa" onClick={() => { const e = openWhatsApp(D, i, act.assoc); setErr(e || ''); }}>واتساب</button>
        {i.paid && <button type="button" className="btn ghost" onClick={() => { if (confirm('إلغاء دفع الفاتورة ' + i.num + '؟ سيُنقص المبلغ من ' + (i.pw == 'b' ? 'البنك' : 'الصندوق') + '.')) act.update(D2 => unpay(D2, i.id)); }}>إلغاء الدفع</button>}
      </div>
    </Sheet>
  );
}
