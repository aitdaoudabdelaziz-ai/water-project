// F19 نسخة React: إضافة وتعديل وحذف المشتركين (نفس قواعد البرنامج الحالي)
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { launch, close, URL } from './helpers.mjs';
after(close);
const RURL = URL.replace(/water\/www\/index\.html|cloud\/index\.html/, '') + 'react/';
async function app() {
  const b = await launch(), c = await b.newContext({ viewport: { width: 390, height: 844 } }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  const p = await c.newPage(), errs = [], dialogs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await p.goto(RURL); await p.locator('.kpi').first().waitFor();
  await p.locator('.nav button', { hasText: 'المشتركون' }).click();
  return { p, errs, dialogs };
}
const data = p => p.evaluate(() => JSON.parse(localStorage.getItem('w1react')).data);
test('F19-H1 add a subscriber, then edit him', async () => {
  const { p, errs } = await app(); const n0 = (await data(p)).subs.length;
  await p.getByRole('button', { name: '＋ مشترك جديد' }).click();
  await p.getByLabel('الاسم الكامل *').fill('مشترك جديد للتجربة'); await p.getByLabel('رقم العداد *').fill('Z-777');
  await p.getByLabel('رقم البطاقة الوطنية').fill('ab123'); await p.getByLabel('الهاتف').fill('0611223344');
  await p.getByRole('button', { name: 'إضافة المشترك' }).click();
  await p.locator('#sdn', { hasText: 'مشترك جديد للتجربة' }).waitFor();
  let D = await data(p); const s = D.subs.at(-1);
  assert.equal(D.subs.length, n0 + 1); assert.equal(s.meter, 'Z-777'); assert.equal(s.cin, 'AB123'); assert.equal(s.id, D.sid);
  await p.getByRole('button', { name: '✎ تعديل المعلومات' }).click();
  await p.getByLabel('العنوان').fill('الدوار 9'); await p.getByRole('button', { name: 'حفظ التعديل' }).click();
  await p.locator('#sdn').waitFor(); D = await data(p);
  assert.equal(D.subs.find(x => x.id === s.id).addr, 'الدوار 9'); assert.equal(D.subs.length, n0 + 1);
  await p.getByRole('button', { name: '✔ العقد موقّع' }).click(); D = await data(p); assert.equal(D.subs.find(x => x.id === s.id).ct, 1);
  assert.deepEqual(errs, []);
});
test('F19-N1 name and meter required; duplicate meter refused', async () => {
  const { p } = await app(); const m = (await data(p)).subs[0].meter;
  await p.getByRole('button', { name: '＋ مشترك جديد' }).click();
  await p.getByRole('button', { name: 'إضافة المشترك' }).click(); assert.match(await p.getByRole('alert').innerText(), /إجباريان/);
  await p.getByLabel('الاسم الكامل *').fill('مكرر'); await p.getByLabel('رقم العداد *').fill(m);
  await p.getByRole('button', { name: 'إضافة المشترك' }).click(); assert.match(await p.getByRole('alert').innerText(), /موجود مسبقاً/);
});
test('F19-H2 delete a subscriber: readings and invoices go, paid money stays in finance', async () => {
  const { p, dialogs } = await app(); let D = await data(p);
  const s = D.subs.find(x => D.invs.some(i => i.s === x.id && i.paid)), paid = D.invs.filter(i => i.s === s.id && i.paid);
  const sum = paid.reduce((t, i) => t + ((i.n - i.o) * i.price + i.fee), 0), f0 = D.fin.length;
  await p.getByLabel('بحث في المشتركين').fill(s.meter); await p.locator('.row-b').first().click();
  await p.getByRole('button', { name: '🗑 حذف المشترك' }).click();
  assert.match(dialogs.join(), /حذف المشترك/);
  D = await data(p);
  assert.equal(D.subs.some(x => x.id === s.id), false); assert.equal(D.invs.some(i => i.s === s.id), false);
  assert.equal(Object.keys(D.reads).some(k => +k.split('|')[0] === s.id), false);
  const nf = D.fin.slice(f0); assert.equal(nf.length, paid.length); assert.ok(nf.every(f => f.t === 'in' && /مشترك محذوف/.test(f.n)));
  assert.ok(Math.abs(nf.reduce((t, f) => t + f.a, 0) - sum) < 0.01);
});
test('F19-H3 admin changes the association logo from the ✎ button; monthly chart removed', async () => {
  const { p, errs } = await app();
  assert.equal(await p.getByText('المداخيل الشهرية').count(), 0);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
  await p.locator('.top .logo-ed input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await p.waitForFunction(() => /^data:image\/jpeg/.test(JSON.parse(localStorage.getItem('w1react')).data.cfg.logo || ''));
  assert.match(await p.locator('.top .logo-ed img').getAttribute('src'), /^data:image\/jpeg/);
  assert.deepEqual(errs, []);
});
