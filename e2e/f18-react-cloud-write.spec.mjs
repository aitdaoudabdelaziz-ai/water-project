// F18 نسخة React + الكتابة في السحابة (المرحلة 4، الخطوة 2) — التوافق مع البرنامج الحالي بنفس Firebase المزيّف
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launch, close, URL } from './helpers.mjs';
after(close);
const BASE = URL.replace(/water\/www\/index\.html|cloud\/index\.html/, ''), RURL = BASE + 'react/';
const FAKE = fs.readFileSync(new globalThis.URL('./fakefb.js', import.meta.url), 'utf8');
// نفس recs/place في cloud_block.html لبناء وثائق السحابة
const canon = v => v === null || typeof v !== 'object' ? JSON.stringify(v === undefined ? null : v) : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
function toDocs(d) {
  const BIG = ['subs', 'reads', 'invs', 'fin', 'users'], main = {}, out = {};
  Object.keys(d).forEach(k => { if (!BIG.includes(k)) main[k] = d[k]; });
  out.main = { j: canon(main) };
  const put = (doc, k, v) => { (out[doc] = out[doc] || { m: {} }).m[k] = canon(v); };
  d.subs.forEach(s => put('s' + (s.id % 8), String(s.id), s));
  Object.keys(d.reads).forEach(k => { const p = k.split('|'); put('r_' + p[1] + '_' + p[2], k, d.reads[k]); });
  d.invs.forEach(i => put('i_' + i.y + '_' + i.r, i.s + '|' + i.y + '|' + i.r, i));
  d.fin.forEach(f => put('f' + (f.id % 4), String(f.id), f));
  (d.users || []).forEach(u => put('users', String(u.id), u));
  return Object.entries(out).map(([id, data]) => ({ id, data }));
}
async function app({ deny, wdeny } = {}) {
  const b = await launch(), c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await c.route(/gstatic\.com\/firebasejs\/.*\/firebase-app-compat\.js/, r => r.fulfill({ contentType: 'text/javascript', body: FAKE }));
  await c.route(/gstatic\.com\/firebasejs\/.*\/firebase-(auth|firestore)-compat\.js/, r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await c.route(/googleapis|cdnjs/, r => r.abort());
  const p = await c.newPage(), errs = [], dialogs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await p.goto(RURL); await p.locator('.kpi').first().waitFor();
  // سحابة فيها 7 مشتركين «حقيقيين» مختلفين عن البيانات التجريبية
  const D = await p.evaluate(() => JSON.parse(localStorage.getItem('w1react')).data);
  const C = JSON.parse(JSON.stringify(D)); C.subs = C.subs.slice(0, 7).map(s => ({ ...s, name: 'سحابي ' + s.id })); const ids = new Set(C.subs.map(s => s.id));
  C.invs = C.invs.filter(i => ids.has(i.s)); C.reads = Object.fromEntries(Object.entries(C.reads).filter(([k]) => ids.has(+k.split('|')[0])));
  await p.evaluate(([docs, deny, wdeny]) => { localStorage.setItem('fakefb_docs', JSON.stringify(docs)); localStorage.setItem('fakefb_pw', 'Cloud#2026'); if (deny) localStorage.setItem('fakefb_deny', '1'); if (wdeny) localStorage.setItem('fakefb_wdeny', '1'); }, [toDocs(C), !!deny, !!wdeny]);
  await p.reload(); await p.locator('.kpi').first().waitFor();
  await p.locator('.nav button', { hasText: 'البيانات' }).click();
  return { c, p, errs, dialogs, C, D };
}

const Y = new Date().getFullYear(), R = Math.floor(new Date().getMonth() / 3);
async function live(o = {}) {
  const A = await app(o);
  await A.p.getByLabel('كلمة سر السحابة').fill('Cloud#2026'); await A.p.getByRole('button', { name: /الاتصال بالسحابة/ }).click();
  await A.p.locator('.cchip.c-live').waitFor();
  return A;
}
const enableWrite = async p => { await p.getByRole('button', { name: 'تفعيل الحفظ في السحابة' }).click(); await p.getByText('الحفظ في السحابة مفعّل:').waitFor(); };
// مشترك بلا قراءة في الجولة الحالية
const fresh = C => C.subs.find(s => !C.reads[s.id + '|' + Y + '|' + R]);
async function record(p, s, o, n) {
  await p.locator('.nav button', { hasText: 'القراءات' }).click(); await p.locator('.rr', { hasText: s.name }).click();
  await p.getByLabel('القراءة القديمة').fill(String(o)); await p.getByLabel('القراءة الجديدة').fill(String(n));
  await p.getByRole('button', { name: /حفظ القراءة/ }).click();
}
const docs = p => p.evaluate(() => Object.fromEntries(JSON.parse(localStorage.getItem('fakefb_docs')).map(d => [d.id, d.data])));

test('F18-H1 a reading saved from React lands in the cloud in the same format, after a backup', async () => {
  const { p, errs, dialogs, C } = await live(); await enableWrite(p);
  assert.match(dialogs.join(), /تفعيل الحفظ في السحابة/);
  const s = fresh(C), k = s.id + '|' + Y + '|' + R; await record(p, s, 200, 215);
  await p.getByText(/فاتورة .*غير مؤداة/).waitFor(); await p.waitForTimeout(150);
  const d = await docs(p);
  assert.equal(d['r_' + Y + '_' + R].m[k], '{"n":215,"o":200}');
  const inv = JSON.parse(d['i_' + Y + '_' + R].m[k]); assert.equal(inv.s, s.id); assert.equal(inv.n - inv.o, 15); assert.equal(inv.paid, 0);
  assert.ok(d['i_' + Y + '_' + R].by, 'written by the signed-in email');
  // باقي السجلات لم تُلمس: فقط القراءة والفاتورة و main (seq)
  const log = await p.evaluate(() => window.__fbLog); assert.deepEqual([...new Set(log)].sort(), ['i_' + Y + '_' + R, 'main', 'r_' + Y + '_' + R].sort());
  // main: لم يتغير فيه إلا عدّاد الفواتير seq
  const m0 = JSON.parse(toDocs(C).find(x => x.id === 'main').data.j), m1 = JSON.parse(d.main.j);
  assert.equal(m1.seq, m0.seq + 1); delete m0.seq; delete m1.seq; assert.deepEqual(m1, m0);
  const bak = await p.evaluate(() => JSON.parse(localStorage.getItem('w1react_cloudbak')));
  assert.equal(bak.length, 1); assert.equal(bak[0].data.reads[k], undefined, 'backup is the cloud before the edit');
  await p.keyboard.press('Escape'); await p.locator('.nav button', { hasText: 'البيانات' }).click(); assert.equal(await p.getByRole('button', { name: /نسخة السحابة/ }).count(), 1);
  assert.deepEqual(errs, []);
});
test('F18-H2 the current app sees the React edit, and React sees the current app edits', async () => {
  const { c, p, C } = await live(); await enableWrite(p);
  const s = fresh(C), k = s.id + '|' + Y + '|' + R; await record(p, s, 300, 333); await p.getByText(/فاتورة .*غير مؤداة/).waitFor(); await p.waitForTimeout(150);
  const L = await c.newPage(); await L.goto(BASE + 'old/cloud/index.html');
  await L.waitForFunction(k => { try { const D = window.__clD(); return D.reads[k] && D.reads[k].n === 333; } catch { return false; } }, k, { timeout: 8000 });
  const inv = await L.evaluate(k => window.__clD().invs.find(i => i.s + '|' + i.y + '|' + i.r === k), k); assert.equal(inv.n, 333);
  // البرنامج الحالي يعدّل اسم المشترك ← يظهر في React
  await L.evaluate(id => { const D = window.__clD(); D.subs.find(x => x.id === id).name = 'معدّل من البرنامج الحالي'; window.__cs(); }, s.id);
  await p.keyboard.press('Escape'); await p.locator('.nav button', { hasText: 'المشتركون' }).click();
  await p.locator('.list', { hasText: 'معدّل من البرنامج الحالي' }).waitFor({ timeout: 5000 });
});
test('F18-N1 a refused write shows a clear message and the screen goes back to the cloud data', async () => {
  const { p, dialogs, C } = await live({ wdeny: true }); await enableWrite(p);
  const s = fresh(C), k = s.id + '|' + Y + '|' + R; await record(p, s, 10, 20);
  await p.waitForFunction(() => true); await p.waitForTimeout(300);
  assert.match(dialogs.join('\n'), /ليست لديك صلاحية الحفظ في السحابة/);
  const cache = await p.evaluate(() => JSON.parse(localStorage.getItem('w1react_cloudcache')));
  assert.equal(cache.reads[k], undefined);
  assert.equal((await docs(p))['r_' + Y + '_' + R].m[k], undefined);
});
test('F18-N2 turning writing off goes back to read-only: nothing more is written', async () => {
  const { p, C } = await live(); await enableWrite(p);
  await p.getByRole('button', { name: /إيقاف الحفظ/ }).click(); await p.getByText('قراءة فقط:').waitFor();
  const n = await p.evaluate(() => window.__fbWrites);
  await p.locator('.nav button', { hasText: 'القراءات' }).click(); await p.locator('.rr', { hasText: fresh(C).name }).click();
  assert.match(await p.locator('.warn').innerText(), /للقراءة فقط/);
  assert.equal(await p.evaluate(() => window.__fbWrites), n);
});
test('F18-H3 read-only cloud: subscribers page explains how to enable editing', async () => {
  const { p } = await live(); await p.locator('.nav button', { hasText: 'المشتركون' }).click();
  assert.equal(await p.getByRole('button', { name: '＋ مشترك جديد' }).count(), 0);
  await p.getByRole('button', { name: /فعّل «الحفظ في السحابة»/ }).click(); await p.getByRole('button', { name: 'تفعيل الحفظ في السحابة' }).click();
  await p.locator('.nav button', { hasText: 'المشتركون' }).click(); await p.getByRole('button', { name: '＋ مشترك جديد' }).waitFor();
});
test('F18-V1 new member: sign-up sends a Google verification email; access only after confirming', async () => {
  const { p, dialogs, errs } = await app();
  await p.evaluate(() => localStorage.setItem('fakefb_needverify', '1'));
  await p.getByLabel('البريد الإلكتروني').fill('new.member@example.com'); await p.getByLabel('كلمة سر السحابة').fill('Secret#123');
  await p.getByRole('button', { name: 'عضو جديد؟ إنشاء حساب' }).click();
  assert.match(dialogs.join(), /رسالة من Google/);
  await p.getByText('أكّد بريدك الإلكتروني.').waitFor();
  assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('fakefb_mails'))), ['new.member@example.com']);
  assert.match(await p.locator('.panel', { hasText: 'سحابة الجمعية' }).innerText(), /لم تؤكّد بريدك/);
  await p.getByRole('button', { name: 'إعادة إرسال رسالة التأكيد' }).click(); await p.getByText(/أرسلنا رسالة التأكيد/).waitFor();
  await p.getByRole('button', { name: '✓ أكّدت بريدي' }).click(); await p.getByText(/لم يتأكد البريد بعد/).waitFor();
  // يضغط الرابط في الرسالة
  await p.evaluate(() => localStorage.setItem('fakefb_verified', JSON.stringify(['new.member@example.com'])));
  await p.getByRole('button', { name: '✓ أكّدت بريدي' }).click();
  await p.locator('.cchip.c-live').waitFor({ timeout: 8000 });
  assert.deepEqual(errs, []);
});
test('F18-V2 sign-up with an email that already has an account is refused with a clear warning', async () => {
  const { p } = await app();
  await p.evaluate(() => localStorage.setItem('fakefb_accounts', JSON.stringify(['taken@example.com'])));
  await p.getByLabel('البريد الإلكتروني').fill('taken@example.com'); await p.getByLabel('كلمة سر السحابة').fill('Secret#123');
  await p.getByRole('button', { name: 'عضو جديد؟ إنشاء حساب' }).click();
  assert.match(await p.getByRole('alert').innerText(), /لديه حساب مسبقاً.*أخبر المسؤول/);
});
