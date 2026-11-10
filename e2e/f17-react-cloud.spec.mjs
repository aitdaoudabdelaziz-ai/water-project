// F17 نسخة React + السحابة (المرحلة 4، الخطوة 1: قراءة فقط) — بـ Firebase مزيّف بنفس صيغة الوثائق
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
async function app({ deny } = {}) {
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
  await p.evaluate(([docs, deny]) => { localStorage.setItem('fakefb_docs', JSON.stringify(docs)); localStorage.setItem('fakefb_pw', 'Cloud#2026'); if (deny) localStorage.setItem('fakefb_deny', '1'); }, [toDocs(C), !!deny]);
  await p.reload(); await p.locator('.kpi').first().waitFor();
  await p.locator('.nav button', { hasText: 'البيانات' }).click();
  return { c, p, errs, dialogs, C, D };
}
const login = async (p, pw) => { await p.getByLabel('كلمة سر السحابة').fill(pw); await p.getByRole('button', { name: 'الاتصال بالسحابة (قراءة فقط)' }).click(); };
test('F17-H1 wrong cloud password refused; right one shows the cloud data, read-only', async () => {
  const { p, errs, C } = await app();
  await login(p, 'bad'); assert.match(await p.getByRole('alert').innerText(), /غير صحيحة/);
  await login(p, 'Cloud#2026'); await p.locator('.cchip.c-live').waitFor();
  await p.locator('.nav button', { hasText: 'المشتركون' }).click();
  assert.equal(+(await p.locator('.toolbar h2 .cnt').innerText()), C.subs.length);
  assert.match(await p.locator('.list').innerText(), /سحابي/);
  await p.locator('.nav button', { hasText: 'القراءات' }).click();
  assert.equal(await p.getByRole('button', { name: /إصدار فواتير/ }).count(), 0, 'no editing in read-only cloud mode');
  await p.locator('.rr').first().click(); assert.match(await p.locator('.warn').innerText(), /للقراءة فقط/);
  assert.deepEqual(errs, []);
});
test('F17-H2 nothing is ever written to the cloud', async () => {
  const { p } = await app(); await login(p, 'Cloud#2026'); await p.locator('.cchip.c-live').waitFor();
  await p.locator('.nav button', { hasText: 'الفواتير' }).click(); await p.locator('.inv-r').first().click(); await p.keyboard.press('Escape');
  await p.evaluate(() => { try { localStorage.setItem('x', '1'); } catch (e) {} });
  assert.equal(await p.evaluate(() => window.__fbWrites), 0);
});
test('F17-H3 back to the local React copy restores it untouched', async () => {
  const { p, D } = await app(); await login(p, 'Cloud#2026'); await p.locator('.cchip.c-live').waitFor();
  await p.locator('.nav button', { hasText: 'البيانات' }).click(); await p.getByRole('button', { name: 'الرجوع إلى نسخة React المحلية' }).click();
  await p.locator('.nav button', { hasText: 'المشتركون' }).click();
  assert.equal(+(await p.locator('.toolbar h2 .cnt').innerText()), D.subs.length); assert.equal(await p.locator('.cchip').count(), 0);
});
test('F17-N1 an email not in the members list gets a clear message', async () => {
  const { p } = await app({ deny: true }); await login(p, 'Cloud#2026');
  await p.locator('.cchip.c-error').waitFor(); await p.locator('.nav button', { hasText: 'البيانات' }).click();
  assert.match(await p.locator('#cl-h ~ .err').innerText(), /غير مفعّل في قائمة أعضاء الجمعية/);
});
