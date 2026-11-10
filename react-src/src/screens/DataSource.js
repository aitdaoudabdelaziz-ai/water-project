import { useRef, useState } from 'react';
import { demoData, deviceData, normalize, decryptBackup, encryptBackup, download, ENC_V } from '../lib/store.js';
import { useData } from '../lib/useData.js';
import { PasswordDialog } from '../components/ui.js';

export default function DataSource({ current, onPick }) {
  const { D } = useData();
  const [pw, setPw] = useState(''); const [xmsg, setXmsg] = useState('');
  const file = useRef(null); const [enc, setEnc] = useState(null); const [err, setErr] = useState('');
  const dev = deviceData();
  const read = f => { const r = new FileReader();
    r.onload = () => { try { const x = JSON.parse(r.result); if (x && x.enc === ENC_V) { setErr(''); setEnc(x); return; } delete x.__files; onPick(normalize(x), 'ملف: ' + f.name); }
      catch { alert('ملف غير صالح'); } };
    r.readAsText(f); };
  return (
    <div className="stack">
      <section className="panel">
        <h2>مصدر البيانات</h2>
        <p>نسخة React تعمل على نسختها الخاصة من البيانات. ما تغيّره هنا لا يصل إلى برنامجك الحالي.</p>
        <p className="note">المصدر الحالي: <b>{current || '—'}</b></p>
        <div className="opts">
          <button type="button" className="opt" onClick={() => onPick(demoData(), 'بيانات تجريبية')}><b>🧪 بيانات تجريبية</b><small>40 مشتركاً وهمياً لتجربة كل الشاشات</small></button>
          <button type="button" className="opt" onClick={() => file.current.click()}><b>📂 فتح نسخة احتياطية</b><small>ملف ‎.json‎ من برنامج الماء، عادي أو مشفّر</small></button>
          <button type="button" className="opt" disabled={!dev} onClick={() => dev && onPick(JSON.parse(JSON.stringify(dev.data)), 'بيانات هذا الجهاز')}>
            <b>📱 بيانات البرنامج على هذا الجهاز</b><small>{dev ? `${dev.data.subs.length} مشترك، تُنسخ إلى React` : 'لا توجد بيانات للبرنامج الأصلي في هذا المتصفح'}</small></button>
        </div>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) read(f); }} />
      </section>
      <section className="panel">
        <h2>حفظ نسخة من بيانات React</h2>
        <p className="note">تُفتح بالبرنامج الحالي من الإعدادات، استرجاع نسخة. كلمة السر اختيارية: بدونها يُحفظ الملف غير مشفّر.</p>
        <label className="field">كلمة السر (اختيارية، 6 أحرف على الأقل)<input type="password" value={pw} onChange={e => { setPw(e.target.value); setXmsg(''); }} autoComplete="new-password" /></label>
        <button type="button" className="btn pri" onClick={async () => {
          if (pw && pw.length < 6) { setXmsg('كلمة السر قصيرة: 6 أحرف على الأقل.'); return; }
          let txt = JSON.stringify(D); if (pw) txt = await encryptBackup(txt, pw);
          download(txt, 'نسخة-الماء-react-' + new Date().toISOString().slice(0, 10) + (pw ? '-مشفرة' : '') + '.json');
          setXmsg(pw ? 'حُفظت النسخة مشفّرة. احتفظ بكلمة السر.' : 'حُفظت النسخة.'); }}>حفظ النسخة</button>
        {xmsg && <p className="note" role="status">{xmsg}</p>}
      </section>
      {enc && <PasswordDialog error={err} onCancel={() => setEnc(null)} onSubmit={async pw => {
        try { const x = await decryptBackup(enc, pw); delete x.__files; setEnc(null); onPick(normalize(x), 'نسخة مشفّرة'); }
        catch { setErr('كلمة السر غير صحيحة. حاول مرة أخرى.'); } }} />}
    </div>
  );
}
