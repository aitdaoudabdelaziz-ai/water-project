// مصدر البيانات للمرحلة 1 (عرض فقط). نسخة React لا تكتب أبداً في بيانات البرنامج الأصلي (w1 / w1c).
const OWN = 'w1react';
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* التخزين غير متاح */ } } };

export function normalize(D) {
  if (!D || !Array.isArray(D.subs) || !D.reads) throw new Error('ملف غير صالح');
  D.invs = D.invs || []; D.fin = D.fin || []; D.users = D.users || []; D.cfg = Object.assign({ price: 3, fee: 0, due: 15 }, D.cfg || {});
  return D;
}

export function loadSaved() {
  try { const x = JSON.parse(ls.get(OWN) || 'null'); if (x && x.data) return { ...x, data: normalize(x.data) }; } catch { /* نتجاهل */ }
  return null;
}
export function saveCopy(data, source) { ls.set(OWN, JSON.stringify({ data, source, at: Date.now() })); }

/** بيانات البرنامج الأصلي على نفس الجهاز (للقراءة فقط) */
export function deviceData() {
  for (const k of ['w1c', 'w1']) {
    try { const x = JSON.parse(ls.get(k) || 'null'); if (x && x.subs && x.subs.length) return { data: normalize(x), key: k }; } catch { /* نتجاهل */ }
  }
  return null;
}

/** بيانات تجريبية (نفس مولّد النسخة التجريبية /demo/) */
export function demoData() {
  const Y = new Date().getFullYear(), now = new Date(), CR = Math.floor(now.getMonth() / 3);
  let z = 7; const rn = n => { z = (z * 16807) % 2147483647; return z % n; };
  const F = ['محمد', 'أحمد', 'فاطمة', 'خديجة', 'يوسف', 'عائشة', 'الحسن', 'مريم', 'إبراهيم', 'زينب', 'عمر', 'سعاد', 'رشيد', 'نعيمة', 'عبد الله', 'حليمة', 'مصطفى', 'رقية', 'سعيد', 'لطيفة'];
  const L = ['التجريبي', 'المثال', 'النموذجي', 'الوهمي', 'الاختباري'];
  const p2 = x => String(x).padStart(2, '0');
  const D = { subs: [], reads: {}, invs: [], sid: 0, seq: 0, fin: [], fid: 0, users: [], uid: 0,
    cfg: { price: 5, fee: 10, due: 15, phone: '0500000000', email: 'demo@example.com', short: 'جمعية تجريبية', oc: 3000, ob: 15000 } };
  for (let i = 1; i <= 40; i++) D.subs.push({ id: i, name: F[(i - 1) % 20] + ' ' + L[Math.floor((i - 1) / 20) + (i % 3)], meter: 'D-' + String(1000 + i), cin: '', phone: '06000000' + p2(i), addr: 'الدوار ' + (1 + i % 4), fl: [], ct: i % 5 ? 1 : 0 });
  D.sid = 40;
  const day = (r, m, d) => Y + '-' + p2(r * 3 + m + 1) + '-' + p2(d);
  D.subs.forEach(s => { let v = 100 + rn(200);
    for (let r = 0; r <= CR; r++) { if (r == CR && s.id % 2) break; const c = 8 + rn(25), o = v, n = v + c; v = n; D.reads[s.id + '|' + Y + '|' + r] = { o, n };
      const id = ++D.seq, paid = r < CR ? (rn(10) < 8 ? 1 : 0) : (rn(10) < 3 ? 1 : 0), dt = r < CR ? day(r, 2, 28) : now.toISOString().slice(0, 10);
      const pd = paid ? (r < CR ? (Y + '-' + p2(Math.min(12, r * 3 + 4)) + '-' + p2(2 + rn(20))) : dt) : null;
      D.invs.push({ id, s: s.id, y: Y, r, o, n, price: 5, fee: 10, date: dt, paid, pd, pw: paid ? (rn(4) ? 'c' : 'b') : null, num: Y + '/' + String(id).padStart(5, '0') }); } });
  const fin = (t, w, d, c, a, lk) => { const x = { id: ++D.fid, t, w, d, c, a, n: '' }; if (lk != null) x.lk = lk; D.fin.push(x); };
  for (let m = 0; m <= now.getMonth(); m++) { fin('out', 'c', Y + '-' + p2(m + 1) + '-05', 'كهرباء', 350 + rn(150)); if (m % 3 == 1) fin('out', 'c', Y + '-' + p2(m + 1) + '-12', 'صيانة', 200 + rn(400)); if (m % 3 == 2) fin('dep', 'b', Y + '-' + p2(m + 1) + '-20', 'إيداع بنكي', 1000, 1); }
  fin('in', 'c', Y + '-02-10', 'اشتراكات جديدة', 600); fin('out', 'b', Y + '-03-15', 'قطع الغيار', 1200);
  return D;
}

// ---- فتح النسخ الاحتياطية (العادية والمشفّرة بنفس صيغة البرنامج الأصلي) ----
export const ENC_V = 'alfath-aes-gcm-v1';
const ub = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export async function decryptBackup(x, pw) {
  const k0 = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: ub(x.salt), iterations: x.it || 250000 }, k0, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub(x.iv) }, k, ub(x.ct))));
}

// ---- تصدير نسخة احتياطية (نفس صيغة البرنامج الأصلي، مع تشفير اختياري) ----
const b64 = u => { u = new Uint8Array(u); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
export async function encryptBackup(txt, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), it = 250000;
  const k0 = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, k0, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(txt));
  return JSON.stringify({ enc: ENC_V, kdf: 'PBKDF2-SHA256', it, salt: b64(salt), iv: b64(iv), ct: b64(ct), date: new Date().toISOString().slice(0, 10) });
}
export function download(txt, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
