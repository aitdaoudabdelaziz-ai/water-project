import { useRef, useState } from 'react';
import { demoData, deviceData, normalize, decryptBackup, ENC_V } from '../lib/store.js';
import { PasswordDialog } from '../components/ui.js';

export default function DataSource({ current, onPick }) {
  const file = useRef(null); const [enc, setEnc] = useState(null); const [err, setErr] = useState('');
  const dev = deviceData();
  const read = f => { const r = new FileReader();
    r.onload = () => { try { const x = JSON.parse(r.result); if (x && x.enc === ENC_V) { setErr(''); setEnc(x); return; } delete x.__files; onPick(normalize(x), 'ملف: ' + f.name); }
      catch { alert('ملف غير صالح'); } };
    r.readAsText(f); };
  return (
    <div className="stack">
      <section className="card">
        <h2>مصدر البيانات</h2>
        <p>هذه <b>نسخة React التجريبية (المرحلة 1)</b>: للعرض فقط. لا تكتب شيئاً في بيانات برنامجك الأصلي.</p>
        <p className="note">المصدر الحالي: <b>{current || '—'}</b></p>
        <div className="opts">
          <button type="button" className="opt" onClick={() => onPick(demoData(), 'بيانات تجريبية')}><b>🧪 بيانات تجريبية</b><small>40 مشتركاً وهمياً لتجربة كل الشاشات</small></button>
          <button type="button" className="opt" onClick={() => file.current.click()}><b>📂 فتح نسخة احتياطية</b><small>ملف ‎.json‎ من برنامج الماء (عادي أو مشفّر بكلمة سر)</small></button>
          <button type="button" className="opt" disabled={!dev} onClick={() => dev && onPick(JSON.parse(JSON.stringify(dev.data)), 'بيانات هذا الجهاز')}>
            <b>📱 بيانات البرنامج على هذا الجهاز</b><small>{dev ? `${dev.data.subs.length} مشترك — نسخة للقراءة فقط` : 'لا توجد بيانات للبرنامج الأصلي في هذا المتصفح'}</small></button>
        </div>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) read(f); }} />
      </section>
      {enc && <PasswordDialog error={err} onCancel={() => setEnc(null)} onSubmit={async pw => {
        try { const x = await decryptBackup(enc, pw); delete x.__files; setEnc(null); onPick(normalize(x), 'نسخة مشفّرة'); }
        catch { setErr('كلمة السر غير صحيحة. حاول مرة أخرى.'); } }} />}
    </div>
  );
}
