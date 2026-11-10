// Firebase مزيّف للاختبارات (compat): مصادقة بكلمة سر واحدة، ووثائق من localStorage، وأي محاولة كتابة تُحسب.
(function () {
  if (window.firebase) return;
  const docs = JSON.parse(localStorage.getItem('fakefb_docs') || '[]'), PW = localStorage.getItem('fakefb_pw') || 'ok';
  let user = JSON.parse(sessionStorage.getItem('fakefb_user') || 'null'); const subs = [];
  window.__fbWrites = 0;
  const auth = {
    onAuthStateChanged(cb) { subs.push(cb); setTimeout(() => cb(user), 0); return () => {}; },
    signInWithEmailAndPassword(e, p) { if (p !== PW) return Promise.reject({ code: 'auth/invalid-credential' }); user = { email: e }; sessionStorage.setItem('fakefb_user', JSON.stringify(user)); subs.forEach(f => f(user)); return Promise.resolve({ user }); },
    signOut() { user = null; sessionStorage.removeItem('fakefb_user'); subs.forEach(f => f(null)); return Promise.resolve(); },
  };
  const w = () => { window.__fbWrites++; throw new Error('write attempted'); };
  const db = { enablePersistence() { return Promise.resolve(); }, batch: w,
    collection() { return { doc() { return { set: w, update: w, delete: w }; },
      onSnapshot(o, cb, err) { if (localStorage.getItem('fakefb_deny')) { setTimeout(() => err({ code: 'permission-denied' }), 5); return () => {}; }
        setTimeout(() => cb({ docs: docs.map(d => ({ id: d.id, data: () => d.data })), metadata: { fromCache: false, hasPendingWrites: false } }), 10); return () => {}; } }; } };
  window.firebase = { apps: [], initializeApp() { this.apps.push(1); }, auth: () => auth, firestore: Object.assign(() => db, { FieldValue: { delete: () => null } }) };
})();
