// نفس حسابات البرنامج الأصلي حرفياً (water_app.html) حتى تتطابق الأرقام
export const RN = ['الجولة 1 (يناير - مارس)', 'الجولة 2 (أبريل - يونيو)', 'الجولة 3 (يوليوز - شتنبر)', 'الجولة 4 (أكتوبر - دجنبر)'];
export const MO = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
export const roundName = r => RN[r].split(' (')[0];
export const n2 = x => (+x).toFixed(2);
export const key = (i, y, r) => i + '|' + y + '|' + r;
export const fmt = v => String(Math.abs(Math.round(+v || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function tierLines(c, T) {
  let left = Math.max(0, c), from = 0; const o = [];
  for (const t of T) {
    if (left <= 0) break;
    const cap = t.to == null ? Infinity : Math.max(0, t.to - from), q = +Math.min(left, cap).toFixed(3);
    if (q > 0) o.push({ q, price: +t.price || 0, amt: q * (+t.price || 0) });
    left -= q; if (t.to != null) from = Math.max(from, t.to);
  }
  return o;
}
export const tierAmt = (c, T) => +tierLines(c, T).reduce((a, l) => a + l.amt, 0).toFixed(2);
export const tot = i => (i.tr ? tierAmt(i.n - i.o, i.tr) : (i.n - i.o) * i.price) + i.fee;
export function due(i, days) { const d = new Date(i.date); d.setDate(d.getDate() + (+days)); return d.toISOString().slice(0, 10); }
export const prevNew = (D, i, y, r) => { const v = D.reads[r ? key(i, y, r - 1) : key(i, y - 1, 3)]; return v ? v.n : null; };

export function evs(D, byId) {
  return D.fin.map(x => ({ id: x.id, d: x.d, t: x.t, w: x.w || 'c', a: x.a, c: x.c, n: x.n, lk: x.lk }))
    .concat(D.invs.filter(i => i.paid).map(i => ({ d: i.pd || i.date, t: 'in', w: i.pw || 'c', a: tot(i), c: 'مياه الشرب', n: i.num + ' - ' + ((byId.get(i.s) || {}).name || ''), water: 1 })));
}
export const eff = e => e.t == 'in' ? (e.w == 'b' ? [0, e.a] : [e.a, 0]) : e.t == 'out' ? (e.w == 'b' ? [0, -e.a] : [-e.a, 0])
  : e.t == 'dep' ? (e.lk === 0 ? [0, e.a] : [-e.a, e.a]) : (e.lk === 0 ? [0, -e.a] : [e.a, -e.a]);

export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
export const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w)[0]).join('');
export const norm = s => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
