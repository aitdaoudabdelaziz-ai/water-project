// F24 العقد (التزام الاشتراك) في البرنامج الجديد: نفس نص البرنامج القديم، عقد فارغ، عقود القائمة، البنود والخاتم من الإعدادات
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { launch, close, URL } from './helpers.mjs';
after(close);
const BASE = URL.replace(/water\/www\/index\.html/, '');
async function app() {
  const b = await launch(), c = await b.newContext({ viewport: { width: 1000, height: 1300 } }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  const p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto(BASE + 'react/'); await p.locator('.kpi').first().waitFor(); return { b, p, errs };
}
const subsTab = p => p.locator('.nav button', { hasText: 'المشتركون' }).click();
test('F24-H1 contract of one subscriber has the same text as the old app', async () => {
  const { b, p, errs } = await app(); const D = await p.evaluate(() => JSON.parse(localStorage.getItem('w1react')).data);
  await subsTab(p); await p.locator('.row-b').first().click(); await p.getByRole('button', { name: '📄 العقد (طباعة)' }).click();
  const t1 = (await p.locator('.ctp').innerText()).replace(/\s+/g, ' ');
  const L = await b.newContext(); await L.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  await L.addInitScript(d => { localStorage.setItem('wcloud_mode', 'local'); localStorage.setItem('w1', JSON.stringify(d)); }, D);
  const q = await L.newPage(); await q.goto(BASE + 'water/www/index.html'); await q.waitForFunction(() => typeof window.showCt === 'function');
  await q.evaluate(id => window.showCt([id]), D.subs[0].id);
  assert.equal(t1, (await q.locator('.ctp').first().innerText()).replace(/\s+/g, ' '));
  assert.match(t1, new RegExp(D.subs[0].name)); assert.deepEqual(errs, []);
});
test('F24-H2 blank contract and contracts of the filtered list', async () => {
  const { p } = await app(); await subsTab(p);
  await p.getByRole('button', { name: '📄 عقد فارغ للطباعة' }).click();
  assert.equal(await p.locator('.ctp').count(), 1); assert.match(await p.locator('.ctp').innerText(), /✘ العقد غير موقّع/);
  await p.getByRole('button', { name: 'إغلاق' }).click();
  await p.getByRole('button', { name: 'بدون عقد' }).click();
  const n = +(await p.getByRole('button', { name: /طباعة عقود القائمة/ }).innerText()).match(/\d+/)[0];
  await p.getByRole('button', { name: /طباعة عقود القائمة/ }).click();
  assert.equal(await p.locator('.ctp').count(), n); assert.ok(n > 0);
});
test('F24-H3 clauses and stamp come from settings', async () => {
  const { p } = await app();
  await p.locator('.nav button', { hasText: 'الإعدادات' }).click();
  await p.getByLabel('بنود الالتزام (كل سطر بند)').fill('بند تجريبي أول\nبند تجريبي ثانٍ'); await p.getByLabel('النص في وسط الخاتم').click();
  await p.getByLabel('الخاتم على الوثيقة المطبوعة').selectOption('0');
  await p.getByRole('button', { name: '📄 معاينة عقد فارغ' }).click();
  assert.equal(await p.locator('.ctp ol li').count(), 2); assert.match(await p.locator('.ctp ol').innerText(), /بند تجريبي ثانٍ/);
  assert.equal(await p.locator('.ctp .stp').count(), 0);
});
