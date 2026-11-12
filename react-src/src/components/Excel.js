// أزرار Excel للمشتركين والقراءات — نفس وظائف البرنامج القديم (imp / tpl / expAll) مع معاينة قبل الحفظ
import { useState } from 'react';
import { useData } from '../lib/useData.js';
import { readBook, saveXlsx } from '../lib/excel.js';
import { importBook } from '../lib/ops.js';
import { key, prevNew, roundName, tot, n2, RN, today } from '../lib/calc.js';
import Sheet from './Sheet.js';

const fd = d => String(d || '').split('-').reverse().join('/');
const cs = (o, n) => +(n - o).toFixed(3);

/** نموذج المشتركين (tpl(0) في البرنامج القديم) */
export const tplSubs = () => saveXlsx('modele-abonnes', [['المشتركون', [['الاسم الكامل', 'رقم العداد', 'رقم البطاقة الوطنية', 'الهاتف', 'العنوان', 'قديمة', 'جديدة'], ['محمد أحمد', '1001', 'A123456', '0600000000', 'الدوار', 0, 12]]]]);
/** لائحة المشتركين: نفس أعمدة النموذج، فتُعدَّل وتُستورد من جديد */
export const expSubs = (D, X, list) => saveXlsx('abonnes-' + today(), [['المشتركون', [['الاسم الكامل', 'رقم العداد', 'رقم البطاقة الوطنية', 'الهاتف', 'العنوان', 'العقد', 'الديون']]
  .concat((list || D.subs).map(s => [s.name, s.meter, s.cin || '', s.phone || '', s.addr || '', s.ct ? 'موقّع' : 'غير موقّع', +n2(X.debtBySub.get(s.id) || 0)]))]]);
/** قراءات الجولة (tpl(1)): القديمة معبّأة، تُملأ الجديدة ثم تُستورد */
export const expReads = (D, y, r) => saveXlsx('releves-' + y + '-T' + (r + 1), [[roundName(r) + ' ' + y, [['رقم العداد', 'الاسم الكامل', 'قديمة', 'جديدة', 'الاستهلاك']]
  .concat(D.subs.map(s => { const v = D.reads[key(s.id, y, r)], o = v ? v.o : prevNew(D, s.id, y, r); return [s.meter, s.name, o ?? '', v ? v.n : '', v ? cs(v.o, v.n) : '']; }))]]);
/** كل البيانات في ملف واحد (expAll في البرنامج القديم) */
export function expAll(D) {
  const nm = id => D.subs.find(x => x.id == id) || {};
  const TN = { in: 'مدخول', out: 'مصروف', dep: 'إيداع بنكي', wd: 'سحب بنكي' };
  saveXlsx('donnees-eau-' + today(), [
    ['المشتركون', [['الاسم', 'رقم العداد', 'البطاقة الوطنية', 'الهاتف', 'العنوان', 'العقد']].concat(D.subs.map(s => [s.name, s.meter, s.cin || '', s.phone || '', s.addr || '', s.ct ? 'موقّع' : 'غير موقّع']))],
    ['القراءات', [['المشترك', 'العداد', 'السنة', 'الجولة', 'القديمة', 'الجديدة', 'الاستهلاك']].concat(Object.keys(D.reads).map(k => { const [id, y, r] = k.split('|'), v = D.reads[k], s = nm(+id); return [s.name || '', s.meter || '', +y, RN[+r], v.o, v.n, cs(v.o, v.n)]; }))],
    ['الفواتير', [['رقم الفاتورة', 'المشترك', 'الجولة', 'السنة', 'الاستهلاك', 'المبلغ', 'تاريخ الإصدار', 'الحالة', 'تاريخ الأداء', 'الحساب']].concat(D.invs.map(i => [i.num, nm(i.s).name || '', RN[i.r], i.y, cs(i.o, i.n), +n2(tot(i)), fd(i.date), i.paid ? 'مدفوعة' : 'غير مدفوعة', i.pd ? fd(i.pd) : '', i.paid ? (i.pw == 'b' ? 'بنكي' : 'الصندوق') : '']))],
    ['المالية', [['التاريخ', 'النوع', 'الحساب', 'البيان', 'المبلغ', 'ملاحظة']].concat(D.fin.map(x => [fd(x.d), TN[x.t], x.t == 'dep' ? 'صندوق ← بنك' : x.t == 'wd' ? 'بنك ← صندوق' : x.w == 'b' ? 'بنكي' : 'الصندوق', x.c, x.a, x.n || '']))],
  ]);
}

/** زر «استيراد من Excel»: يقرأ الملف، يعرض ما سيتغيّر، ثم يحفظ بعد التأكيد */
export function ImportButton({ label, y, r }) {
  const { D, act } = useData();
  const [st, setSt] = useState(null); // { file, book, rep }
  if (!act.can('ed')) return null;
  const pick = async f => {
    let book; try { book = await readBook(f); } catch (e) { alert('خطأ: ' + e.message); return; }
    const rep = importBook(JSON.parse(JSON.stringify(D)), book, y, r); // معاينة على نسخة
    if (!rep.sheets) { alert('خطأ: يجب وجود عمود «رقم العداد» في السطر الأول من الملف.\nحمّل «نموذج Excel» لترى الأعمدة المطلوبة.'); return; }
    setSt({ file: f.name, book, rep });
  };
  return <>
    <label className="btn">{label}<input type="file" accept=".xlsx,.csv" hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) pick(f); }} /></label>
    {st && <Preview {...st} y={y} r={r} onClose={() => setSt(null)} />}
  </>;
}

const TAG = { new: ['جديد', 'good'], upd: ['موجود', 't-b'], bad: ['متجاهَل', 'bad'] };
function Preview({ file, book, rep, y, r, onClose }) {
  const { act } = useData();
  const [done, setDone] = useState(null);
  const go = () => { let res = null; act.update(D2 => { res = importBook(D2, book, y, r); }); if (res) setDone(res); };
  const R = done || rep;
  return (
    <Sheet title={done ? '✔ تم الاستيراد' : 'استيراد من Excel'} sub={file + ' — قراءات ' + roundName(r) + ' ' + y} onClose={onClose} labelId="xl-t">
      <dl className="facts">
        <div><dt>أسطر الملف</dt><dd>{R.tot}</dd></div>
        <div><dt>مشتركون جدد</dt><dd className="good">{R.a}</dd></div>
        <div><dt>موجودون (تحديث)</dt><dd>{R.up}</dd></div>
        <div><dt>قراءات مسجَّلة</dt><dd className={R.rr ? 'good' : ''}>{R.rr}</dd></div>
        <div><dt>متجاهَل / ملاحظات</dt><dd className={R.bad.length ? 'bad' : ''}>{R.bad.length}</dd></div>
        <div><dt>الجولة</dt><dd>{roundName(r)} {y}</dd></div>
      </dl>
      {!done && <p className="note">المفتاح هو <b>رقم العداد</b>: المشترك الموجود تُحدَّث معلوماته ولا يتكرر. عمودا «قديمة» و«جديدة» يسجّلان قراءة {roundName(r)} {y}. القراءة المقفلة بفاتورة مدفوعة لا تتغيّر.</p>}
      <div className="tbl-w xl-p"><table className="tbl"><thead><tr><th>السطر</th><th>العداد</th><th>الاسم</th><th>الحالة</th></tr></thead>
        <tbody>{R.rows.slice(0, 300).map((x, i) => <tr key={i}><td>{x.lab}</td><td><bdi dir="ltr">{x.m || '—'}</bdi></td><td className="c-n">{x.nm || '—'}</td>
          <td className="xl-s"><span className={'tag ' + TAG[x.st][1]}>{TAG[x.st][0]}</span>{x.t && <small className={x.t.startsWith('⚠') || x.st === 'bad' ? 'bad' : ''}> {x.t}</small>}</td></tr>)}</tbody></table></div>
      {R.rows.length > 300 && <p className="note">… و{R.rows.length - 300} سطر آخر</p>}
      <div className="row">
        {done ? <button type="button" className="btn pri" onClick={onClose}>إغلاق</button> : <>
          <button type="button" className="btn pri" disabled={!R.a && !R.up} onClick={go}>تأكيد الاستيراد</button>
          <button type="button" className="btn ghost" onClick={onClose}>إلغاء</button></>}
      </div>
    </Sheet>
  );
}
