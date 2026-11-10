import { useState } from 'react';
import { useData } from '../lib/useData.js';
import { hs, rnd, PL, DEF } from '../lib/auth.js';
import { n2 } from '../lib/calc.js';
import Sheet from '../components/Sheet.js';

/** حقل يحفظ عند الخروج منه (لا يعيد الحفظ مع كل حرف) */
function Field({ label, value, onSave, type = 'text', inputMode, hint }) {
  const [v, setV] = useState(value ?? '');
  return <label className="field">{label}<input type={type} inputMode={inputMode} value={v} onChange={e => setV(e.target.value)} onBlur={() => { if (String(v) !== String(value ?? '')) onSave(v); }} />{hint && <small>{hint}</small>}</label>;
}
const num = v => { const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? 0 : x; };

export default function Settings() {
  const { D, act } = useData();
  const set = (k, v) => act.update(D2 => { D2.cfg[k] = v; });
  return (
    <div className="stack">
      <section className="panel"><h2>الجمعية</h2>
        <div className="form two">
          <Field label="اسم الجمعية" value={D.cfg.aname || 'جمعية الفتح للتنمية والتعاون'} onSave={v => set('aname', v.trim())} />
          <Field label="المكان (يظهر على الفاتورة)" value={D.cfg.acity || 'أقايغان - إقليم طاطا'} onSave={v => set('acity', v.trim())} />
          <Field label="سطر التعريف (يظهر على الفاتورة)" value={D.cfg.alc || 'جمعية تنموية - مرخصة لتوزيع الماء الصالح للشرب'} onSave={v => set('alc', v.trim())} />
          <Field label="الهاتف" value={D.cfg.phone} inputMode="tel" onSave={v => set('phone', v.trim())} hint="يظهر في رسائل واتساب والفواتير" />
          <Field label="البريد الإلكتروني" value={D.cfg.email} type="email" onSave={v => set('email', v.trim())} />
          <Field label="البنك" value={D.cfg.bank} onSave={v => set('bank', v.trim())} />
          <Field label="رقم الحساب البنكي (RIB)" value={D.cfg.rib} inputMode="numeric" onSave={v => set('rib', v.trim())} />
        </div>
      </section>
      <section className="panel"><h2>الثمن والأداء</h2>
        <p className="note">التغيير يطبَّق على الفواتير الجديدة فقط. الفواتير السابقة تحتفظ بثمنها.</p>
        <div className="form two">
          <Field label="ثمن المتر المكعب (درهم)" value={D.cfg.price} inputMode="decimal" onSave={v => set('price', num(v))} />
          <Field label="الواجب الثابت لكل فاتورة (درهم)" value={D.cfg.fee} inputMode="decimal" onSave={v => set('fee', num(v))} />
          <Field label="أجل الأداء (أيام بعد الإصدار)" value={D.cfg.due} inputMode="numeric" onSave={v => set('due', Math.max(0, Math.round(num(v))))} />
        </div>
        <Tiers />
      </section>
      <section className="panel"><h2>الأرصدة الافتتاحية</h2>
        <div className="form two">
          <Field label="الصندوق عند البداية (درهم)" value={D.cfg.oc} inputMode="decimal" onSave={v => set('oc', num(v))} />
          <Field label="البنك عند البداية (درهم)" value={D.cfg.ob} inputMode="decimal" onSave={v => set('ob', num(v))} />
        </div>
      </section>
      <Users />
    </div>
  );
}

function Tiers() {
  const { D, act } = useData();
  const T = D.cfg.tr && D.cfg.tr.length ? D.cfg.tr : null, on = !!(D.cfg.trOn && T);
  const upd = fn => act.update(D2 => { D2.cfg.tr = D2.cfg.tr && D2.cfg.tr.length ? D2.cfg.tr : [{ to: 10, price: +D2.cfg.price || 0 }, { to: null, price: +D2.cfg.price || 0 }]; fn(D2.cfg.tr, D2.cfg); });
  return (
    <div className="tiers">
      <label className="chk"><input type="checkbox" checked={on} onChange={e => upd((t, c) => { c.trOn = e.target.checked; })} />ثمن بالأشطر (كلما زاد الاستهلاك تغيّر الثمن)</label>
      {on && <>
        <table className="tbl"><thead><tr><th>الشطر</th><th>إلى (م³)</th><th>الثمن (درهم/م³)</th><th></th></tr></thead><tbody>
          {T.map((t, i) => <tr key={i}><td>{i + 1}</td>
            <td>{t.to == null ? 'فما فوق' : <input className="mini" inputMode="decimal" defaultValue={t.to} aria-label={'حدّ الشطر ' + (i + 1)} onBlur={e => upd(tr => { tr[i].to = num(e.target.value); })} />}</td>
            <td><input className="mini" inputMode="decimal" defaultValue={t.price} aria-label={'ثمن الشطر ' + (i + 1)} onBlur={e => upd(tr => { tr[i].price = num(e.target.value); })} /></td>
            <td>{T.length > 1 && <button type="button" className="x" aria-label={'حذف الشطر ' + (i + 1)} onClick={() => upd(tr => { tr.splice(i, 1); tr[tr.length - 1].to = null; })}>✕</button>}</td></tr>)}
        </tbody></table>
        <button type="button" className="btn" onClick={() => upd(tr => { const l = tr[tr.length - 1], pv = tr.length > 1 ? tr[tr.length - 2].to : 0; l.to = (pv || 0) + 10; tr.push({ to: null, price: l.price }); })}>＋ إضافة شطر</button>
        <p className="note">مثال: 28 م³ تكلّف <bdi dir="ltr">{n2(tierEx(T, 28))}</bdi> درهم.</p>
      </>}
    </div>
  );
}
function tierEx(T, c) { let left = c, from = 0, a = 0; for (const t of T) { if (left <= 0) break; const cap = t.to == null ? Infinity : Math.max(0, t.to - from), q = Math.min(left, cap); a += q * (+t.price || 0); left -= q; if (t.to != null) from = Math.max(from, t.to); } return a; }

function Users() {
  const { D, act } = useData();
  const [add, setAdd] = useState(false); const [code, setCode] = useState(null); const [pwFor, setPwFor] = useState(null);
  const me = act.user;
  return (
    <section className="panel"><div className="panel-h"><h2>المستخدمون</h2><button type="button" className="btn pri" onClick={() => setAdd(true)}>＋ مستخدم</button></div>
      {!D.users.length && <p className="note">لا يوجد مستخدمون: البرنامج مفتوح لكل من يحمله. أضف أول مستخدم ليصبح المسؤول، وستُطلب كلمة السر عند الدخول.</p>}
      {D.users.length > 0 && <ul className="rows">{D.users.map(u => (
        <li key={u.id} className="ur"><span className="rr-n"><b>{u.u}{me && me.id === u.id ? ' (أنت)' : ''}</b><small>{u.r === 'a' ? 'مسؤول: كل الصلاحيات' : (u.p || []).map(k => (PL.find(p => p[0] === k) || [k, k])[1]).join('، ')}</small></span>
          <span className="ur-b"><button type="button" className="btn" onClick={() => setPwFor(u.id)}>كلمة السر</button>
            {!(me && me.id === u.id) && <button type="button" className="btn ghost" onClick={() => { if (confirm('حذف المستخدم ' + u.u + '؟')) act.update(D2 => { D2.users = D2.users.filter(x => x.id !== u.id); }); }}>حذف</button>}</span></li>))}</ul>}
      {add && <AddUser first={!D.users.length} onClose={() => setAdd(false)} onCode={setCode} />}
      {pwFor != null && <PwSheet id={pwFor} onClose={() => setPwFor(null)} />}
      {code && <Sheet title="رمز الاسترجاع" onClose={() => setCode(null)} labelId="rc-t">
        <p>اكتب هذا الرمز واحفظه في مكان آمن. يُستعمل إذا نسيت كلمة السر، ولن يظهر مرة أخرى.</p>
        <p className="code" dir="ltr">{code}</p><div className="row"><button type="button" className="btn pri" data-autofocus onClick={() => setCode(null)}>حفظتُه</button></div></Sheet>}
    </section>
  );
}
function AddUser({ first, onClose, onCode }) {
  const { D, act } = useData();
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [r, setR] = useState(first ? 'a' : 'u'); const [pm, setPm] = useState(DEF); const [err, setErr] = useState('');
  const save = async () => {
    const un = u.trim().toLowerCase();
    if (!un || p.length < 4) return setErr('اكتب رمز الدخول وكلمة سر من 4 أحرف على الأقل.');
    if (D.users.some(x => x.u === un)) return setErr('رمز الدخول مستعمل.');
    if (r === 'u' && !pm.some(k => k[0] === 'v')) return setErr('اختر الاطلاع على قسم واحد على الأقل.');
    const s = rnd(), h = await hs(p, s); let rc = null, rch = null; if (first) { rc = rnd(); rch = await hs(rc, 'rc'); }
    let id; act.update(D2 => { D2.uid = (+D2.uid || 0) + 1; id = D2.uid; D2.users.push({ id, u: un, s, h, r: first ? 'a' : r, p: first || r === 'a' ? null : pm }); if (rch) D2.rc = rch; });
    if (first) act.login({ id });
    onClose(); if (rc) onCode(rc);
  };
  return (
    <Sheet title={first ? 'أول مستخدم (المسؤول)' : 'مستخدم جديد'} onClose={onClose} labelId="au-t">
      <div className="form">
        <label className="field">رمز الدخول<input data-autofocus value={u} onChange={e => { setU(e.target.value); setErr(''); }} autoComplete="off" /></label>
        <label className="field">كلمة السر<input type="password" value={p} onChange={e => { setP(e.target.value); setErr(''); }} autoComplete="new-password" /></label>
        {!first && <label className="field">الدور<select value={r} onChange={e => setR(e.target.value)}><option value="u">مستخدم بصلاحيات محدّدة</option><option value="a">مسؤول</option></select></label>}
        {!first && r === 'u' && <fieldset className="perms"><legend>الصلاحيات</legend>{PL.map(([k, l]) =>
          <label key={k} className="chk"><input type="checkbox" checked={pm.includes(k)} onChange={e => setPm(e.target.checked ? [...pm, k] : pm.filter(x => x !== k))} />{l}</label>)}</fieldset>}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row"><button type="button" className="btn pri" onClick={save}>إضافة المستخدم</button></div>
    </Sheet>
  );
}
function PwSheet({ id, onClose }) {
  const { D, act } = useData(); const u = D.users.find(x => x.id === id);
  const [p, setP] = useState(''); const [p2, setP2] = useState(''); const [err, setErr] = useState('');
  return (
    <Sheet title={'كلمة سر ' + (u ? u.u : '')} onClose={onClose} labelId="pw-t">
      <div className="form"><label className="field">كلمة السر الجديدة<input data-autofocus type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="new-password" /></label>
        <label className="field">أعد كتابتها<input type="password" value={p2} onChange={e => setP2(e.target.value)} autoComplete="new-password" /></label></div>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row"><button type="button" className="btn pri" onClick={async () => {
        if (p.length < 4) return setErr('4 أحرف على الأقل.'); if (p !== p2) return setErr('الكلمتان غير متطابقتين.');
        const s = rnd(), h = await hs(p, s); act.update(D2 => { const x = D2.users.find(y => y.id === id); x.s = s; x.h = h; }); onClose(); }}>حفظ كلمة السر</button></div>
    </Sheet>
  );
}
