// F02 القراءات ← تسجيل الفواتير
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, enterReading, data, clean } from './helpers.mjs';
after(close);

test('F02-H1 reading then "register invoices" creates the invoice with the right amount', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'أحمد', meter: 'M1' });
  await enterReading(page, 1, 10, 25);
  await page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
  const d = await data(page); assert.equal(d.invs.length, 1);
  const amount = await page.evaluate(() => tot(D.invs[0]));
  assert.equal(amount, (25 - 10) * d.cfg.price + (+d.cfg.fee || 0));
  assert.ok(clean(log), JSON.stringify(log));
});
test('F02-N1 new reading smaller than old is refused', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'أحمد', meter: 'M1' });
  await enterReading(page, 1, 50, 20);
  assert.match(log.alerts.join(), /أصغر/); assert.equal(Object.keys((await data(page)).reads).length, 0);
});
test('F02-N2 register with no readings warns and creates nothing', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'أحمد', meter: 'M1' });
  await page.locator('nav button', { hasText: 'القراءات' }).click();
  await page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
  assert.match(log.alerts.join(), /لا توجد قراءات/); assert.equal((await data(page)).invs.length, 0);
});
test('F02-E1 the next round starts from the previous new reading', async () => {
  const { page } = await open();
  await addSub(page, { name: 'أحمد', meter: 'M1' });
  await enterReading(page, 1, 10, 25);
  const r = await page.evaluate(() => R);
  await page.evaluate(r => { if (r < 3) { $('#r').value = r + 1; } else { $('#y').value = Y + 1; $('#r').value = 0; } setP(); }, r);
  assert.equal(await page.inputValue('#o1'), '25');
});
test('F02-E2 a PAID invoice keeps its amount when its reading is edited later', async () => {
  const { page } = await open();
  await addSub(page, { name: 'أحمد', meter: 'M1' });
  await enterReading(page, 1, 10, 20);
  await page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
  await page.evaluate(() => { payAsk([D.invs[0].id]); payGo('c'); });
  const before = await page.evaluate(() => tot(D.invs[0]));
  await enterReading(page, 1, null, 60);
  await page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
  const afterAmt = await page.evaluate(() => tot(D.invs[0]));
  assert.equal(afterAmt, before, 'cash already collected must not change silently');
});
test('F02-E3 deleting a subscriber does not erase money already collected', async () => {
  const { page } = await open();
  await addSub(page, { name: 'أحمد', meter: 'M1' });
  await enterReading(page, 1, 0, 10);
  await page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
  await page.evaluate(() => { payAsk([D.invs[0].id]); payGo('c'); });
  const cash = () => page.evaluate(() => evs().reduce((t, x) => t + eff(x)[0], 0));
  const before = await cash();
  await page.evaluate(() => del(D.subs[0].id));
  assert.equal(await cash(), before, 'the cash box total must stay the same');
});
