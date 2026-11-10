// تسجيل قراءة + إصدار الفاتورة + الدفع + واتساب، في نافذة واحدة (التحصيل السريع)
import { useMemo, useRef, useState } from 'react';
import { useData } from '../lib/useData.js';
import { key, prevNew, tot, n2, roundName, tierAmt } from '../lib/calc.js';
import { setReading, regInv, pay, openWhatsApp, roundPaid, deleteReading, PAID_LOCK } from '../lib/ops.js';
import Odometer from '../components/Odometer.js';
import Sheet from '../components/Sheet.js';
import { Avatar } from '../components/ui.js';

export default function ReadingSheet({ subId, y, r, onClose, onNext }) {
  const { D, act } = useData();
  const s = D.subs.find(x => x.id === subId);
  const v0 = D.reads[key(subId, y, r)], pv = prevNew(D, subId, y, r);
  const [o, setO] = useState(v0 ? String(v0.o) : pv != null ? String(pv) : '');
  const [n, setN] = useState(v0 ? String(v0.n) : '');
  const [err, setErr] = useState(''); const [info, setInfo] = useState('');
  const nRef = useRef(null);
  const inv = D.invs.find(i => i.s === subId && i.y == y && i.r == r);
  const locked = roundPaid(D, subId, y, r), canEd = act.can('ed');
  const c = n !== '' && o !== '' && !isNaN(n) && !isNaN(o) ? +(+n - +o).toFixed(3) : null;
  const est = useMemo(() => { if (c == null || c < 0) return null; const T = D.cfg.trOn && D.cfg.tr && D.cfg.tr.length ? D.cfg.tr : null;
    return (T ? tierAmt(c, T) : c * D.cfg.price) + (+D.cfg.fee || 0); }, [c, D.cfg]);
  if (!s) return null;

  const save = () => {
    if (n === '') { setErr('اكتب القراءة الجديدة.'); nRef.current && nRef.current.focus(); return false; }
    let e = null; act.update(D2 => { e = setReading(D2, subId, y, r, parseFloat(o), parseFloat(n)); if (!e) regInv(D2, subId, y, r); });
    setErr(e || ''); return !e;
  };
  const del = () => {
    if (!confirm('مسح قراءة ' + s.name + (inv ? ' وفاتورتها ' + inv.num + ' غير المؤداة' : '') + '؟')) return;
    let e = null; act.update(D2 => { e = deleteReading(D2, subId, y, r); });
    if (e) setErr(e); else { setN(''); setO(pv != null ? String(pv) : ''); setErr(''); setInfo('مُسحت القراءة' + (inv ? ' والفاتورة' : '') + '.'); }
  };
  const doPay = w => act.update(D2 => pay(D2, [inv.id], w));
  const wa = () => { const e = openWhatsApp(D, inv, act.assoc); if (e) setErr(e); };

  return (
    <Sheet title={s.name} sub={'العداد ' + s.meter + '، ' + roundName(r) + ' ' + y} onClose={onClose} labelId="rs-t">
      <div className="rs-who"><Avatar sub={s} size={48} />
        <dl><div><dt>القراءة السابقة</dt><dd><bdi dir="ltr">{pv ?? '—'}</bdi></dd></div><div><dt>الاستهلاك</dt><dd><bdi dir="ltr">{c ?? '—'}</bdi> م³</dd></div>
          <div><dt>المبلغ</dt><dd><bdi dir="ltr">{est == null ? '—' : n2(inv && !locked ? est : inv ? tot(inv) : est)}</bdi> د.م</dd></div></dl></div>
      <Odometer value={n === '' ? null : parseFloat(n)} label="العدّاد" />
      <div className="rs-in">
        <label>القراءة القديمة<input inputMode="decimal" value={o} disabled={locked} onChange={e => { setO(e.target.value.replace(',', '.')); setErr(''); }} /></label>
        <label className="big">القراءة الجديدة<input ref={nRef} data-autofocus inputMode="decimal" value={n} disabled={locked} placeholder="مثلاً 1284"
          onChange={e => { setN(e.target.value.replace(',', '.')); setErr(''); }} onKeyDown={e => e.key === 'Enter' && save()} /></label>
      </div>
      {v0 && !locked && <p className="state" role="status">✎ قراءة مسجّلة من <bdi dir="ltr">{v0.o}</bdi> إلى <bdi dir="ltr">{v0.n}</bdi>. غيّر الرقم ثم احفظ لتعديلها، أو امسحها.</p>}
      {locked && <p className="warn">🔒 {PAID_LOCK}</p>}
      {info && <p className="state" role="status">{info}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      {!canEd && <p className="warn">ليست لديك صلاحية التعديل.</p>}
      {!locked && canEd && <div className="row"><button type="button" className="btn pri" onClick={() => { setInfo(''); save(); }}>{v0 ? 'حفظ التعديل' : 'حفظ القراءة وإصدار الفاتورة'}</button>
        {onNext && <button type="button" className="btn" onClick={() => { if (save()) onNext(); }}>حفظ والتالي</button>}
        {v0 && act.can('del') && <button type="button" className="btn ghost" onClick={del}>🗑 مسح القراءة</button>}</div>}
      {inv && <div className="rs-inv">
        <p className={inv.paid ? 'ok' : ''}>فاتورة <bdi dir="ltr">{inv.num}</bdi>: <b><bdi dir="ltr">{n2(tot(inv))}</bdi> درهم</b>{inv.paid ? `، مؤداة ${inv.pw == 'b' ? 'بنكياً' : 'نقداً'} في ${inv.pd}` : '، غير مؤداة'}</p>
        <div className="row">
          {!inv.paid && canEd && <><button type="button" className="btn pay" onClick={() => doPay('c')}>تأكيد الدفع نقداً</button><button type="button" className="btn" onClick={() => doPay('b')}>تأكيد الدفع بنكياً</button></>}
          <button type="button" className="btn wa" onClick={wa}>واتساب</button>
          {act.can('pr') && <button type="button" className="btn" onClick={() => act.print([inv.id])}>🖨 طباعة</button>}
          {act.can('pr') && <button type="button" className={'btn' + (inv.paid ? ' pri' : '')} onClick={() => act.thermal([inv.id])}>🧾 {inv.paid ? 'وصل حراري للأداء' : 'وصل حراري'}</button>}
        </div></div>}
    </Sheet>
  );
}
