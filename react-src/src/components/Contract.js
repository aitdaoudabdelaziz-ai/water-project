// التزام الاشتراك (العقد): نفس نموذج البرنامج الأصلي، صفحة A4
import { useEffect, useState } from 'react';
import { AS0, CT0, LC0, logoOf } from '../lib/brand.js';
import { stampSrc, CL } from '../lib/stamp.js';
import { doPrint } from './Print.js';
const fd = d => String(d || '').split('-').reverse().join('/');
const BLANK = { id: 'blank', name: '', meter: '', cin: '', phone: '', addr: '', ct: 0 };

function Page({ s, C }) {
  const AS = C.aname || AS0, CT = C.acity || CT0, LC = C.alc || LC0, sg = !!s.ct;
  const v = x => x || '……………………………', dt = sg && s.cd ? fd(s.cd) : '.... / .... / ........';
  const place = (CT || '').split(' - ')[0].trim() || '……………';
  const cl = (C.clauses || CL).split('\n').filter(x => x.trim());
  return (
    <div className="ctp">
      <div className="hd"><div><div className="t1">التزام اشتراك</div><div className="t2">الماء الصالح للشرب</div></div>
        <div className="md"><div className="as">{AS}</div><div className="ct">{CT}</div><div className="lc">{LC}</div></div><img src={logoOf(C)} alt="" /></div>
      <h1 className="cth">التزام باحترام شروط الاشتراك في خدمة الماء الصالح للشرب</h1>
      <div className={'cst ' + (sg ? 'y' : 'n')}>{sg ? '✔ العقد موقّع - بتاريخ ' + dt : '✘ العقد غير موقّع'}</div>
      <p>أنا الموقّع(ة) أسفله:</p>
      <table className="ctt"><tbody>
        <tr><td>الاسم الكامل</td><td>{v(s.name)}</td></tr><tr><td>رقم البطاقة الوطنية</td><td>{v(s.cin)}</td></tr>
        <tr><td>رقم العداد</td><td>{v(s.meter)}</td></tr><tr><td>الهاتف</td><td>{v(s.phone)}</td></tr><tr><td>العنوان</td><td>{v(s.addr)}</td></tr></tbody></table>
      <p>بصفتي مشتركاً(ة) في خدمة توزيع الماء الصالح للشرب التي تسيّرها {AS}، أصرّح وألتزم بما يلي:</p>
      <ol>{cl.map((x, i) => <li key={i}>{x}</li>)}</ol>
      <p>حُرّر ب{place} في: {dt}</p>
      <div className="row"><div className="sgb"><h5>إمضاء المشترك</h5><small>(قرأت وصادقت)</small>{sg && <div className="ps">✔ موقّع</div>}</div>
        <div className="sgb"><h5>ختم وإمضاء الجمعية</h5>{C.stampOn !== false && <img className="stp" src={stampSrc(C, AS)} alt="" />}</div></div>
      <div className="ft">{AS} - {CT} | الهاتف: {C.phone || ''} | البريد الإلكتروني: {C.email || ''}</div>
    </div>
  );
}

/** ids: لائحة معرّفات المشتركين، أو 'blank' لعقد فارغ */
export default function ContractArea({ D, ids, onDone }) {
  const [z, setZ] = useState(() => Math.min(1, (innerWidth - 16) / 794));
  useEffect(() => { const r = () => setZ(Math.min(1, (innerWidth - 16) / 794)); addEventListener('resize', r); return () => removeEventListener('resize', r); }, []);
  useEffect(() => { const k = e => e.key === 'Escape' && onDone(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onDone]);
  const L = ids === 'blank' ? [BLANK] : ids.map(i => D.subs.find(x => x.id === i)).filter(Boolean);
  return (
    <div className="pv ctv" role="dialog" aria-modal="true" aria-label="معاينة العقد" style={{ '--z': z }}>
      <div className="pv-bar"><button type="button" className="btn pri" onClick={() => doPrint('AlFath-Contract')} autoFocus>🖨 طباعة</button>
        <span>{ids === 'blank' ? 'عقد فارغ' : L.length > 1 ? L.length + ' عقود' : 'عقد واحد'}</span><button type="button" className="btn" onClick={onDone}>إغلاق</button></div>
      <div className="pp">{L.map(s => <Page key={s.id} s={s} C={D.cfg} />)}</div>
    </div>
  );
}
