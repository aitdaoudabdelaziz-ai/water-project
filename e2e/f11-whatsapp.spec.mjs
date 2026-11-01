// F11 زر واتساب: تذكير للمتأخر وتأكيد للمؤدي
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, enterReading, clean } from './helpers.mjs';
after(close);
async function setup(phone) {
  const o = await open();
  await o.page.evaluate(() => { window.__wa = []; window.open = u => { window.__wa.push(u); return null; }; });
  await addSub(o.page, { name: 'فاطمة', meter: 'W1', phone });
  await enterReading(o.page, 1, 0, 10);
  await o.page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
  return o;
}
const last = page => page.evaluate(() => window.__wa.at(-1));
test('F11-H1 unpaid invoice: reminder to 2126..., with amount and due date', async () => {
  const { page, log } = await setup('06 12-34 56 78');
  await page.getByRole('button', { name: 'واتساب' }).first().click();
  const u = await last(page); assert.match(u, /^https:\/\/wa\.me\/212612345678\?text=/);
  const t = decodeURIComponent(u.split('text=')[1]);
  const amt = await page.evaluate(() => n2(tot(D.invs[0])));
  assert.ok(t.includes('فاطمة') && t.includes(amt) && t.includes('لم تُؤدَّ'), t);
  assert.ok(clean(log), JSON.stringify(log));
});
test('F11-H2 paid invoice: confirmation message', async () => {
  const { page } = await setup('+212700000001');
  await page.evaluate(() => { payAsk([D.invs[0].id]); payGo('c'); });
  await page.getByRole('button', { name: 'واتساب' }).first().click();
  const u = await last(page); assert.match(u, /wa\.me\/212700000001\?/);
  assert.match(decodeURIComponent(u.split('text=')[1]), /نؤكد توصّلنا بأداء/);
});
test('F11-N1 no phone: clear message, nothing opened', async () => {
  const { page, log } = await setup('');
  await page.getByRole('button', { name: 'واتساب' }).first().click();
  assert.match(log.alerts.join(), /لا يوجد رقم هاتف صالح/); assert.equal(await last(page), undefined);
});
test('F11-E1 number formats', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => ['0612345678', '00212612345678', '+212 6 12 34 56 78', '0528123456', '123', '', '0033612345678'].map(waNum));
  assert.deepEqual(r, ['212612345678', '212612345678', '212612345678', '212528123456', null, null, '33612345678']);
});
test('F11-H3 quick screen shows WhatsApp after saving', async () => {
  const { page } = await open();
  await page.evaluate(() => { window.__wa = []; window.open = u => { window.__wa.push(u); }; });
  await addSub(page, { name: 'سعيد', meter: 'Q1', phone: '0611111111' });
  await page.getByRole('button', { name: '⚡ تحصيل سريع' }).click();
  await page.fill('#qk_q', 'Q1'); await page.press('#qk_q', 'Enter');
  await page.fill('#qk_o', '1'); await page.fill('#qk_n', '9');
  await page.getByRole('button', { name: 'حفظ القراءة وإصدار الفاتورة' }).click();
  await page.locator('#qk_after').getByRole('button', { name: 'واتساب' }).click();
  assert.match(await last(page), /wa\.me\/212611111111/);
});
