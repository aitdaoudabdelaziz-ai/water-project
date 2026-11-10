import { useRef, useState } from 'react';
import { hs } from '../lib/auth.js';

let bad = 0, lockT = 0;
export default function Login({ D, onLogin, assoc }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const pr = useRef(null);
  const go = async e => { e.preventDefault();
    if (Date.now() < lockT) { setErr('محاولات كثيرة. انتظر 30 ثانية ثم أعد المحاولة.'); return; }
    const x = D.users.find(y => y.u === u.trim().toLowerCase());
    if (x && await hs(p, x.s) === x.h) { bad = 0; onLogin({ id: x.id }); }
    else { if (++bad >= 5) { lockT = Date.now() + 30000; bad = 0; } setErr('رمز الدخول أو كلمة السر غير صحيحة.'); setP(''); pr.current && pr.current.focus(); } };
  return (
    <div className="login">
      <form className="login-b" onSubmit={go}>
        <img src="../icon-192.png" alt="" width="64" height="64" />
        <h2>{assoc}</h2><p className="note">لجنة الماء الصالح للشرب</p>
        <label className="field">رمز الدخول<input value={u} onChange={e => { setU(e.target.value); setErr(''); }} autoComplete="username" autoFocus /></label>
        <label className="field">كلمة السر<input ref={pr} type="password" value={p} onChange={e => { setP(e.target.value); setErr(''); }} autoComplete="current-password" /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button type="submit" className="btn pri wide">دخول</button>
      </form>
    </div>
  );
}
