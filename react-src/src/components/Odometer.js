// عدّاد الماء: أرقام على بكرات سوداء، والخانة العشرية حمراء — مثل العدّاد الحقيقي
const DIG = 5;
export default function Odometer({ value, label }) {
  const v = value === '' || value == null || isNaN(value) ? null : Math.max(0, +value);
  const int = v == null ? '' : String(Math.floor(v)).padStart(DIG, '0').slice(-7);
  const dec = v == null ? null : Math.round((v % 1) * 10) % 10;
  const digits = v == null ? Array(DIG).fill(null) : int.split('').map(Number);
  return (
    <div className="odo" role="img" aria-label={label + ': ' + (v == null ? 'فارغ' : v)}>
      <div className="odo-w">
        {digits.map((d, i) => <Wheel key={i + '-' + digits.length} d={d} />)}
        <Wheel d={dec} red />
      </div>
      <span className="odo-u">م³</span>
    </div>
  );
}
function Wheel({ d, red }) {
  return (
    <span className={'wh' + (red ? ' red' : '')}>
      <span className="wh-s" style={{ transform: `translateY(${-(d == null ? 10 : d) * 100 / 11}%)` }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '–'].map((n, i) => <span key={i}>{n}</span>)}
      </span>
    </span>
  );
}
