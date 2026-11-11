// الطباعة بنفس نموذج فاتورة البرنامج الأصلي حرفياً (صفحة 210×148 مم، نفس الأقسام والألوان والنصوص)
import { useEffect, useState } from 'react';
import { tot, n2, RN, due, tierLines, tierAmt } from '../lib/calc.js';

export { AS0, CT0, LC0 } from '../lib/brand.js';
import { AS0, CT0, LC0, logoOf } from '../lib/brand.js';
const FD = ['01/01', '01/04', '01/07', '01/10'], LD = ['31/03', '30/06', '30/09', '31/12'];
const fd = d => String(d || '').split('-').reverse().join('/');
const cs = (o, n) => +(n - o).toFixed(3);
const trTxt = (c, T) => tierLines(c, T).map(l => l.q + ' م³ × ' + n2(l.price)).join(' + ');

export function doPrint(name) {
  const C = window.Capacitor, P = C && C.Plugins && C.Plugins.WaterPrint;
  if (C && C.isNativePlatform && C.isNativePlatform() && P) { P.print({ name: name || 'AlFath' }).catch(() => window.print()); return; }
  window.print();
}

/** معاينة على الشاشة (كما في البرنامج الأصلي) ثم الطباعة */
export default function PrintArea({ D, ids, onDone, onThermal }) {
  const [z, setZ] = useState(() => Math.min(1, (innerWidth - 16) / 794));
  useEffect(() => { const r = () => setZ(Math.min(1, (innerWidth - 16) / 794)); addEventListener('resize', r); return () => removeEventListener('resize', r); }, []);
  useEffect(() => { const k = e => e.key === 'Escape' && onDone(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onDone]);
  const C = D.cfg, AS = C.aname || AS0, CT = C.acity || CT0, LC = C.alc || LC0, LOGO = logoOf(C);
  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label="معاينة الطباعة" style={{ '--z': z }}>
      <div className="pv-bar"><button type="button" className="btn pri" onClick={() => doPrint('AlFath-Water')} autoFocus>🖨 طباعة</button>
        {onThermal && <button type="button" className="btn" onClick={onThermal}>🧾 وصل حراري</button>}
        <span>{ids.length > 1 ? ids.length + ' فواتير' : 'فاتورة واحدة'}</span><button type="button" className="btn" onClick={onDone}>إغلاق</button></div>
      <div className="pp">
        {ids.map(id => { const i = D.invs.find(x => x.id === id); if (!i) return null;
          const s = Object.assign({}, D.subs.find(x => x.id === i.s), i.ov || {}), c = cs(i.o, i.n), a = i.tr ? tierAmt(c, i.tr) : c * i.price;
          return (
            <div className="pg" key={id}>
              <div className="hd"><div><div className="t1">فاتورة الماء الصالح للشرب</div><div className="t2">فاتورة رسمية</div></div>
                <div className="md"><div className="as">{AS}</div><div className="ct">{CT}</div><div className="lc">{LC}</div></div><img src={LOGO} alt="" /></div>
              <div className="pe">فاتورة الاستهلاك - {RN[i.r]} {i.y}</div>
              <div className="row">
                <div className="bx"><h4>بيانات المشترك:</h4><div><b>اسم المشترك:</b> {s.name}</div><div><b>رقم الاشتراك:</b> {s.meter}</div><div><b>العنوان:</b> {s.addr}</div><div><b>الهاتف:</b> {s.phone}</div></div>
                <div className="bx"><h4>بيانات الفاتورة:</h4><div><b>رقم الفاتورة:</b> {i.num}</div><div><b>تاريخ الإصدار:</b> {fd(i.date)}</div><div><b>فترة الفوترة:</b> من {FD[i.r]}/{i.y} إلى {LD[i.r]}/{i.y}</div></div>
              </div>
              <div><div className="br">جدول تفاصيل الاستهلاك</div>
                <table><tbody><tr><th>اسم المشترك</th><th>القراءة السابقة (م³)</th><th>القراءة الحالية (م³)</th><th>الاستهلاك (م³)</th><th>الثمن (درهم/م³)</th><th>المبلغ (درهم)</th></tr>
                  <tr><td>{s.name}</td><td>{i.o}</td><td>{i.n}</td><td>{c}</td><td>{i.tr ? 'بالأشطر' : n2(i.price)}</td><td>{n2(a)}</td></tr></tbody></table></div>
              <div className="tr"><div className="tt"><div>مبلغ الاستهلاك: {n2(a)} درهم</div>{i.fee > 0 && <div>رسوم الاشتراك: {n2(i.fee)} درهم</div>}<div className="gr">المجموع المستحق: {n2(tot(i))} درهم</div></div>
                {i.paid ? <div className="ps">✔ مدفوعة</div> : null}</div>
              <div className="nt"><h5>ملاحظات:</h5><ul><li>يُرجى تسديد المبلغ قبل {fd(due(i, C.due))} لتفادي توقيف التزويد بالماء.</li><li>الاستهلاك تم احتسابه بناءً على الفرق بين القراءة الحالية والسابقة.</li>
                {i.tr && <li>تفصيل الأشطر: {trTxt(c, i.tr)}</li>}{i.note && <li style={{ whiteSpace: 'pre-line' }}>{i.note}</li>}</ul></div>
              <div className="ft">{AS} - {CT} | الهاتف: {C.phone} | البريد الإلكتروني: {C.email}</div>
              <div className="ty">هذه فاتورة رسمية مُحرَّرة من {AS} - شكراً لكم على ترشيد استهلاك الماء</div>
            </div>); })}
      </div>
    </div>
  );
}
