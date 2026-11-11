// الوصل الحراري — نفس وصل البرنامج الأصلي حرفياً (80 / 58 مم أو مقاس خاص، الشعار، الرمز الشريطي Code39)
// الإعدادات تُحفظ في D.cfg.th بنفس صيغة الأصل.
import { useEffect, useRef } from 'react';
import { useData } from '../lib/useData.js';
import { tot, n2, RN, due, tierLines, tierAmt } from '../lib/calc.js';
import { AS0, CT0, logoOf } from '../lib/brand.js';

const TH_DEF = { fmt: '80', w: 80, pad: 4, fs: 12, logo: 1, bar: 1 };
const fd = d => String(d || '').split('-').reverse().join('/');
const cs = (o, n) => +(n - o).toFixed(3);
const trTxt = (c, T) => tierLines(c, T).map(l => l.q + ' م³ × ' + n2(l.price)).join(' + ');
const TH39 = { 0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw', 5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn',
  N: 'nnnnwnnww', O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn', U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn' };
function Barcode({ text }) {
  const s = ('*' + String(text).toUpperCase().replace(/\//g, '-').replace(/[^0-9A-Z\-. ]/g, '') + '*').split(''); let x = 0; const R = [];
  s.forEach(ch => { [...TH39[ch]].forEach((e, i) => { const w = e === 'w' ? 3 : 1; if (i % 2 === 0) R.push(<rect key={x} x={x} y="0" width={w} height="40" fill="#000" />); x += w; }); x += 1; });
  return <svg className="tk_bc" viewBox={`0 0 ${x} 40`} preserveAspectRatio="none" aria-hidden="true">{R}</svg>;
}
/** نفس بيانات الوصل في الأصل (thInv) */
function ticketData(D, i) {
  const s = Object.assign({}, D.subs.find(x => x.id === i.s), i.ov || {}), c = cs(i.o, i.n), a = i.tr ? tierAmt(c, i.tr) : c * i.price;
  const prev = D.invs.filter(x => x.s == i.s && !x.paid && x.id != i.id && (x.y < i.y || (x.y == i.y && x.r < i.r))).reduce((t, x) => t + tot(x), 0);
  return { title: i.paid ? 'وصل أداء - فاتورة الماء' : 'فاتورة الماء الصالح للشرب',
    info: [['رقم الفاتورة', i.num], ['تاريخ الإصدار', fd(i.date)], ['الفترة', RN[i.r].split(' (')[0] + ' ' + i.y], ['المشترك', s.name || ''], ['رقم العداد', s.meter || '']],
    body: [['القراءة السابقة', i.o + ' م³'], ['القراءة الحالية', i.n + ' م³'], ['الاستهلاك', c + ' م³'], (i.tr ? ['الأشطر', trTxt(c, i.tr)] : ['الثمن', n2(i.price) + ' درهم/م³']), ['مبلغ الاستهلاك', n2(a) + ' درهم']]
      .concat(i.fee > 0 ? [['رسوم الاشتراك', n2(i.fee) + ' درهم']] : []).concat(prev > 0 ? [['متأخرات سابقة', n2(prev) + ' درهم']] : []),
    total: ['المجموع المستحق', n2(tot(i)) + ' درهم'],
    state: i.paid ? '✔ مدفوعة - ' + (i.pw == 'b' ? 'بنكي' : 'نقداً') + (i.pd ? ' - ' + fd(i.pd) : '') : 'غير مدفوعة - الأجل: ' + fd(due(i, D.cfg.due)),
    note: i.note || '', barcode: i.num, foot: ['شكراً لكم على ترشيد استهلاك الماء', 'هذا الوصل لا يغني عن الفاتورة الرسمية'] };
}
const Rows = ({ a }) => a.map(([k, v], n) => <div className="tk_r" key={n}><span>{k}</span><span className="tk_v">{v}</span></div>);

export default function Thermal({ ids, onDone }) {
  const { D, act } = useData();
  const c = Object.assign({}, TH_DEF, D.cfg.th || {});
  const wrap = useRef(null);
  const AS = D.cfg.aname || AS0, CT = D.cfg.acity || CT0, ph = D.cfg.phone || '', LOGO = logoOf(D.cfg);
  const set = patch => act.update(D2 => { D2.cfg.th = Object.assign({}, TH_DEF, D2.cfg.th || {}, patch); });
  const fmt = v => set(v === '80' ? { fmt: '80', w: 80, pad: 4, fs: 12 } : v === '58' ? { fmt: '58', w: 58, pad: 3, fs: 10 } : { fmt: 'custom' });
  const clamp = (v, a, b, d) => Math.min(b, Math.max(a, +v || d));
  useEffect(() => { const k = e => e.key === 'Escape' && onDone(); document.addEventListener('keydown', k);
    const ap = () => { document.body.classList.remove('thp'); const s = document.getElementById('thpg'); if (s) s.remove(); };
    addEventListener('afterprint', ap); return () => { document.removeEventListener('keydown', k); removeEventListener('afterprint', ap); ap(); }; }, [onDone]);
  const print = () => {
    const H = Math.ceil(Math.max(...[...wrap.current.querySelectorAll('.tkt')].map(e => e.getBoundingClientRect().height)) * 25.4 / 96) + 1;
    const st = document.createElement('style'); st.id = 'thpg'; st.textContent = `@page{size:${c.w}mm ${H}mm;margin:0}`; document.head.appendChild(st);
    document.body.classList.add('thp');
    const C = window.Capacitor, P = C && C.Plugins && C.Plugins.WaterPrint;
    if (C && C.isNativePlatform && C.isNativePlatform() && P) P.print({ name: 'AlFath-Ticket' }).catch(() => window.print()); else window.print();
  };
  const L = ids.map(id => D.invs.find(x => x.id === id)).filter(Boolean).map(i => ticketData(D, i));
  return (
    <div className="tv" role="dialog" aria-modal="true" aria-label="الوصل الحراري">
      <div className="tkb"><button type="button" className="tkg" onClick={print} autoFocus>طباعة</button><button type="button" className="tkx" onClick={onDone}>إغلاق</button></div>
      <div className="tkwp">
        <aside className="tkp"><h3>إعدادات الورق</h3>
          <label htmlFor="th_f">الصيغة</label><select id="th_f" value={c.fmt} onChange={e => fmt(e.target.value)}><option value="80">80 مم (قياسي)</option><option value="58">58 مم (محمول)</option><option value="custom">مقاس خاص</option></select>
          <div className="t2"><div><label htmlFor="th_w">العرض (مم)</label><input id="th_w" type="number" min="40" max="120" step="1" value={c.w} onChange={e => set({ fmt: 'custom', w: clamp(e.target.value, 40, 120, 80) })} /></div>
            <div><label htmlFor="th_p">الهوامش (مم)</label><input id="th_p" type="number" min="0" max="10" step=".5" value={c.pad} onChange={e => set({ fmt: 'custom', pad: clamp(e.target.value, 0, 10, 0) })} /></div></div>
          <label htmlFor="th_s">حجم الخط (px)</label><input id="th_s" type="number" min="8" max="18" step=".5" value={c.fs} onChange={e => set({ fmt: 'custom', fs: clamp(e.target.value, 8, 18, 12) })} />
          <label className="ck"><input type="checkbox" checked={!!c.logo} onChange={e => set({ logo: e.target.checked ? 1 : 0 })} /> إظهار الشعار</label>
          <label className="ck"><input type="checkbox" checked={!!c.bar} onChange={e => set({ bar: e.target.checked ? 1 : 0 })} /> إظهار الرمز الشريطي</label>
          <small>في نافذة الطباعة: عطّل «الرؤوس والتذييلات»، النسبة 100%، الهوامش «بدون»، واختر الطابعة الحرارية.</small></aside>
        <div className="tkr"><div ref={wrap} style={{ '--tw': c.w + 'mm', '--tp': c.pad + 'mm', '--tf': c.fs + 'px' }}>
          {L.map((d, n) => (
            <div className="tkt" key={n}>{!!c.logo && <img className="tk_lg" src={LOGO} alt="" />}
              <div className="tk_c"><div className="tk_org">{AS}</div>{CT && <div className="tk_s">{CT}</div>}<div className="tk_s">الماء الصالح للشرب</div>{ph && <div className="tk_s">الهاتف: {ph}</div>}</div>
              <hr className="tk_sep" /><div className="tk_c tk_t">{d.title}</div><hr className="tk_sep" /><Rows a={d.info} /><hr className="tk_sep" /><Rows a={d.body} /><hr className="tk_sep s" />
              <div className="tk_r tk_tot"><span>{d.total[0]}</span><span className="tk_v">{d.total[1]}</span></div>
              <div className="tk_st">{d.state}</div>{d.note && <div className="tk_n" style={{ whiteSpace: 'pre-line' }}>{d.note}</div>}
              <hr className="tk_sep" /><div className="tk_c">{d.foot.map((l, k) => <div key={k} className={k ? 'tk_s' : 'tk_t'}>{l}</div>)}
                {!!c.bar && d.barcode && <><Barcode text={d.barcode} /><div className="tk_s">{d.barcode}</div></>}</div>
            </div>))}
        </div></div>
      </div>
    </div>
  );
}
