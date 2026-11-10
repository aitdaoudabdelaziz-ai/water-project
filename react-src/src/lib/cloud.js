// السحابة (Firebase) — نفس صيغة تخزين البرنامج الحالي حرفياً (مجموعة alfath، وثائق main / s0-7 / r_y_r / i_y_r / f0-3 / users)
// المرحلة 4، الخطوة 1: قراءة فقط. لا يكتب هذا الملف شيئاً في السحابة.
const FBV = '10.14.1', COL = 'alfath';
export const DEFFB = {"cfg":{"apiKey":"AIzaSyB8WSV_5IJim98ltYsxlGp_nWPcnILa_yE","authDomain":"water-assoc.firebaseapp.com","projectId":"water-assoc","storageBucket":"water-assoc.firebasestorage.app","messagingSenderId":"1053204560068","appId":"1:1053204560068:web:d2a877234cbba162773191","measurementId":"G-F71JXGQ5YK"},"admin":"aitdaoudabdelaziz@gmail.com"};

export function canon(v) { if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v); if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).filter(k => v[k] !== undefined && typeof v[k] !== 'function').sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'; }
const BIG = ['subs', 'reads', 'invs', 'fin', 'users'];
export function recs(d) {
  const r = {}, main = {};
  Object.keys(d).forEach(k => { if (!BIG.includes(k)) main[k] = d[k]; });
  r.main = canon(main);
  (d.subs || []).forEach(s => r['S|' + s.id] = canon(s));
  Object.keys(d.reads || {}).forEach(k => r['R|' + k] = canon(d.reads[k]));
  (d.invs || []).forEach(i => r['I|' + i.s + '|' + i.y + '|' + i.r] = canon(i));
  (d.fin || []).forEach(f => r['F|' + f.id] = canon(f));
  (d.users || []).forEach(u => r['U|' + u.id] = canon(u));
  return r;
}
export function place(rk) {
  if (rk === 'main') return ['main', null];
  const p = rk.split('|'), t = p[0], k = p.slice(1).join('|');
  if (t === 'S') return ['s' + (Math.abs(+p[1]) % 8), k];
  if (t === 'R') return ['r_' + p[2] + '_' + p[3], k];
  if (t === 'I') return ['i_' + p[2] + '_' + p[3], k];
  if (t === 'F') return ['f' + (Math.abs(+p[1]) % 4), k];
  return ['users', k];
}
export function fromDocs(docs) {
  const d = { subs: [], reads: {}, invs: [], fin: [], users: [] }; let main = null;
  docs.forEach(x => {
    const id = x.id, v = x.data() || {};
    if (id === 'main') { try { main = JSON.parse(v.j); } catch { /* */ } return; }
    const m = v.m || {};
    for (const k in m) { let o; try { o = JSON.parse(m[k]); } catch { continue; }
      if (id[0] === 's') d.subs.push(o); else if (id[0] === 'r') d.reads[k] = o; else if (id[0] === 'i') d.invs.push(o); else if (id[0] === 'f') d.fin.push(o); else if (id === 'users') d.users.push(o); }
  });
  const by = (a, b) => (+a.id || 0) - (+b.id || 0);
  d.subs.sort(by); d.invs.sort(by); d.fin.sort(by); d.users.sort(by);
  const D = Object.assign({}, main || {}, d);
  D.cfg = D.cfg || { price: 3, fee: 0, due: 15, phone: '', email: '' };
  const mx = a => a.reduce((m, x) => Math.max(m, +x.id || 0), 0);
  D.sid = Math.max(+D.sid || 0, mx(D.subs)); D.seq = Math.max(+D.seq || 0, mx(D.invs)); D.fid = Math.max(+D.fid || 0, mx(D.fin)); D.uid = Math.max(+D.uid || 0, mx(D.users));
  return D;
}

const js = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
let fb = null;
async function sdk() {
  if (fb) return fb;
  for (const m of ['app', 'auth', 'firestore']) await js(`https://www.gstatic.com/firebasejs/${FBV}/firebase-${m}-compat.js`);
  const F = window.firebase; if (!F.apps.length) F.initializeApp(DEFFB.cfg);
  const db = F.firestore(); try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch { /* */ }
  fb = { F, db, auth: F.auth() }; return fb;
}
export const AERR = { 'auth/invalid-credential': 'البريد أو كلمة السر غير صحيحة.', 'auth/invalid-login-credentials': 'البريد أو كلمة السر غير صحيحة.', 'auth/wrong-password': 'كلمة السر غير صحيحة.',
  'auth/user-not-found': 'لا يوجد حساب بهذا البريد.', 'auth/invalid-email': 'البريد غير صحيح.', 'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.', 'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت.' };

/** يتصل ويتابع البيانات مباشرة. on({status, user, data, error}) */
export async function connect(on) {
  let unsub = null;
  try { await sdk(); } catch { on({ status: 'error', error: 'تعذّر تحميل مكتبة السحابة. تحقق من الإنترنت.' }); return () => {}; }
  const stopAuth = fb.auth.onAuthStateChanged(u => {
    if (unsub) { unsub(); unsub = null; }
    if (!u) { on({ status: 'login', user: null }); return; }
    on({ status: 'loading', user: u.email });
    unsub = fb.db.collection(COL).onSnapshot({ includeMetadataChanges: true }, s => {
      if (!s.docs.length && s.metadata.fromCache) return;
      on({ status: 'live', user: u.email, data: fromDocs(s.docs), cache: s.metadata.fromCache, at: Date.now() });
    }, e => on({ status: 'error', user: u.email, error: e && e.code === 'permission-denied' ? 'بريدك ' + u.email + ' غير مفعّل في قائمة أعضاء الجمعية. اطلب من المسؤول إضافته.' : 'خطأ في الاتصال بالسحابة: ' + (e && e.message || e) }));
  });
  return () => { if (unsub) unsub(); stopAuth && stopAuth(); };
}
export async function signIn(email, pw) { await sdk(); return fb.auth.signInWithEmailAndPassword(email.trim().toLowerCase(), pw); }
export async function signOut() { if (fb) await fb.auth.signOut(); }
