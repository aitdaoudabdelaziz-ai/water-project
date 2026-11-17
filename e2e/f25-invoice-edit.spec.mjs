// F25 تعديل الفاتورة في البرنامج الجديد: نفس نتيجة saveInv في البرنامج القديم، إعادة الضبط، الحذف، والحفظ في السحابة
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { launch, close, URL } from './helpers.mjs';
after(close);
const BASE = URL.replace(/water\/www\/index\.html/, '');
async function app() {
  const b = await launch(), c = await b.newContext({ viewport: { width: 1000, height: 1100 } }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  const p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto(BASE + 'react/'); await p.locator('.kpi').first().waitFor(); return { b, p, errs };
}
const data = p => p.evaluate(() => JSON.parse(localStorage.getItem('w1react')).data);
const EDIT = { num: '2026/99001', o: '100', n: '137.5', price: '6', fee: '12', name: 'اسم على الفاتورة فقط', note: 'ملاحظة تجريبية' };
async function openInv(p, id) { await p.evaluate(() => 0); await p.locator('.nav button', { hasText: 'الفواتير' }).click(); await p.evaluate(id => window.__openInv && window.__openInv(id), id); }
test('F25-H1 editing an unpaid invoice gives exactly the same invoice as the old app', async () => {
  const { b, p, errs } = await app(); const D0 = await data(p); const inv = D0.invs.find(i => !i.paid);
  await p.locator('.nav button', { hasText: 'الفواتير' }).click();
  await p.getByLabel(/بحث/).first().fill(inv.num); await p.locator('.list.inv li button').first().click();
  await p.getByRole('button', { name: '✎ تعديل الفاتورة' }).click();
  await p.getByLabel('رقم الفاتورة').fill(EDIT.num); await p.getByLabel('القراءة السابقة (م³)').fill(EDIT.o); await p.getByLabel('القراءة الحالية (م³)').fill(EDIT.n);
  await p.getByLabel('الثمن (درهم/م³)').fill(EDIT.price); await p.getByLabel('رسوم الاشتراك (درهم)').fill(EDIT.fee);
  await p.getByLabel('اسم المشترك').fill(EDIT.name); await p.getByLabel('ملاحظة إضافية تظهر في الفاتورة').fill(EDIT.note);
  assert.match(await p.locator('.is-sum').innerText(), /237\.00/);
  await p.getByRole('button', { name: 'حفظ', exact: true }).click(); await p.getByText('فاتورة ' + EDIT.num).waitFor();
  const r = (await data(p)).invs.find(i => i.id === inv.id);
  assert.equal(r.lk, 1); assert.equal(r.ov.name, EDIT.name); assert.equal((await data(p)).subs.find(s => s.id === inv.s).name, D0.subs.find(s => s.id === inv.s).name);
  // البرنامج القديم بنفس البيانات ونفس التعديل
  const L = await b.newContext(); await L.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  await L.addInitScript(d => { localStorage.setItem('wcloud_mode', 'local'); localStorage.setItem('w1', JSON.stringify(d)); }, D0);
  const q = await L.newPage(); await q.goto(BASE + 'water/www/index.html'); await q.waitForFunction(() => typeof window.editInv === 'function');
  const l = await q.evaluate(([id, E]) => { window.editInv(id); const $ = s => document.querySelector(s);
    $('#ei_num').value = E.num; $('#ei_o').value = E.o; $('#ei_n').value = E.n; $('#ei_price').value = E.price; $('#ei_fee').value = E.fee; $('#ei_name').value = E.name; $('#ei_note').value = E.note;
    window.saveInv(0); return JSON.parse(localStorage.getItem('w1') || 'null') && D.invs.find(i => i.id === id); }, [inv.id, EDIT]);
  assert.deepEqual(r, l); assert.deepEqual(errs, []);
  // يظهر في الفاتورة المطبوعة
  await p.getByRole('button', { name: /طباعة الفاتورة/ }).click();
  const pg = await p.locator('.pv .pg').innerText(); assert.match(pg, new RegExp(EDIT.name)); assert.match(pg, /ملاحظة تجريبية/); assert.match(pg, /237[.,]00/);
});
test('F25-N1 duplicate number and impossible readings are refused; reset and delete work', async () => {
  const { p } = await app(); const D0 = await data(p); const [a, x] = D0.invs.filter(i => !i.paid);
  await p.locator('.nav button', { hasText: 'الفواتير' }).click(); await p.getByLabel(/بحث/).first().fill(a.num); await p.locator('.list.inv li button').first().click();
  await p.getByRole('button', { name: '✎ تعديل الفاتورة' }).click();
  await p.getByLabel('رقم الفاتورة').fill(x.num); await p.getByRole('button', { name: 'حفظ', exact: true }).click();
  assert.match(await p.getByRole('alert').innerText(), /مستعمل في فاتورة أخرى/);
  await p.getByLabel('رقم الفاتورة').fill(a.num); await p.getByLabel('القراءة الحالية (م³)').fill('1'); await p.getByRole('button', { name: 'حفظ', exact: true }).click();
  assert.match(await p.getByRole('alert').innerText(), /أصغر من السابقة/);
  await p.getByLabel('القراءة الحالية (م³)').fill(String(a.n + 50)); await p.getByRole('button', { name: 'حفظ', exact: true }).click(); await p.getByRole('button', { name: '✎ تعديل الفاتورة' }).waitFor();
  assert.equal((await data(p)).invs.find(i => i.id === a.id).lk, 1);
  await p.getByRole('button', { name: '✎ تعديل الفاتورة' }).click(); await p.getByRole('button', { name: 'إعادة الضبط من بيانات البرنامج' }).click(); await p.getByRole('button', { name: '✎ تعديل الفاتورة' }).waitFor();
  const rr = (await data(p)).invs.find(i => i.id === a.id); assert.equal(rr.lk, undefined); assert.equal(rr.n, a.n);
  await p.getByRole('button', { name: '🗑 حذف الفاتورة' }).click(); await p.waitForTimeout(200);
  assert.equal((await data(p)).invs.some(i => i.id === a.id), false);
});
test('F25-H2 an unpaid invoice shows the previous unpaid invoices and the full amount to pay', async () => {
  const { p } = await app(); const D = await data(p);
  const pr = i => D.invs.filter(x => x.s == i.s && !x.paid && x.id != i.id && (x.y < i.y || (x.y == i.y && x.r < i.r)));
  const i = D.invs.filter(x => !x.paid).find(x => pr(x).length > 0); const ar = pr(i);
  const t = x => (x.n - x.o) * x.price + x.fee, sum = ar.reduce((a, x) => a + t(x), 0);
  await p.locator('.nav button', { hasText: 'الفواتير' }).click(); await p.getByLabel(/بحث/).first().fill(i.num); await p.locator('.list.inv li button').first().click();
  assert.match(await p.locator('.ar-r').last().innerText(), new RegExp((t(i) + sum).toFixed(2).replace('.', '\\.')));
  assert.equal(await p.locator('.sheet .row').first().evaluate(e => /(^|\s)0(\s|$)/.test(e.innerText)), false);
  await p.getByRole('button', { name: /طباعة الفاتورة/ }).click();
  const pg = await p.locator('.pv .pg').innerText();
  assert.match(pg, new RegExp('المجموع الكلي للأداء: ' + (t(i) + sum).toFixed(2))); for (const x of ar) assert.match(pg, new RegExp(x.num));
});
