// Firebase مزيّف للاختبارات (compat): مصادقة بكلمة سر واحدة، ووثائق مشتركة بين الصفحات في localStorage (fakefb_docs).
// الكتابة (batch.set مع merge وFieldValue.delete) تُطبَّق على الوثائق كما في Firestore، وتُعدّ في window.__fbWrites.
// fakefb_deny: رفض القراءة. fakefb_wdeny: رفض الكتابة (permission-denied).
(function () {
  if (window.firebase) return;
  const LS = localStorage, PW = LS.getItem('fakefb_pw') || 'ok', DEL = { __del: 1 };
  const load = () => JSON.parse(LS.getItem('fakefb_docs') || '[]');
  // تأكيد البريد: fakefb_verified = قائمة البريدات المؤكدة، fakefb_needverify = القواعد تشترط التأكيد، fakefb_mails = رسائل أُرسلت
  const vset = () => JSON.parse(LS.getItem('fakefb_verified') || '[]');
  const mkUser = email => ({ email, get emailVerified() { return vset().includes(email); }, _ev: vset().includes(email),
    sendEmailVerification() { const m = JSON.parse(LS.getItem('fakefb_mails') || '[]'); m.push(email); LS.setItem('fakefb_mails', JSON.stringify(m)); return Promise.resolve(); },
    reload() { return Promise.resolve(); }, getIdToken() { return Promise.resolve('t'); } });
  let user = JSON.parse(LS.getItem('fakefb_user') || 'null'); if (user) user = mkUser(user.email); const subs = [], snaps = [];
  window.__fbWrites = 0; window.__fbLog = [];
  const auth = {
    onAuthStateChanged(cb) { subs.push(cb); setTimeout(() => cb(user), 0); return () => {}; },
    signInWithEmailAndPassword(e, p) { if (p !== PW) return Promise.reject({ code: 'auth/invalid-credential' }); user = mkUser(e); LS.setItem('fakefb_user', JSON.stringify(user)); subs.forEach(f => f(user)); return Promise.resolve({ user }); },
    signOut() { user = null; LS.removeItem('fakefb_user'); subs.forEach(f => f(null)); return Promise.resolve(); },
    createUserWithEmailAndPassword(e, p) { const acc = JSON.parse(LS.getItem('fakefb_accounts') || '[]'); if (acc.includes(e)) return Promise.reject({ code: 'auth/email-already-in-use' });
      acc.push(e); LS.setItem('fakefb_accounts', JSON.stringify(acc)); user = mkUser(e); LS.setItem('fakefb_user', JSON.stringify({ email: e })); subs.forEach(f => f(user)); return Promise.resolve({ user }); },
    get currentUser() { return user; },
    sendPasswordResetEmail() { return Promise.resolve(); },
  };
  const emit = () => { const docs = load(); snaps.forEach(cb => cb({ docs: docs.map(d => ({ id: d.id, data: () => d.data })), metadata: { fromCache: false, hasPendingWrites: false } })); };
  function apply(ops) {
    const docs = load();
    ops.forEach(([col, id, data, opt]) => { if (col !== 'alfath') return;
      let d = docs.find(x => x.id === id); if (!d) { d = { id, data: {} }; docs.push(d); }
      if (!(opt && opt.merge)) d.data = {};
      for (const k in data) { const v = data[k];
        if (k === 'm' && v && typeof v === 'object') { d.data.m = d.data.m || {}; for (const mk in v) { if (v[mk] === DEL) delete d.data.m[mk]; else d.data.m[mk] = v[mk]; } }
        else d.data[k] = v; } });
    LS.setItem('fakefb_docs', JSON.stringify(docs));
  }
  const commit = ops => new Promise((ok, ko) => setTimeout(() => {
    window.__fbWrites += ops.length; window.__fbLog.push(...ops.map(o => o[1]));
    if (LS.getItem('fakefb_wdeny')) return ko({ code: 'permission-denied', message: 'denied' });
    apply(ops); emit(); ok();
  }, 15));
  const ref = (col, id) => ({ _c: col, _id: id, set: (data, opt) => commit([[col, id, data, opt]]), update: data => commit([[col, id, data, { merge: true }]]), delete: () => commit([]) });
  const db = { enablePersistence() { return Promise.resolve(); },
    batch() { const ops = []; return { set(r, data, opt) { ops.push([r._c, r._id, data, opt]); }, commit: () => commit(ops) }; },
    collection(col) { return { doc: id => ref(col, id),
      onSnapshot(o, cb, err) { if (typeof o === 'function') { err = cb; cb = o; }
        if (LS.getItem('fakefb_deny') || (LS.getItem('fakefb_needverify') && user && !user.emailVerified)) { setTimeout(() => err({ code: 'permission-denied' }), 5); return () => {}; }
        snaps.push(cb); setTimeout(emit, 10); return () => { const k = snaps.indexOf(cb); if (k >= 0) snaps.splice(k, 1); }; } }; } };
  // صفحة أخرى كتبت: نعيد إرسال اللقطة
  window.addEventListener('storage', e => { if (e.key === 'fakefb_docs') emit(); });
  window.firebase = { apps: [], initializeApp() { this.apps.push(1); }, auth: () => auth, firestore: Object.assign(() => db, { FieldValue: { delete: () => DEL } }) };
})();
