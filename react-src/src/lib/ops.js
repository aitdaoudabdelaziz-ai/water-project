// عمليات الكتابة — نفس منطق البرنامج الأصلي (regInv / sv / payGo / waText) حتى تبقى البيانات متوافقة
import { key, tot, n2, RN, due, today, prevNew } from './calc.js';

const trOn = D => (D.cfg.trOn && D.cfg.tr && D.cfg.tr.length ? D.cfg.tr : null);
let CLOUD_IDS = false;
export const cloudIds = on => { CLOUD_IDS = !!on; };
/** معرّف جديد: نفس NID في البرنامج الحالي — في السحابة لا يقل عن Date.now() حتى لا يتصادم جهازان */
export function nid(D, k) { let v = (+D[k] || 0) + 1; if (CLOUD_IDS) v = Math.max(v, Date.now()); D[k] = v; return v; }
export const roundPaid = (D, id, y, r) => D.invs.some(x => x.s == id && x.y == y && x.r == r && x.paid);
export const PAID_LOCK = 'فاتورة هذه الجولة مدفوعة. لتعديل القراءة ألغِ الدفع أولاً من الفواتير.';

/** يسجّل قراءة. يرجع رسالة خطأ أو null */
export function setReading(D, id, y, r, o, n) {
  if (roundPaid(D, id, y, r)) return PAID_LOCK;
  const k = key(id, y, r);
  if (n === '' || n == null || isNaN(n)) { delete D.reads[k]; return null; }
  o = isNaN(o) || o === '' || o == null ? 0 : +o; n = +n;
  if (n < o) return 'القراءة الجديدة أصغر من القديمة.';
  D.reads[k] = { o, n }; return null;
}

/** ينشئ أو يحدّث فاتورة الجولة (لا يغيّر فاتورة مدفوعة أو مقفلة) */
export function regInv(D, id, y, r) {
  const v = D.reads[key(id, y, r)]; if (!v) return null;
  let i = D.invs.find(x => x.s == id && x.y == y && x.r == r);
  if (i) { if (!i.lk && !i.paid) { i.o = v.o; i.n = v.n; } }
  else {
    D.seq = (+D.seq || 0) + 1;
    i = { id: D.seq, s: id, y, r, o: v.o, n: v.n, price: D.cfg.price, fee: D.cfg.fee, date: today(), paid: 0 };
    const T = trOn(D); if (T) i.tr = T.map(t => ({ to: t.to, price: t.price }));
    i.num = y + '/' + String(i.id).padStart(5, '0'); D.invs.push(i);
  }
  return i;
}
export function regRound(D, y, r) { let n = 0; D.subs.forEach(s => { if (regInv(D, s.id, y, r)) n++; }); return n; }

export function pay(D, ids, w) { const d = today(); ids.forEach(id => { const i = D.invs.find(x => x.id == id); if (!i) return; if (!i.paid) { i.paid = 1; i.pd = d; } i.pw = w; }); }
export function unpay(D, id) { const i = D.invs.find(x => x.id == id); if (i) { i.paid = 0; i.pd = null; i.pw = null; } }

export const waNum = p => { let d = String(p || '').replace(/[^\d+]/g, ''); if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('00')) d = d.slice(2);
  if (/^0[5-7]\d{8}$/.test(d)) d = '212' + d.slice(1); return /^\d{10,15}$/.test(d) && !d.startsWith('0') ? d : null; };
export function waText(D, i, assoc) {
  const s = Object.assign({}, D.subs.find(x => x.id === i.s), i.ov || {}), U = D.invs.filter(x => x.s == i.s && !x.paid), rest = U.reduce((t, x) => t + tot(x), 0), C = D.cfg, R0 = RN[i.r].split(' (')[0] + ' ' + i.y;
  let m;
  if (i.paid) m = 'السلام عليكم ' + s.name + '،\nنؤكد توصّلنا بأداء فاتورة الماء رقم ' + i.num + ' (' + R0 + ') بمبلغ ' + n2(tot(i)) + ' درهم' + (i.pd ? ' بتاريخ ' + i.pd : '') + '. شكراً لكم.' + (rest > 0 ? '\nالمبلغ المتبقي غير المؤدى: ' + n2(rest) + ' درهم.' : '');
  else m = 'السلام عليكم ' + s.name + '،\nنذكّركم بأن فاتورة الماء رقم ' + i.num + ' (' + R0 + ') بمبلغ ' + n2(tot(i)) + ' درهم لم تُؤدَّ بعد. آخر أجل للأداء: ' + due(i, C.due) + '.' + (U.length > 1 ? '\nمجموع الفواتير غير المؤداة: ' + U.length + ' بمبلغ ' + n2(rest) + ' درهم.' : '') + '\nالمرجو الأداء في أقرب وقت.';
  return m + '\n' + assoc + (C.phone ? ' — الهاتف: ' + C.phone : '');
}
export function openWhatsApp(D, i, assoc) {
  const s = D.subs.find(x => x.id === i.s) || {}, n = waNum((i.ov && i.ov.phone) || s.phone);
  if (!n) return 'لا يوجد رقم هاتف صالح لهذا المشترك. أضِفه من بطاقة المشترك، مثلاً 0612345678.';
  const u = 'https://wa.me/' + n + '?text=' + encodeURIComponent(waText(D, i, assoc));
  const C = window.Capacitor; if (C && C.isNativePlatform && C.isNativePlatform()) location.href = u; else window.open(u, '_blank', 'noopener');
  return null;
}

/** مسح قراءة الجولة وفاتورتها غير المؤداة. الفاتورة المؤداة تمنع المسح */
export function deleteReading(D, id, y, r) {
  if (roundPaid(D, id, y, r)) return PAID_LOCK;
  delete D.reads[key(id, y, r)];
  D.invs = D.invs.filter(x => !(x.s == id && x.y == y && x.r == r && !x.paid && !x.lk));
  return null;
}

// ---------- المشتركون (نفس قواعد addSub / rmSubs / ctTg في البرنامج الحالي) ----------
/** إضافة (eid فارغ) أو تعديل مشترك. يرجع رسالة خطأ أو المعرّف */
export function saveSub(D, eid, v) {
  const s = { name: (v.name || '').trim(), meter: (v.meter || '').trim(), cin: (v.cin || '').trim().toUpperCase(), phone: (v.phone || '').trim(), addr: (v.addr || '').trim() };
  if (!s.name || !s.meter) return { error: 'الاسم ورقم العداد إجباريان' };
  if (D.subs.some(x => x.meter == s.meter && x.id != eid)) return { error: 'رقم العداد موجود مسبقاً' };
  if (eid != null) { Object.assign(D.subs.find(x => x.id == eid), s); return { id: eid }; }
  s.id = nid(D, 'sid'); s.fl = []; D.subs.push(s); return { id: s.id };
}
/** حذف مشتركين: المبالغ المؤداة تبقى في المالية كمدخول «(مشترك محذوف)» */
export function removeSubs(D, ids) {
  const S = new Set(ids), name = id => (D.subs.find(x => x.id == id) || {}).name || '';
  D.invs.filter(i => i.paid && S.has(i.s)).forEach(i => { const a = tot(i);
    if (a > 0) D.fin.push({ id: nid(D, 'fid'), t: 'in', w: i.pw || 'c', d: i.pd || i.date, c: 'مياه الشرب', a, n: i.num + ' - ' + name(i.s) + ' (مشترك محذوف)' }); });
  D.subs = D.subs.filter(x => !S.has(x.id)); D.invs = D.invs.filter(i => !S.has(i.s));
  for (const k in D.reads) if (S.has(+k.split('|')[0])) delete D.reads[k];
}
export function toggleContract(D, id) { const s = D.subs.find(x => x.id == id); s.ct = s.ct ? 0 : 1; s.cd = s.ct ? today() : null; }

// ---------- Excel: نفس قواعد imp() في البرنامج القديم ----------
// المفتاح هو رقم العداد: مشترك موجود ← تحديث معلوماته، غير موجود ← إضافة.
// عمودا «قديمة / جديدة» (إن وُجدا) يسجّلان قراءة الجولة المختارة.
export const FN = { name: ['الاسم الكامل', 'الاسم'], meter: ['رقم العداد', 'العداد'], cin: ['رقم البطاقة الوطنية', 'البطاقة الوطنية', 'رقم البطاقة', 'CIN'],
  phone: ['الهاتف'], addr: ['العنوان'], old: ['قديمة', 'القديمة', 'قديم', 'السابقة', 'القراءة السابقة'], nw: ['جديدة', 'الجديدة', 'جديد', 'الحالية', 'القراءة الحالية'] };
/** يطبّق ملف Excel على البيانات D. يرجع تقريراً: { sheets, tot, a, up, rr, bad[], rows[] } */
export function importBook(D, book, y, r) {
  const rep = { sheets: 0, tot: 0, a: 0, up: 0, rr: 0, bad: [], rows: [] }, seen = {};
  book.forEach(({ name: sn, rows }) => {
    rows = rows.map(x => x || []);
    const h0 = rows.findIndex(x => x.some(c => String(c).trim() !== '')); if (h0 < 0) return;
    const H = rows[h0].map(x => String(x).trim()), ix = {};
    for (const k in FN) ix[k] = H.findIndex(h => FN[k].includes(h));
    if (ix.meter < 0) return; rep.sheets++;
    const g = (row, k) => (ix[k] >= 0 && row[ix[k]] != null ? row[ix[k]] : '');
    rows.slice(h0 + 1).forEach((row, i) => {
      const lab = (book.length > 1 ? sn + ' - ' : '') + 'سطر ' + (h0 + i + 2);
      if (!row.length || row.every(c => String(c).trim() === '')) return; rep.tot++;
      const m = String(g(row, 'meter')).trim().replace(/\.0$/, ''), nm = String(g(row, 'name')).trim();
      const note = (st, t) => { rep.rows.push({ lab, m, nm, st, t }); if (st === 'bad') rep.bad.push(lab + ': ' + t); };
      if (!m) return note('bad', 'رقم العداد فارغ');
      if (seen[m]) return note('bad', 'رقم العداد ' + m + ' مكرر في الملف (' + seen[m] + ')');
      seen[m] = lab;
      let s = D.subs.find(x => x.meter == m), st;
      if (!s) { if (!nm) return note('bad', 'الاسم فارغ (العداد ' + m + ')'); s = { id: nid(D, 'sid'), name: nm, meter: m, cin: '', phone: '', addr: '', fl: [] }; D.subs.push(s); rep.a++; st = 'new'; }
      else { rep.up++; st = 'upd'; }
      if (nm) s.name = nm;
      if (String(g(row, 'cin')).trim() !== '') s.cin = String(g(row, 'cin')).trim().toUpperCase();
      if (String(g(row, 'phone')).trim() !== '') s.phone = String(g(row, 'phone')).trim();
      if (String(g(row, 'addr')).trim() !== '') s.addr = String(g(row, 'addr')).trim();
      let t = '';
      const n = parseFloat(String(g(row, 'nw')).replace(',', '.'));
      if (!isNaN(n)) {
        let o = parseFloat(String(g(row, 'old')).replace(',', '.')); if (isNaN(o)) o = prevNew(D, s.id, y, r) || 0;
        const cur = D.reads[key(s.id, y, r)], same = cur && cur.o === o && cur.n === n;
        const e = same ? null : n < o ? 'القراءة الجديدة (' + n + ') أصغر من القديمة (' + o + ')' : roundPaid(D, s.id, y, r) ? PAID_LOCK : null;
        if (same) t = 'القراءة بدون تغيير';
        else if (e) { rep.bad.push(lab + ': ' + e + ' - العداد ' + m); t = '⚠ ' + e; }
        else { D.reads[key(s.id, y, r)] = { o, n }; rep.rr++; t = 'قراءة ' + o + ' ← ' + n; }
      }
      note(st, t);
    });
  });
  return rep;
}
