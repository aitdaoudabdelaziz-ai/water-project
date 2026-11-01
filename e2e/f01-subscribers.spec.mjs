// F01 المشتركون: إضافة، تعديل، بحث، تكرار العداد، حذف
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, tab, data, clean } from './helpers.mjs';
after(close);

test('F01-H1 add a subscriber, it is saved and listed', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'أحمد العلوي', meter: 'M-100', phone: '0600000000' });
  await assert.doesNotReject(page.getByText('أحمد العلوي').first().waitFor());
  const d = await data(page); assert.equal(d.subs.length, 1); assert.equal(d.subs[0].meter, 'M-100');
  assert.ok(clean(log), JSON.stringify(log));
});
test('F01-N1 empty name or meter is refused', async () => {
  const { page, log } = await open();
  await addSub(page, { name: '', meter: 'M1' });
  assert.match(log.alerts.join(), /إجباريان/); assert.equal((await data(page)).subs.length, 0);
});
test('F01-N2 duplicate meter is refused', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'أ', meter: 'M1' });
  await addSub(page, { name: 'ب', meter: 'M1' });
  assert.match(log.alerts.join(), /موجود مسبقاً/); assert.equal((await data(page)).subs.length, 1);
});
test('F01-E1 long name, emoji and HTML are stored as text, not run', async () => {
  const { page, log } = await open();
  const nm = '<img src=x onerror=window.__x=1>' + 'عبد الرحمن '.repeat(6) + '💧é';
  await addSub(page, { name: nm, meter: 'M2' });
  assert.equal(await page.evaluate(() => window.__x), undefined);
  assert.equal((await data(page)).subs[0].name, nm.trim());
  assert.ok(clean(log), JSON.stringify(log));
});
test('F01-H2 search filters by name and by meter', async () => {
  const { page } = await open();
  await addSub(page, { name: 'سعيد', meter: 'A1' }); await addSub(page, { name: 'خديجة', meter: 'B2' });
  await page.fill('#sq', 'B2'); await page.waitForTimeout(400);
  const t = await page.locator('#sl').innerText(); assert.ok(t.includes('خديجة') && !t.includes('سعيد'));
});
test('F01-H3 edit keeps the same id; delete removes subscriber', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'قديم', meter: 'E1' });
  await page.evaluate(() => ed(D.subs[0].id)); await page.fill('#n', 'جديد');
  await page.locator('#msub').getByRole('button', { name: 'حفظ' }).click();
  let d = await data(page); assert.equal(d.subs.length, 1); assert.equal(d.subs[0].name, 'جديد');
  await page.evaluate(() => del(D.subs[0].id));
  d = await data(page); assert.equal(d.subs.length, 0); assert.ok(clean(log));
});
