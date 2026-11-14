// السحابة (Firebase) — نفس صيغة تخزين البرنامج الحالي حرفياً (مجموعة alfath، وثائق main / s0-7 / r_y_r / i_y_r / f0-3 / users)
// القراءة مباشرة، والكتابة (push) بنفس طريقة البرنامج الحالي: الفرق فقط، سجلاً بسجل، مع الدمج.
const FBV = '10.14.1', COL = 'alfath';
import { PRO } from './brand.js';
export const DEFFB = PRO ? null : {"cfg":{"apiKey":"AIzaSyB8WSV_5IJim98ltYsxlGp_nWPcnILa_yE","authDomain":"water-assoc.firebaseapp.com","projectId":"water-assoc","storageBucket":"water-assoc.firebasestorage.app","messagingSenderId":"1053204560068","appId":"1:1053204560068:web:d2a877234cbba162773191","measurementId":"G-F71JXGQ5YK"},"admin":"aitdaoudabdelaziz@gmail.com"};

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
  'auth/user-not-found': 'لا يوجد حساب بهذا البريد.', 'auth/invalid-email': 'البريد غير صحيح.', 'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.', 'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت.',
  'auth/email-already-in-use': 'هذا البريد لديه حساب مسبقاً. استعمل «الاتصال بالسحابة». إن لم تُنشئه أنت، أخبر المسؤول فوراً.', 'auth/weak-password': 'كلمة السر قصيرة: 6 أحرف على الأقل.', 'auth/operation-not-allowed': 'إنشاء الحسابات غير مفعّل. اطلب من المسؤول إنشاء حسابك.' };

/** يتصل ويتابع البيانات مباشرة. on({status, user, data, error}) */
export async function connect(on) {
  let unsub = null;
  try { await sdk(); } catch { on({ status: 'error', error: 'تعذّر تحميل مكتبة السحابة. تحقق من الإنترنت.' }); return () => {}; }
  const stopAuth = fb.auth.onAuthStateChanged(u => {
    if (unsub) { unsub(); unsub = null; }
    if (!u) { on({ status: 'login', user: null }); return; }
    const verified = !!u.emailVerified;
    on({ status: 'loading', user: u.email, verified });
    unsub = fb.db.collection(COL).onSnapshot({ includeMetadataChanges: true }, s => {
      if (!s.docs.length && s.metadata.fromCache) return;
      const D = fromDocs(s.docs); setRemote(D);
      on({ status: 'live', user: u.email, verified, data: D, cache: s.metadata.fromCache, pending: s.metadata.hasPendingWrites, at: Date.now() });
    }, e => on({ status: 'error', user: u.email, verified, error: e && e.code === 'permission-denied' ? (verified ? 'بريدك ' + u.email + ' غير موجود في قائمة أعضاء الجمعية. اطلب من المسؤول إضافته.' : 'لم تؤكّد بريدك ' + u.email + ' بعد: افتح رسالة التأكيد من Google، اضغط الرابط، ثم اضغط «أكّدت بريدي». إن كنت أكّدته، فاطلب من المسؤول إضافة بريدك إلى قائمة أعضاء الجمعية.') : 'خطأ في الاتصال بالسحابة: ' + (e && e.message || e) }));
  });
  return () => { if (unsub) unsub(); stopAuth && stopAuth(); };
}
export async function signIn(email, pw) { await sdk(); return fb.auth.signInWithEmailAndPassword(email.trim().toLowerCase(), pw); }
/** حساب جديد + رسالة تأكيد البريد من Google */
export async function signUp(email, pw) { await sdk(); const r = await fb.auth.createUserWithEmailAndPassword(email.trim().toLowerCase(), pw); try { await r.user.sendEmailVerification(); } catch { /* يمكن إعادة الإرسال */ } return r; }
export async function sendVerify() { if (!fb || !fb.auth.currentUser) throw new Error('لست متصلاً'); return fb.auth.currentUser.sendEmailVerification(); }
/** بعد الضغط على رابط التأكيد: نحدّث الحساب ونجدّد التصريح ثم نعيد الاتصال */
export async function recheckVerify() { const u = fb && fb.auth.currentUser; if (!u) return false; await u.reload(); await u.getIdToken(true); return !!fb.auth.currentUser.emailVerified; }
export async function signOut() { if (fb) await fb.auth.signOut(); }

// ---------- الكتابة (المرحلة 4، الخطوة 2): نفس طريقة push في البرنامج الحالي ----------
let LAST = null;            // آخر حالة معروفة في السحابة (سجلات canon)
export const setRemote = D => { LAST = recs(D); };
/** يرفع الفرق فقط بين D وآخر حالة في السحابة. يرجع عدد السجلات المرفوعة */
export async function push(D, by) {
  if (!fb || !LAST) throw new Error('غير متصل بالسحابة');
  const cur = recs(D), ch = {}; let n = 0;
  for (const k in cur) if (cur[k] !== LAST[k]) { ch[k] = cur[k]; n++; }
  for (const k in LAST) if (!(k in cur)) { ch[k] = null; n++; }
  if (!n) return 0;
  LAST = cur;
  const per = {};
  for (const rk in ch) { const [doc, key] = place(rk); (per[doc] = per[doc] || []).push([key, ch[rk]]); }
  const del = fb.F.firestore.FieldValue.delete(), docs = Object.keys(per), jobs = [];
  for (let s = 0; s < docs.length; s += 450) {
    const b = fb.db.batch();
    docs.slice(s, s + 450).forEach(doc => {
      const ref = fb.db.collection(COL).doc(doc);
      if (doc === 'main') { const v = per[doc][0][1]; if (v != null) b.set(ref, { j: v, at: Date.now(), by }); return; }
      const m = {}; per[doc].forEach(([k, v]) => m[k] = v == null ? del : v);
      b.set(ref, { m, at: Date.now(), by }, { merge: true });
    });
    jobs.push(b.commit());
  }
  await Promise.all(jobs);
  return n;
}
export const WERR = e => e && e.code === 'permission-denied' ? 'ليست لديك صلاحية الحفظ في السحابة. اطلب من المسؤول إضافة بريدك إلى الأعضاء.' : 'تعذّر الحفظ في السحابة: ' + (e && e.message || e);
