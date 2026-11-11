// الترخيص في نسخة البيع: 15 يوماً تجريبية + كود تفعيل لكل جهاز.
// نفس قواعد نسخة البيع الحالية (water-pro) حتى يعمل نفس مولّد الأكواد:
//   الكود = أول 12 حرفاً من sha256(المفتاح + "|" + رمز الجهاز)، بأحرف كبيرة، مجموعات من 4.
// الحاسوب: المفتاح مضمّن عند البناء. أندرويد: لا مفتاح في JavaScript، التحقق في Kotlin (ProLicense).
/* global __SK__, __SELLER__ */
const SK = typeof __SK__ !== 'undefined' ? __SK__ : '';
export const SELLER = typeof __SELLER__ !== 'undefined' ? __SELLER__ : {};
export const TRIAL_DAYS = 15;
const KL = 'wplic', KL2 = 'wpt';

export function sha256(s) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const b = Array.from(new TextEncoder().encode(s)), l = b.length * 8; b.push(0x80); while (b.length % 64 !== 56) b.push(0);
  for (let i = 7; i >= 0; i--) b.push(Math.floor(l / 2 ** (i * 8)) & 255);
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]; const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < b.length; o += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) w[i] = (b[o + i * 4] << 24) | (b[o + i * 4 + 1] << 16) | (b[o + i * 4 + 2] << 8) | b[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, c, d, e, f, g, h, k] = H;
    for (let i = 0; i < 64; i++) { const S1 = r(f, 6) ^ r(f, 11) ^ r(f, 25), ch = (f & g) ^ (~f & h), t1 = (k + S1 + ch + K[i] + w[i]) | 0, S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & c) ^ (a & d) ^ (c & d), t2 = (S0 + mj) | 0; k = h; h = g; g = f; f = (e + t1) | 0; e = d; d = c; c = a; a = (t1 + t2) | 0; }
    H = [H[0] + a, H[1] + c, H[2] + d, H[3] + e, H[4] + f, H[5] + g, H[6] + h, H[7] + k].map(x => x | 0);
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
export const norm = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const group = v => (norm(v).match(/.{1,4}/g) || []).join('-');
export const licCode = id => SK ? sha256(SK + '|' + norm(id)).slice(0, 12).toUpperCase().match(/.{4}/g).join('-') : null;

const C0 = () => window.Capacitor;
export const nativePlugin = () => { const C = C0(); return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.ProLicense ? C.Plugins.ProLicense : null; };
const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } };

/** يقرأ/ينشئ حالة الترخيص على هذا الجهاز. lic = D.lic (بداية التجربة محفوظة مع البيانات أيضاً) */
export function load(lic) {
  let L = null; try { L = JSON.parse(get(KL) || 'null'); } catch { /* */ }
  const t2 = +get(KL2) || 0;
  if (!L || !L.id) {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', rb = new Uint8Array(8);
    try { crypto.getRandomValues(rb); } catch { for (let i = 0; i < 8; i++) rb[i] = Math.random() * 256; }
    let id = 'P'; for (let i = 1; i < 8; i++) id += A[rb[i] % A.length];
    let st = Date.now(); if (t2) st = Math.min(st, t2); if (lic && lic.start > 0) st = Math.min(st, lic.start);
    L = { id: id.slice(0, 4) + '-' + id.slice(4), start: st, seen: Date.now(), code: '' };
  }
  if (t2 && t2 < L.start) L.start = t2;
  if (lic && lic.start > 0 && lic.start < L.start) L.start = lic.start;
  L.seen = Math.max(L.seen || 0, Date.now());
  save(L); return L;
}
export function save(L) { put(KL, JSON.stringify(L)); const t2 = +get(KL2) || 0; if (!t2 || t2 > L.start) put(KL2, String(L.start)); }
/** الأيام المتبقية (الرجوع بساعة الجهاز إلى الوراء لا يزيدها) */
export const daysLeft = L => Math.max(0, TRIAL_DAYS - Math.floor((Math.max(Date.now(), L.seen || 0) - L.start) / 864e5));
export const pcOK = L => !!(SK && L.code && L.code === licCode(L.id));
export const dayWord = n => n > 10 ? 'يوماً' : n > 2 ? 'أيام' : n === 2 ? 'يومان' : 'يوم';
export const seller = k => SELLER[k] && String(SELLER[k])[0] !== '_' ? String(SELLER[k]) : '';
