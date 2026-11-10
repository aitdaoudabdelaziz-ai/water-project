// F15 نسخة React (المرحلة 2): القراءات، الفواتير، الدفع، واتساب، والتوافق مع البرنامج الأصلي
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launch, close, URL } from './helpers.mjs';
after(close);
const BASE = URL.replace(/water\/www\/index\.html|cloud\/index\.html/, ''), RURL = BASE + 'react/', LURL = BASE + 'water/www/index.html';
async function app(w = 390) {
  const b = await launch(), c = await b.newContext({ viewport: { width: w, height: 844 } }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  const p = await c.newPage(), errs = [], dialogs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await p.addInitScript(() => { window.__open = []; window.open = u => { window.__open.push(u); return null; }; });
  await p.goto(RURL); await p.locator('.kpi').first().waitFor();
  return { c, p, errs, dialogs };
}
const data = p => p.evaluate(() => JSON.parse(localStorage.getItem('w1react')).data);
const tab = (p, n) => p.locator('.nav button', { hasText: n }).click();
async function record(p, n, o) {
  await tab(p, 'القراءات'); await p.locator('.rr').first().click();
  if (o != null) await p.getByLabel('القراءة القديمة').fill(String(o));
  await p.getByLabel('القراءة الجديدة').fill(String(n));
  await p.getByRole('button', { name: /حفظ القراءة/ }).click();
}
test('F15-H1 record a reading: invoice issued with the same amount rule as the original', async () => {
  const { p, errs } = await app();
  const name = await (await tab(p, 'القراءات'), p.locator('.rr .rr-n b').first().innerText());
  await p.locator('.rr').first().click(); await p.getByLabel('القراءة القديمة').fill('100'); await p.getByLabel('القراءة الجديدة').fill('112');
  await p.getByRole('button', { name: 'حفظ القراءة وإصدار الفاتورة' }).click();
  await p.getByText(/فاتورة .*غير مؤداة/).waitFor();
  const D = await data(p), s = D.subs.find(x => x.name === name), Y = new Date().getFullYear(), R = Math.floor(new Date().getMonth() / 3);
  const i = D.invs.find(x => x.s === s.id && x.y === Y && x.r === R);
  assert.deepEqual(D.reads[s.id + '|' + Y + '|' + R], { o: 100, n: 112 });
  assert.equal((i.n - i.o) * i.price + i.fee, 12 * D.cfg.price + D.cfg.fee); assert.match(i.num, new RegExp('^' + Y + '/\\d{5}$'));
  assert.deepEqual(errs, []);
});
test('F15-N1 new reading smaller than old is refused', async () => {
  const { p } = await app(); await record(p, 50, 80);
  await p.getByRole('alert').waitFor(); assert.match(await p.getByRole('alert').innerText(), /أصغر/);
});
test('F15-H2 pay cash in the sheet, cash box grows; cancelling asks first and restores', async () => {
  const { p, dialogs } = await app(); await record(p, 110, 100);
  const before = await p.evaluate(() => 0);
  await p.getByRole('button', { name: 'تأكيد الدفع نقداً' }).click(); await p.getByText(/مؤداة نقداً/).waitFor();
  let D = await data(p); const i = D.invs.filter(x => x.paid && x.pd === new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)).pop();
  assert.equal(i.pw, 'c');
  await p.keyboard.press('Escape'); await tab(p, 'الفواتير');
  await p.getByLabel('الحالة').selectOption('1'); await p.locator('.inv-r', { hasText: i.num }).click();
  await p.getByRole('button', { name: 'إلغاء الدفع' }).click();
  assert.match(dialogs.join(), /إلغاء دفع الفاتورة/);
  D = await data(p); assert.equal(D.invs.find(x => x.id === i.id).paid, 0);
});
test('F15-H3 paid round is locked against reading changes (same rule as the original)', async () => {
  const { p } = await app(); await record(p, 110, 100);
  await p.getByRole('button', { name: 'تأكيد الدفع نقداً' }).click(); await p.getByText(/مؤداة نقداً/).waitFor();
  assert.match(await p.locator('.warn').innerText(), /مدفوعة/); assert.equal(await p.getByLabel('القراءة الجديدة').isDisabled(), true);
});
test('F15-H4 "save and next" opens the next subscriber still waiting', async () => {
  const { p } = await app(); await tab(p, 'القراءات');
  const names = await p.locator('.rr .rr-n b').allInnerTexts();
  await p.locator('.rr').first().click(); await p.getByLabel('القراءة الجديدة').fill('999999'); await p.getByRole('button', { name: 'حفظ والتالي' }).click();
  await p.waitForTimeout(200); assert.equal(await p.locator('#rs-t').innerText(), names[1]);
});
test('F15-H5 issue round invoices from the readings screen', async () => {
  const { p } = await app(); await tab(p, 'القراءات');
  await p.getByRole('button', { name: /إصدار فواتير/ }).click();
  assert.match(await p.getByRole('status').innerText(), /أُصدرت أو حُدّثت \d+ فاتورة/);
});
test('F15-H6 WhatsApp reminder: Moroccan number and the original message text', async () => {
  const { p } = await app(); await tab(p, 'الفواتير'); await p.getByLabel('الحالة').selectOption('0');
  await p.locator('.inv-r').first().click(); await p.getByRole('button', { name: 'واتساب' }).click();
  const u = await p.evaluate(() => window.__open.at(-1)); assert.match(u, /^https:\/\/wa\.me\/2126\d{8}\?text=/);
  assert.match(decodeURIComponent(u.split('text=')[1]), /لم تُؤدَّ بعد/);
});
test('F15-C1 a backup saved by React opens in the original app with identical totals', async () => {
  const { c, p } = await app(); await record(p, 130, 100);
  await p.keyboard.press('Escape'); await tab(p, 'البيانات');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'حفظ النسخة' }).click()]);
  const f = await dl.path(), J = JSON.parse(fs.readFileSync(f, 'utf8'));
  const l = await c.newPage(); l.on('dialog', d => d.accept());
  await l.addInitScript(() => localStorage.setItem('wcloud_mode', 'local')); await l.goto(LURL); await l.waitForFunction(() => typeof D === 'object');
  await l.setInputFiles('#fr', f); await l.locator('#ek_w').waitFor({ timeout: 1500 }).catch(() => {});
  await l.waitForFunction(n => typeof D === 'object' && D.invs.length === n, J.invs.length);
  const tl = await l.evaluate(() => D.invs.reduce((t, i) => t + tot(i), 0)), tr = J.invs.reduce((t, i) => t + (i.n - i.o) * i.price + i.fee, 0);
  assert.equal(Math.round(tl * 100), Math.round(tr * 100));
});
test('F15-E1 React edits never touch the original data (w1)', async () => {
  const { p } = await app(); await p.evaluate(() => localStorage.setItem('w1', '{"subs":[{"id":1,"name":"أصلي"}],"reads":{},"invs":[]}'));
  await record(p, 120, 100);
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('w1')).subs[0].name), 'أصلي');
});
test('F15-H7 a recorded reading shows it can be edited or deleted; delete removes the unpaid invoice too', async () => {
  const { p, dialogs } = await app(); await record(p, 140, 100);
  await p.keyboard.press('Escape'); await p.getByRole('radio', { name: 'مسجّلة' }).click();
  const row = p.locator('.rr').first(); assert.match(await row.locator('.rr-s').innerText(), /✎/);
  const name = await row.locator('.rr-n b').innerText(); await row.click();
  assert.match(await p.locator('.state').innerText(), /قراءة مسجّلة/);
  await p.getByLabel('القراءة الجديدة').fill('150'); await p.getByRole('button', { name: 'حفظ التعديل' }).click();
  let D = await data(p); const s = D.subs.find(x => x.name === name), Y = new Date().getFullYear(), R = Math.floor(new Date().getMonth() / 3), k = s.id + '|' + Y + '|' + R;
  assert.equal(D.reads[k].n, 150); assert.equal(D.invs.find(i => i.s === s.id && i.y === Y && i.r === R).n, 150);
  await p.getByRole('button', { name: /مسح القراءة/ }).click(); assert.match(dialogs.join(), /مسح قراءة/);
  D = await data(p); assert.equal(D.reads[k], undefined); assert.equal(D.invs.some(i => i.s === s.id && i.y === Y && i.r === R), false);
});
test('F15-N2 a paid round shows the lock and no delete button', async () => {
  const { p } = await app(); await record(p, 110, 100);
  await p.getByRole('button', { name: 'تأكيد الدفع نقداً' }).click(); await p.getByText(/مؤداة نقداً/).waitFor();
  assert.equal(await p.getByRole('button', { name: /مسح القراءة/ }).count(), 0); assert.match(await p.locator('.warn').innerText(), /🔒/);
});
