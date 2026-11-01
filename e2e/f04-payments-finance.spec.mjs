// F04 الدفع والمالية
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, enterReading, data, clean } from './helpers.mjs';
after(close);
const bal = page => page.evaluate(() => evs().reduce((C, x) => { const f = eff(x); return [C[0] + f[0], C[1] + f[1]]; }, [+D.cfg.oc || 0, +D.cfg.ob || 0]));
async function invoice(page) {
  await addSub(page, { name: 'أحمد', meter: 'M1' }); await enterReading(page, 1, 0, 10);
  await page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
}
test('F04-H1 cash payment goes to the cash box, bank payment to the bank', async () => {
  const { page, log } = await open(); await invoice(page);
  const a = await page.evaluate(() => tot(D.invs[0]));
  await page.getByRole('button', { name: 'تأكيد الدفع' }).first().click();
  await page.getByRole('button', { name: 'نقداً (الصندوق)' }).click();
  assert.deepEqual(await bal(page), [a, 0]);
  await page.evaluate(() => payMeth(D.invs[0].id)); await page.getByRole('button', { name: 'بنكي (الحساب البنكي)' }).click();
  assert.deepEqual(await bal(page), [0, a]); assert.ok(clean(log), JSON.stringify(log));
});
test('F04-H2 cancel payment returns the invoice to unpaid', async () => {
  const { page } = await open(); await invoice(page);
  await page.evaluate(() => { payAsk([D.invs[0].id]); payGo('c'); });
  await page.getByRole('button', { name: 'إلغاء الدفع' }).first().click();
  const d = await data(page); assert.equal(d.invs[0].paid, 0);
});
test('F04-H3 expense, deposit and withdrawal move the right accounts', async () => {
  const { page, log } = await open();
  await page.evaluate(() => { D.cfg.oc = 1000; D.cfg.ob = 0; save(); });
  const add = (t, a, lk) => page.evaluate(([t, a, lk]) => { newFin(); $('#ftp').value = t; ftc(); $('#fam').value = a; $('#fcat').value = 'اختبار'; $('#flk').checked = lk; addFin(); }, [t, a, lk]);
  await add('out', 200, false); assert.deepEqual(await bal(page), [800, 0]);
  await add('dep', 300, true); assert.deepEqual(await bal(page), [500, 300]);
  await add('wd', 100, true); assert.deepEqual(await bal(page), [600, 200]);
  assert.ok(clean(log), JSON.stringify(log));
});
test('F04-N1 zero or empty amount is refused', async () => {
  const { page, log } = await open();
  await page.evaluate(() => { newFin(); $('#fam').value = '0'; $('#fcat').value = 'x'; addFin(); });
  assert.match(log.alerts.join(), /مبلغاً صحيحاً/); assert.equal((await data(page)).fin.length, 0);
});
