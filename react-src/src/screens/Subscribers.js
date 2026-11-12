import { useDeferredValue, useMemo, useState } from 'react';
import { useData } from '../lib/useData.js';
import { tot, n2, fmt, norm, roundName, key } from '../lib/calc.js';
import { Avatar, Empty } from '../components/ui.js';
import Sheet from '../components/Sheet.js';
import { saveSub, removeSubs, toggleContract } from '../lib/ops.js';
import { ImportButton, expSubs, tplSubs } from '../components/Excel.js';

const PAGE = 60;
export default function Subscribers() {
  const { D, X, Y, R, act, sel: SEL } = useData();
  const [form, setForm] = useState(null); // { id? } إضافة أو تعديل
  const [q, setQ] = useState(''); const dq = useDeferredValue(q);
  const [f, setF] = useState(''); const [sel, setSel] = useState(null); const [lim, setLim] = useState(PAGE);
  const list = useMemo(() => {
    const t = norm(dq.trim());
    return D.subs.filter(s => (!t || [s.name, s.meter, s.cin, s.phone, s.addr].some(v => norm(v).includes(t)))
      && (f === '' || (f === 'debt' ? X.debtBySub.has(s.id) : f === 'noread' ? !D.reads[key(s.id, Y, R)] : (f === 'ct') === !!s.ct)));
  }, [D, X, dq, f, Y, R]);
  const s = sel != null ? X.byId.get(sel) : null;
  return (
    <div className="stack">
      <div className="panel toolbar">
        <h2>المشتركون <span className="cnt">{list.length}</span></h2>
        {act.can('ed') && <button type="button" className="btn pri" onClick={() => setForm({})}>＋ مشترك جديد</button>}
        {act.readOnly && <button type="button" className="btn ro-hint" onClick={act.goData}>🔒 السحابة للقراءة فقط — للإضافة والتعديل والحذف فعّل «الحفظ في السحابة»</button>}
        <div className="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>
          <input value={q} onChange={e => { setQ(e.target.value); setLim(PAGE); }} placeholder="بحث بالاسم أو العداد أو البطاقة أو الهاتف" aria-label="بحث في المشتركين" /></div>
        <div className="chips" role="group" aria-label="تصفية">
          {[['', 'الكل'], ['debt', 'عليهم ديون'], ['noread', 'بدون قراءة ' + roundName(R)], ['ct', 'بعقد'], ['noct', 'بدون عقد']].map(([v, l]) =>
            <button key={v} type="button" className={'chip' + (f === v ? ' on' : '')} aria-pressed={f === v} onClick={() => { setF(v); setLim(PAGE); }}>{l}</button>)}
        </div>
        <div className="row xl-row">
          <ImportButton label="⬆ استيراد من Excel" y={SEL.y} r={SEL.r} />
          <button type="button" className="btn" onClick={() => expSubs(D, X, list)}>⬇ تصدير Excel</button>
          <button type="button" className="btn" onClick={tplSubs}>نموذج Excel</button>
        </div>
      </div>
      {!list.length ? <Empty>لا يوجد مشتركون مطابقون للبحث</Empty> : (<div>
        <div className="lh lh-s" aria-hidden="true"><span>المشترك</span><span>الديون</span></div>
        <ul className="list">
          {list.slice(0, lim).map(s => { const d = X.debtBySub.get(s.id); return (
            <li key={s.id}><button type="button" className="row-b" onClick={() => setSel(s.id)}>
              <Avatar sub={s} />
              <span className="row-i"><b>{s.name}</b><small>العداد {s.meter}{s.phone ? <>، <bdi dir="ltr">{s.phone}</bdi></> : null}</small></span>
              {d ? <span className="tag bad"><bdi dir="ltr">{n2(d)}</bdi> د.م</span> : <span className="tag good">لا ديون</span>}
            </button></li>); })}
        </ul></div>)}
      {list.length > lim && <button type="button" className="btn wide" onClick={() => setLim(lim + PAGE)}>عرض المزيد ({list.length - lim})</button>}
      {s && <Detail s={s} onClose={() => setSel(null)} onEdit={() => { setSel(null); setForm({ id: s.id }); }} />}
      {form && <SubSheet id={form.id} onClose={id => { setForm(null); if (id != null) setSel(id); }} />}
    </div>
  );
}

function Detail({ s, onClose, onEdit }) {
  const { D, X, act, setSel, Y, R } = useData();
  const inv = X.live.filter(i => i.s === s.id).sort((a, b) => b.y - a.y || b.r - a.r);
  const debt = X.debtBySub.get(s.id) || 0;
  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="sdn" onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="dlg-b sheet">
        <div className="sheet-h"><Avatar sub={s} size={52} /><div><h3 id="sdn">{s.name}</h3><small>العداد {s.meter}</small></div>
          <button type="button" className="x" onClick={onClose} aria-label="إغلاق" autoFocus>✕</button></div>
        <dl className="facts">
          <div><dt>الهاتف</dt><dd><bdi dir="ltr">{s.phone || '—'}</bdi></dd></div>
          <div><dt>البطاقة</dt><dd>{s.cin || '—'}</dd></div>
          <div><dt>العنوان</dt><dd>{s.addr || '—'}</dd></div>
          <div><dt>العقد</dt><dd>{s.ct ? '✔ موقّع' : '—'}</dd></div>
          <div><dt>الديون</dt><dd className={debt ? 'bad' : 'good'}><bdi dir="ltr">{n2(debt)}</bdi> د.م</dd></div>
          <div><dt>الفواتير</dt><dd>{inv.length}</dd></div>
        </dl>
        <div className="row">
          {act.can('ed') && <button type="button" className="btn pri" onClick={() => { setSel({ y: Y, r: R }); onClose(); act.openReading(s.id); }}>تسجيل قراءة {roundName(R)}</button>}
          {act.can('ed') && <button type="button" className="btn" onClick={onEdit}>✎ تعديل المعلومات</button>}
          {act.can('ed') && <button type="button" className="btn" onClick={() => act.update(D2 => toggleContract(D2, s.id))}>{s.ct ? 'إلغاء توقيع العقد' : '✔ العقد موقّع'}</button>}
          {act.can('del') && <button type="button" className="btn ghost danger" onClick={() => {
            if (!confirm('حذف المشترك «' + s.name + '» وقراءاته وفواتيره؟' + (inv.some(i => i.paid) ? '\nالمبالغ المؤداة تبقى في المالية كمدخول.' : ''))) return;
            act.update(D2 => removeSubs(D2, [s.id])); onClose(); }}>🗑 حذف المشترك</button>}
        </div>
        <h4>الفواتير</h4>
        {!inv.length ? <Empty>لا توجد فواتير</Empty> : (
          <div className="tbl-w"><table className="tbl"><thead><tr><th>الرقم</th><th>الجولة</th><th>الاستهلاك</th><th>المبلغ</th><th>الحالة</th></tr></thead>
            <tbody>{inv.map(i => <tr key={i.id} className="click" onClick={() => { onClose(); act.openInvoice(i.id); }}><td><bdi dir="ltr">{i.num}</bdi></td><td>{roundName(i.r)} {i.y}</td><td><bdi dir="ltr">{+(i.n - i.o).toFixed(3)}</bdi> م³</td>
              <td><bdi dir="ltr">{n2(tot(i))}</bdi></td><td className={i.paid ? 'good' : 'bad'}>{i.paid ? '✓ ' + (i.pd || '') : 'غير مؤداة'}</td></tr>)}</tbody></table></div>)}
        <p className="note">مجموع المؤدى: <bdi dir="ltr">{fmt(inv.filter(i => i.paid).reduce((t, i) => t + tot(i), 0))}</bdi> د.م</p>
      </div>
    </div>
  );
}

/** نموذج إضافة / تعديل مشترك (نفس حقول البرنامج الحالي) */
function SubSheet({ id, onClose }) {
  const { D, act } = useData();
  const o = id != null ? D.subs.find(x => x.id === id) || {} : {};
  const [v, setV] = useState({ name: o.name || '', meter: o.meter || '', cin: o.cin || '', phone: o.phone || '', addr: o.addr || '' });
  const [err, setErr] = useState('');
  const f = (k, label, extra = {}) => <label className="field">{label}<input value={v[k]} onChange={e => { setV({ ...v, [k]: e.target.value }); setErr(''); }} {...extra} /></label>;
  const save = e => { e.preventDefault(); let r; act.update(D2 => { r = saveSub(D2, id, v); });
    if (!r) return; if (r.error) { setErr(r.error); return; } onClose(r.id); };
  return (
    <Sheet title={id != null ? 'تعديل مشترك' : 'إضافة مشترك'} onClose={() => onClose()} labelId="ss-t">
      <form className="form" onSubmit={save}>
        {f('name', 'الاسم الكامل *', { 'data-autofocus': true, autoComplete: 'off' })}
        {f('meter', 'رقم العداد *', { autoComplete: 'off' })}
        {f('cin', 'رقم البطاقة الوطنية', { autoComplete: 'off' })}
        {f('phone', 'الهاتف', { inputMode: 'tel', dir: 'ltr', autoComplete: 'off' })}
        {f('addr', 'العنوان', { autoComplete: 'off' })}
        {err && <p className="err" role="alert">{err}</p>}
        <div className="row"><button type="submit" className="btn pri">{id != null ? 'حفظ التعديل' : 'إضافة المشترك'}</button>
          <button type="button" className="btn ghost" onClick={() => onClose()}>إلغاء</button></div>
      </form>
    </Sheet>
  );
}
