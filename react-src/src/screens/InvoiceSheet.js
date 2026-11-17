import { useState } from 'react';
import { useData } from '../lib/useData.js';
import { tot, n2, roundName, due, today, daysBetween, tierLines, arrears } from '../lib/calc.js';
import { pay, unpay, openWhatsApp, saveInvoice, resetInvoice, deleteInvoice, invTiers } from '../lib/ops.js';
import Sheet from '../components/Sheet.js';

export default function InvoiceSheet({ id, onClose }) {
  const { D, act } = useData();
  const [err, setErr] = useState(''), [ed, setEd] = useState(false);
  const i = D.invs.find(x => x.id === id); if (!i) return null;
  if (ed) return <InvoiceEdit i={i} onDone={() => setEd(false)} />;
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
        {!i.paid && (() => { const ar = arrears(D, i), t = ar.reduce((x, y) => x + tot(y), 0); return ar.length ? <>
          <tr className="ar-r"><th>متأخرات سابقة</th><td>{ar.length} {ar.length > 2 ? 'فواتير' : ar.length == 2 ? 'فاتورتان' : 'فاتورة'}: <bdi dir="ltr">{n2(t)}</bdi> درهم</td></tr>
          <tr className="ar-r"><th>المجموع الكلي</th><td><b><bdi dir="ltr">{n2(tot(i) + t)}</bdi> درهم</b></td></tr></> : null; })()}
      </tbody></table>
      {i.note && <p className="note" style={{ whiteSpace: 'pre-line' }}>📝 {i.note}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row">
        {!i.paid && act.can('ed') && <><button type="button" className="btn pay" data-autofocus onClick={() => act.update(D2 => pay(D2, [i.id], 'c'))}>تأكيد الدفع نقداً</button>
          <button type="button" className="btn" onClick={() => act.update(D2 => pay(D2, [i.id], 'b'))}>تأكيد الدفع بنكياً</button></>}
        <button type="button" className="btn wa" onClick={() => { const e = openWhatsApp(D, i, act.assoc); setErr(e || ''); }}>واتساب</button>
        {act.can('pr') && <button type="button" className="btn" onClick={() => act.print([i.id])}>🖨 {i.paid ? 'طباعة الوصل' : 'طباعة الفاتورة'}</button>}
        {act.can('pr') && <button type="button" className="btn" onClick={() => act.thermal([i.id])}>🧾 {i.paid ? 'وصل حراري للأداء' : 'وصل حراري'}</button>}
        {!!i.paid && act.can('ed') && <button type="button" className="btn ghost" onClick={() => { if (confirm('إلغاء دفع الفاتورة ' + i.num + '؟ سيُنقص المبلغ من ' + (i.pw == 'b' ? 'البنك' : 'الصندوق') + '.')) act.update(D2 => unpay(D2, i.id)); }}>إلغاء الدفع</button>}
      </div>
      {(act.can('ed') || act.can('del')) && <div className="row">
        {act.can('ed') && <button type="button" className="btn" onClick={() => setEd(true)}>✎ تعديل الفاتورة</button>}
        {act.can('del') && !i.paid && <button type="button" className="btn ghost danger" onClick={() => { if (confirm('حذف الفاتورة ' + i.num + ' من السجل؟')) { act.update(D2 => deleteInvoice(D2, i.id)); onClose(); } }}>🗑 حذف الفاتورة</button>}
      </div>}
    </Sheet>
  );
}

/** نافذة تعديل الفاتورة: نفس حقول البرنامج الأصلي. التعديل يخص هذه الفاتورة فقط ولا يغيّر بيانات المشترك */
function InvoiceEdit({ i, onDone }) {
  const { D, act } = useData();
  const s = Object.assign({}, D.subs.find(x => x.id === i.s), i.ov || {}), T = i.tr || invTiers(D);
  const [v, setV] = useState({ num: i.num, date: i.date, name: s.name || '', meter: s.meter || '', phone: s.phone || '', addr: s.addr || '', o: String(i.o), n: String(i.n), price: String(i.price), fee: String(i.fee), note: i.note || '', tr: !!i.tr });
  const [err, setErr] = useState('');
  const f = (k, label, extra = {}) => <label className="field">{label}<input value={v[k]} onChange={e => { setV({ ...v, [k]: e.target.value }); setErr(''); }} {...extra} /></label>;
  const num = x => parseFloat(String(x).replace(',', '.'));
  const c = +(num(v.n) - num(v.o)).toFixed(3), sum = isNaN(c) ? null : +(((v.tr && T) ? tierLines(c, T).reduce((a, l) => a + l.amt, 0) : c * (num(v.price) || 0)) + (num(v.fee) || 0)).toFixed(2);
  const save = e => { e.preventDefault(); let r = null; act.update(D2 => { r = saveInvoice(D2, i.id, v); }); if (r) setErr(r); else onDone(); };
  return (
    <Sheet title={'تعديل الفاتورة ' + i.num} onClose={onDone} labelId="ie-t">
      <form className="form" onSubmit={save}>
        <div className="form two">
          {f('num', 'رقم الفاتورة', { dir: 'ltr' })}{f('date', 'تاريخ الإصدار', { type: 'date' })}
          {f('name', 'اسم المشترك')}{f('meter', 'رقم العداد')}{f('phone', 'الهاتف', { inputMode: 'tel', dir: 'ltr' })}{f('addr', 'العنوان')}
          {f('o', 'القراءة السابقة (م³)', { inputMode: 'decimal', dir: 'ltr' })}{f('n', 'القراءة الحالية (م³)', { inputMode: 'decimal', dir: 'ltr' })}
          {f('price', 'الثمن (درهم/م³)', { inputMode: 'decimal', dir: 'ltr', disabled: !!(v.tr && T) })}{f('fee', 'رسوم الاشتراك (درهم)', { inputMode: 'decimal', dir: 'ltr' })}
        </div>
        {T && <label className="chk"><input type="checkbox" checked={v.tr} onChange={e => setV({ ...v, tr: e.target.checked })} /> تسعيرة بالأشطر (تُطبَّق على هذه الفاتورة)</label>}
        <label className="field">ملاحظة إضافية تظهر في الفاتورة<textarea rows="2" value={v.note} onChange={e => setV({ ...v, note: e.target.value })} /></label>
        <p className="is-sum">المبلغ: <b><bdi dir="ltr">{sum == null || isNaN(sum) ? '—' : n2(sum)}</bdi> درهم</b></p>
        <p className="note">التعديل هنا يخص هذه الفاتورة فقط ولا يغيّر بيانات المشترك. المبلغ يُحسب تلقائياً ويدخل في المالية.</p>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="row"><button type="submit" className="btn pri">حفظ</button>
          <button type="button" className="btn" onClick={() => { if (confirm('إرجاع كل بيانات هذه الفاتورة إلى ما في البرنامج (القراءات، الثمن، الرسوم، بيانات المشترك)؟')) { act.update(D2 => resetInvoice(D2, i.id)); onDone(); } }}>إعادة الضبط من بيانات البرنامج</button>
          <button type="button" className="btn ghost" onClick={onDone}>إلغاء</button></div>
      </form>
    </Sheet>
  );
}
