import { RN } from '../lib/calc.js';
/** اختيار السنة والجولة: أربعة أرباع السنة جنباً إلى جنب */
export default function RoundPicker({ y, r, onChange, years }) {
  return (
    <div className="rp">
      <label className="rp-y"><span className="sr">السنة</span>
        <select value={y} onChange={e => onChange(+e.target.value, r)} aria-label="السنة">{years.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <div className="rp-q" role="radiogroup" aria-label="الجولة">
        {RN.map((n, i) => <button key={i} type="button" role="radio" aria-checked={r === i} className={r === i ? 'on' : ''} onClick={() => onChange(y, i)} title={n}>
          <b>{i + 1}</b><small>{n.slice(n.indexOf('(') + 1, -1)}</small></button>)}
      </div>
    </div>
  );
}
