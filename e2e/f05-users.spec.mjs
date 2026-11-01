// F05 المستخدمون والدخول والصلاحيات
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, data } from './helpers.mjs';
after(close);
async function admin(page) {
  await page.locator('nav button', { hasText: 'الإعدادات' }).click();
  await page.fill('#uu', 'admin'); await page.fill('#up', 'pass1234');
  await page.getByRole('button', { name: 'إضافة مستخدم' }).click();
}
test('F05-H1 first user is admin, logout shows the login screen, login works', async () => {
  const { page, log } = await open(); await admin(page);
  assert.match(log.alerts.join(), /رمز الاسترجاع/);
  const d = await data(page); assert.equal(d.users[0].r, 'a'); assert.ok(!JSON.stringify(d.users).includes('pass1234'), 'password stored as hash');
  await page.getByRole('button', { name: 'خروج' }).click(); await page.locator('#lk').waitFor({ state: 'visible' });
  await page.fill('#lu', 'ADMIN'); await page.fill('#lp', 'pass1234'); await page.getByRole('button', { name: 'دخول' }).click();
  await page.locator('#lk').waitFor({ state: 'hidden' });
});
test('F05-N1 wrong password refused; 5 failures lock for 30 s', async () => {
  const { page, log } = await open(); await admin(page);
  await page.getByRole('button', { name: 'خروج' }).click();
  for (let i = 0; i < 6; i++) { await page.fill('#lu', 'admin'); await page.fill('#lp', 'bad'); await page.getByRole('button', { name: 'دخول' }).click(); await page.waitForTimeout(80); }
  assert.match(log.alerts.join(), /غير صحيحة/); assert.match(log.alerts.join(), /انتظر 30 ثانية/);
});
test('F05-N2 a user with "subscribers only" cannot open invoices or settings', async () => {
  const { page, log } = await open(); await admin(page);
  await page.selectOption('#ur', 'u'); await page.fill('#uu', 'clerk'); await page.fill('#up', 'abcd1234');
  await page.evaluate(() => $('#upp').querySelectorAll('input').forEach(i => i.checked = i.dataset.k === 'v0'));
  await page.getByRole('button', { name: 'إضافة مستخدم' }).click();
  await page.getByRole('button', { name: 'خروج' }).click();
  await page.fill('#lu', 'clerk'); await page.fill('#lp', 'abcd1234'); await page.getByRole('button', { name: 'دخول' }).click();
  await page.locator('#lk').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('nav button[data-t="2"]').isHidden(), true);
  assert.equal(await page.locator('nav button[data-t="4"]').isHidden(), true);
  await page.evaluate(() => go(2)); assert.match(log.alerts.join(), /ليست لديك صلاحية/);
  assert.equal(await page.locator('#t2').isHidden(), true);
});
test('F05-E1 session survives refresh in the same tab, not in a new tab', async () => {
  const { page, context } = await open(); await admin(page);
  await page.reload(); await page.waitForFunction(() => typeof D === 'object');
  assert.equal(await page.locator('#lk').isVisible(), false);
  const p2 = await context.newPage(); await p2.goto(page.url()); await p2.waitForFunction(() => typeof D === 'object');
  assert.equal(await p2.locator('#lk').isVisible(), true);
});
