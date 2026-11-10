// تسجيل قراءة + إصدار الفاتورة + الدفع + واتساب، في نافذة واحدة (التحصيل السريع)
import { useMemo, useRef, useState } from 'react';
import { useData } from '../lib/useData.js';
import { key, prevNew, tot, n2, roundName, tierAmt } from '../lib/calc.js';
import { setReading, regInv, pay, openWhatsApp, roundPaid, PAID_LOCK } from '../lib/ops.js';
import Odometer from '../components/Odometer.js';
import Sheet from '../components/Sheet.js';
import { Avatar } from '../components/ui.js';

export default function ReadingSheet({ subId, y, r, onClose, onNext }) {
  const { D, act } = useData();
  const s = D.subs.find(x => x.id === subId);
  const v0 = D.reads[key(subId, y, r)], pv = prevNew(D, subId, y, r);
  const [o, setO] = useState(v0 ? String(v0.o) : pv != null ? String(pv) : '');
  const [n, setN] = useState(v0 ? String(v0.n) : '');
  const [err, setErr] = useState('');
  const nRef = useRef(null);
  const inv = D.invs.find(i => i.s === subId && i.y == y && i.r == r);
  const locked = roundPaid(D, subId, y, r);
  const c = n !== '' && o !== '' && !isNaN(n) && !isNaN(o) ? +(+n - +o).toFixed(3) : null;
  const est = useMemo(() => { if (c == null || c < 0) return null; const T = D.cfg.trOn && D.cfg.tr && D.cfg.tr.length ? D.cfg.tr : null;
    return (T ? tierAmt(c, T) : c * D.cfg.price) + (+D.cfg.fee || 0); }, [c, D.cfg]);
  if (!s) return null;

  const save = () => {
    if (n === '') { setErr('اكتب القراءة الجديدة.'); nRef.current && nRef.current.focus(); return false; }
    let e = null; act.update(D2 => { e = setReading(D2, subId, y, r, parseFloat(o), parseFloat(n)); if (!e) regInv(D2, subId, y, r); });
    setErr(e || ''); return !e;
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
      {locked && <p className="warn">{PAID_LOCK}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      {!locked && <div className="row"><button type="button" className="btn pri" onClick={save}>{inv ? 'حفظ القراءة وتحديث الفاتورة' : 'حفظ القراءة وإصدار الفاتورة'}</button>
        {onNext && <button type="button" className="btn" onClick={() => { if (save()) onNext(); }}>حفظ والتالي</button>}</div>}
      {inv && <div className="rs-inv">
        <p className={inv.paid ? 'ok' : ''}>فاتورة <bdi dir="ltr">{inv.num}</bdi>: <b><bdi dir="ltr">{n2(tot(inv))}</bdi> درهم</b>{inv.paid ? `، مؤداة ${inv.pw == 'b' ? 'بنكياً' : 'نقداً'} في ${inv.pd}` : '، غير مؤداة'}</p>
        <div className="row">
          {!inv.paid && <><button type="button" className="btn good" onClick={() => doPay('c')}>تأكيد الدفع نقداً</button><button type="button" className="btn" onClick={() => doPay('b')}>تأكيد الدفع بنكياً</button></>}
          <button type="button" className="btn wa" onClick={wa}>واتساب</button>
        </div></div>}
    </Sheet>
  );
}
