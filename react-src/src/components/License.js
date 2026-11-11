// نسخة البيع: شريط المدة التجريبية + نافذة التفعيل + بطاقة الترخيص في الإعدادات
import { useCallback, useEffect, useRef, useState } from 'react';
import { load, save, daysLeft, pcOK, licCode, group, nativePlugin, dayWord, seller } from '../lib/license.js';
import { download } from '../lib/store.js';

/** حالة الترخيص. update = act.update (لحفظ بداية التجربة مع البيانات أيضاً) */
export function useLicense(D, update) {
  const [L, setL] = useState(() => load(D.lic));
  const P = useRef(nativePlugin()).current;
  const [nok, setNok] = useState(false), [ready, setReady] = useState(!P), [open, setOpen] = useState(false), [, tick] = useState(0);
  // أندرويد: رمز الجهاز وحالة التفعيل من Kotlin
  useEffect(() => { if (!P) return;
    P.status().then(r => { if (r && r.id) { L.id = r.id; setNok(!!r.ok); if (r.start && r.start < L.start) L.start = r.start; save(L); setL({ ...L }); }
      return P.trial({ start: L.start }); })
      .then(r => { if (r && r.start && r.start < L.start) { L.start = r.start; save(L); setL({ ...L }); } }).catch(() => {}).then(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // بداية التجربة تُحفظ مع بيانات الجمعية: حذف مفاتيح الترخيص لا يعيد التجربة
  useEffect(() => { const o = D.lic || {};
    if (o.id !== L.id || !o.start || o.start > L.start || (L.code && o.code !== L.code)) update(D2 => { D2.lic = { id: L.id, start: Math.min(o.id === L.id && o.start || L.start, L.start), code: L.code || '' }; });
  }, [L, D.lic, update]);
  useEffect(() => { const t = setInterval(() => { L.seen = Math.max(L.seen || 0, Date.now()); save(L); tick(x => x + 1); }, 6e4); return () => clearInterval(t); }, [L]);
  const ok = P ? nok : pcOK(L), left = daysLeft(L), locked = ready && !ok && left <= 0;
  const activate = useCallback(async raw => {
    const v = group(raw);
    if (P) { const r = await P.activate({ code: v }); setNok(!!r.ok); if (r.ok) { const n = { ...L, code: v }; save(n); setL(n); setOpen(true); return { ok: true }; } return { error: r.sig === false ? 'هذه النسخة من التطبيق معدّلة ولا يمكن تفعيلها. حمّل التطبيق الأصلي من البائع.' : 'كود التفعيل غير صحيح. تأكد من الحروف والأرقام.' }; }
    if (v && v === licCode(L.id)) { const n = { ...L, code: v }; save(n); setL(n); setOpen(true); return { ok: true }; }
    return { error: 'كود التفعيل غير صحيح. تأكد من الحروف والأرقام.' };
  }, [L, P]);
  return { L, ok, left, locked, ready, open: open || locked, setOpen, activate };
}

export function LicenseBar({ lic }) {
  if (lic.ok || !lic.ready) return null;
  const n = lic.left;
  return <div className={'lic-bar' + (n <= 0 ? ' ex' : '')} role="status">
    {n > 0 ? <span>🧪 نسخة تجريبية — متبقي <b>{n}</b> {dayWord(n)}</span> : <span>انتهت المدة التجريبية</span>}
    <button type="button" onClick={() => lic.setOpen(true)}>{n > 0 ? 'تفعيل' : 'تفعيل الآن'}</button></div>;
}

export function LicenseDialog({ lic, D, assoc }) {
  const [code, setCode] = useState(''), [err, setErr] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { if (!lic.locked) { const k = e => { if (e.key === 'Escape') lic.setOpen(false); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); } }, [lic]);
  if (!lic.open) return null;
  const ph = seller('phone'), pr = seller('price'), nm = seller('name'), n = lic.left, id = lic.L.id;
  const go = async e => { e.preventDefault(); setBusy(true); setErr('');
    try { const r = await lic.activate(code); if (r.ok) { setDone(true); setTimeout(() => { setDone(false); lic.setOpen(false); }, 1600); } else setErr(r.error); }
    catch (x) { setErr('تعذّر التفعيل: ' + (x && x.message || x)); } finally { setBusy(false); } };
  const copy = async () => { try { await navigator.clipboard.writeText(id); alert('تم نسخ رمز الجهاز: ' + id); } catch { alert('انسخ الرمز يدوياً: ' + id); } };
  const wa = () => { let x = ph.replace(/\D/g, ''); if (/^0[5-7]\d{8}$/.test(x)) x = '212' + x.slice(1);
    const u = 'https://wa.me/' + x + '?text=' + encodeURIComponent('السلام عليكم، أريد تفعيل برنامج تدبير الماء.\nرمز الجهاز: ' + id + (assoc && assoc !== 'اسم الجمعية' ? '\nالجمعية: ' + assoc : ''));
    const C = window.Capacitor; if (C && C.isNativePlatform && C.isNativePlatform()) location.href = u; else window.open(u, '_blank', 'noopener'); };
  return (
    <div className="dlg lic-dlg" role="dialog" aria-modal="true" aria-labelledby="lic-t" onClick={e => { if (e.target === e.currentTarget && !lic.locked) lic.setOpen(false); }}>
      <div className="dlg-b">
        {lic.ok || done ? <>
          <h3 id="lic-t">✔ البرنامج مفعّل</h3>
          <p className="lic-ok">هذه النسخة مفعّلة بشكل دائم على هذا الجهاز. شكراً لثقتكم.</p>
          <p>رمز الجهاز:</p><div className="lic-id">{id}</div>
          {!done && <div className="row"><button type="button" className="btn" onClick={() => lic.setOpen(false)} autoFocus>إغلاق</button></div>}
        </> : <form onSubmit={go}>
          <h3 id="lic-t">{n > 0 ? 'تفعيل البرنامج' : 'انتهت المدة التجريبية'}</h3>
          <p>{n > 0 ? <>أنت تستعمل النسخة التجريبية (متبقي <b>{n}</b> {dayWord(n)}).</> : 'بياناتك محفوظة ولن تُحذف. فعّل البرنامج لمتابعة العمل.'}{pr && <> التفعيل الدائم بـ <b>{pr}</b>.</>}</p>
          <ol><li>أرسل <b>رمز الجهاز</b>{ph ? <> إلى {nm && <>{nm} على </>}الرقم <bdi dir="ltr"><b>{ph}</b></bdi> (واتساب)</> : ' إلى البائع'}.</li><li>ستتوصل بـ <b>كود التفعيل</b>، أدخله ثم اضغط «تفعيل».</li></ol>
          <p className="lic-l">رمز الجهاز</p><div className="lic-id">{id}</div>
          <input className="lic-in" value={code} onChange={e => { setCode(e.target.value); setErr(''); }} placeholder="XXXX-XXXX-XXXX" autoComplete="off" aria-label="كود التفعيل" autoFocus />
          {err && <p className="err" role="alert">{err}</p>}
          <div className="row"><button type="submit" className="btn pri" disabled={busy || !code.trim()}>✓ تفعيل</button>
            <button type="button" className="btn" onClick={copy}>نسخ رمز الجهاز</button>
            {ph && <button type="button" className="btn" onClick={wa}>واتساب</button>}</div>
          <div className="row">{n > 0 ? <button type="button" className="btn ghost" onClick={() => lic.setOpen(false)}>متابعة التجربة</button>
            : <button type="button" className="btn ghost" onClick={() => download(JSON.stringify(D), 'نسخة-الماء-كاملة-' + new Date().toISOString().slice(0, 10) + '.json')}>⬇ تحميل نسخة احتياطية</button>}</div>
        </form>}
      </div>
    </div>
  );
}

export function LicenseCard({ lic }) {
  return <section className="panel"><h2>الترخيص</h2>
    {lic.ok ? <p className="lic-ok">✔ البرنامج مفعّل</p> : <p>نسخة تجريبية — متبقي <b>{lic.left}</b> {dayWord(lic.left)}</p>}
    <p className="note">رمز الجهاز: <bdi dir="ltr"><b>{lic.L.id}</b></bdi></p>
    <div className="row"><button type="button" className="btn" onClick={() => lic.setOpen(true)}>{lic.ok ? 'عرض' : 'تفعيل'}</button></div></section>;
}
