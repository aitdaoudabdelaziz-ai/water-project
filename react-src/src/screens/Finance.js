import { useMemo, useState } from 'react';
import { nid } from '../lib/ops.js';
import { useData } from '../lib/useData.js';
import { MO, fmt, n2, eff, today } from '../lib/calc.js';
import Sheet from '../components/Sheet.js';
import { Empty } from '../components/ui.js';

const TN = { in: 'مدخول', out: 'مصروف', dep: 'إيداع في البنك', wd: 'سحب من البنك' };
const acc = x => x.t === 'dep' ? (x.lk === 0 ? 'البنك' : 'من الصندوق إلى البنك') : x.t === 'wd' ? (x.lk === 0 ? 'البنك' : 'من البنك إلى الصندوق') : x.w === 'b' ? 'البنك' : 'الصندوق';
const pad = n => String(n).padStart(2, '0');

export default function Finance() {
  const { D, X, act } = useData();
  const now = new Date();
  const years = useMemo(() => [...new Set(X.events.map(e => +String(e.d).slice(0, 4)).filter(Boolean).concat(now.getFullYear()))].sort((a, b) => b - a), [X]);
  const [y, setY] = useState(now.getFullYear()); const [m, setM] = useState('');
  const [k, setK] = useState(''); const [ed, setEd] = useState(null);
  const s = m === '' ? y + '-01-01' : y + '-' + pad(+m + 1) + '-01', e = m === '' ? y + '-12-31' : y + '-' + pad(+m + 1) + '-31';
  const all = useMemo(() => X.events.slice().sort((a, b) => String(a.d).localeCompare(String(b.d))), [X]);
  const open = all.filter(x => x.d < s).reduce((C, x) => { const f = eff(x); return [C[0] + f[0], C[1] + f[1]]; }, [+D.cfg.oc || 0, +D.cfg.ob || 0]);
  const L = all.filter(x => x.d >= s && x.d <= e);
  const close = L.reduce((C, x) => { const f = eff(x); return [C[0] + f[0], C[1] + f[1]]; }, open);
  const tin = L.filter(x => x.t === 'in').reduce((t, x) => t + x.a, 0), tout = L.filter(x => x.t === 'out').reduce((t, x) => t + x.a, 0);
  const shown = L.filter(x => !k || x.t === k).reverse();
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-h"><h2>المالية</h2>{act.can('ed') && <button type="button" className="btn pri" onClick={() => setEd({})}>＋ عملية جديدة</button>}</div>
        <div className="filters">
          <label>السنة<select value={y} onChange={e2 => setY(+e2.target.value)}>{years.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
          <label>الشهر<select value={m} onChange={e2 => setM(e2.target.value)}><option value="">السنة كاملة</option>{MO.map((n, i) => <option key={i} value={i}>{n}</option>)}</select></label>
          <label>النوع<select value={k} onChange={e2 => setK(e2.target.value)}><option value="">الكل</option>{Object.entries(TN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>
        <div className="bal">
          <div><span>الصندوق</span><b><bdi dir="ltr">{fmt(close[0])}</bdi></b><small>في بداية الفترة <bdi dir="ltr">{fmt(open[0])}</bdi></small></div>
          <div><span>البنك</span><b><bdi dir="ltr">{fmt(close[1])}</bdi></b><small>في بداية الفترة <bdi dir="ltr">{fmt(open[1])}</bdi></small></div>
          <div className="tot"><span>المجموع</span><b><bdi dir="ltr">{fmt(close[0] + close[1])}</bdi> د.م</b><small>المداخيل <bdi dir="ltr">{fmt(tin)}</bdi>، المصاريف <bdi dir="ltr">{fmt(tout)}</bdi></small></div>
        </div>
      </section>
      {!shown.length ? <Empty>لا توجد عمليات في هذه الفترة.</Empty> : (
        <ul className="rows">{shown.map((x, i) => (
          <li key={(x.id || 'w') + '-' + i}><button type="button" className="fr" disabled={x.water || !act.can('ed')} onClick={() => setEd(D.fin.find(f => f.id === x.id))}>
            <span className={'fr-t t-' + x.t}>{x.t === 'in' ? '+' : x.t === 'out' ? '−' : '⇄'}</span>
            <span className="fr-i"><b>{x.c}</b><small>{x.d}، {acc(x)}{x.n ? '، ' + x.n : ''}</small></span>
            <span className={'fr-a t-' + x.t}><bdi dir="ltr">{n2(x.a)}</bdi></span>
          </button></li>))}</ul>)}
      {ed && <FinSheet x={ed} onClose={() => setEd(null)} />}
    </div>
  );
}

function FinSheet({ x, onClose }) {
  const { D, act } = useData();
  const [t, setT] = useState(x.t || 'out'); const [w, setW] = useState(x.w || 'c'); const [d, setD] = useState(x.d || today());
  const [c, setC] = useState(x.c || ''); const [a, setA] = useState(x.a != null ? String(x.a) : ''); const [n, setN] = useState(x.n || '');
  const [lk, setLk] = useState(x.lk !== 0); const [err, setErr] = useState('');
  const cats = t === 'in' ? (D.cfg.fs && D.cfg.fs.inCats) || ['اشتراكات جديدة', 'مساهمات', 'دعم / منحة', 'أخرى'] : t === 'out' ? (D.cfg.fs && D.cfg.fs.outCats) || ['كهرباء', 'صيانة', 'أجور', 'قطع الغيار', 'نقل', 'أخرى'] : [];
  const save = () => {
    const amt = parseFloat(String(a).replace(',', '.')), cc = c.trim() || (t === 'dep' ? 'إيداع بنكي' : t === 'wd' ? 'سحب بنكي' : '');
    if (!cc || !(amt > 0)) { setErr('اكتب البيان ومبلغاً صحيحاً.'); return; }
    const y = { t, w: t === 'in' || t === 'out' ? w : 'b', d, c: cc, a: amt, n: n.trim() }; if (t === 'dep' || t === 'wd') y.lk = lk ? 1 : 0;
    act.update(D2 => { if (x.id) { const f = D2.fin.find(z => z.id === x.id); Object.assign(f, y); if (!(t === 'dep' || t === 'wd')) delete f.lk; }
      else { D2.fin.push({ id: nid(D2, 'fid'), ...y }); } });
    onClose(); };
  return (
    <Sheet title={x.id ? 'تعديل عملية' : 'عملية مالية جديدة'} onClose={onClose} labelId="fs-t">
      <div className="seg" role="radiogroup" aria-label="النوع" style={{ marginTop: 12 }}>
        {Object.entries(TN).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={t === v} className={t === v ? 'on' : ''} onClick={() => setT(v)}>{l}</button>)}
      </div>
      <div className="form">
        <label className="field">البيان<input data-autofocus value={c} onChange={e => { setC(e.target.value); setErr(''); }} list="fcats" placeholder={t === 'dep' ? 'إيداع بنكي' : t === 'wd' ? 'سحب بنكي' : 'مثلاً: كهرباء'} />
          <datalist id="fcats">{cats.map(v => <option key={v} value={v} />)}</datalist></label>
        <label className="field">المبلغ (درهم)<input inputMode="decimal" value={a} onChange={e => { setA(e.target.value); setErr(''); }} /></label>
        <label className="field">التاريخ<input type="date" value={d} onChange={e => setD(e.target.value)} /></label>
        {(t === 'in' || t === 'out') ? <label className="field">الحساب<select value={w} onChange={e => setW(e.target.value)}><option value="c">الصندوق (نقداً)</option><option value="b">البنك</option></select></label>
          : <label className="chk"><input type="checkbox" checked={lk} onChange={e => setLk(e.target.checked)} />{t === 'dep' ? 'المال خرج من الصندوق (إيداع نقدي)' : 'المال دخل إلى الصندوق'}</label>}
        <label className="field">ملاحظة<input value={n} onChange={e => setN(e.target.value)} /></label>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row"><button type="button" className="btn pri" onClick={save}>{x.id ? 'حفظ التعديل' : 'إضافة العملية'}</button>
        {x.id && act.can('del') && <button type="button" className="btn ghost" onClick={() => { if (confirm('حذف هذه العملية؟')) { act.update(D2 => { D2.fin = D2.fin.filter(z => z.id !== x.id); }); onClose(); } }}>🗑 حذف</button>}</div>
    </Sheet>
  );
}
