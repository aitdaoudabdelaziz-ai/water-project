// F06 النسخ الاحتياطي والاسترجاع
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs';
import { open, close, addSub, data, clean } from './helpers.mjs';
after(close);
test('F06-H1 full backup then restore brings the data back', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'محفوظ', meter: 'B1' });
  await page.evaluate(() => go(4));
  page.evaluate(() => bkFull()); await page.locator('#ek_w').waitFor();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'حفظ بدون كلمة سر' }).click()]);
  const f = await dl.path(); const j = JSON.parse(fs.readFileSync(f, 'utf8')); assert.equal(j.subs[0].name, 'محفوظ');
  await page.evaluate(() => rmSubs(new Set(D.subs.map(s => s.id))));
  assert.equal((await data(page)).subs.length, 0);
  await Promise.all([page.waitForEvent('load'), page.setInputFiles('#fr', f)]);
  await page.waitForFunction(() => typeof D === 'object' && D.subs.length === 1);
  assert.ok(clean(log), JSON.stringify(log));
});
test('F06-N1 a wrong file is refused and nothing changes', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'باق', meter: 'B2' });
  await page.setInputFiles('#fr', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await page.waitForTimeout(300);
  assert.match(log.alerts.join(), /غير صالح/); assert.equal((await data(page)).subs.length, 1);
});

test('F06-H2 encrypted backup: file is unreadable, restore needs the right password', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'سري جداً', meter: 'S1' });
  await page.evaluate(() => { const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { window.__dn = this.download; return c.apply(this, arguments) } });
  page.evaluate(() => bkFull()); await page.locator('#ek_w').waitFor();
  await page.fill('#ek_p', 'abc'); await page.getByRole('button', { name: 'تشفير وحفظ' }).click();
  assert.match(await page.locator('#ek_e').innerText(), /قصيرة/);
  await page.fill('#ek_p', 'Fath2026!'); await page.fill('#ek_p2', 'Fath2026?'); await page.getByRole('button', { name: 'تشفير وحفظ' }).click();
  assert.match(await page.locator('#ek_e').innerText(), /غير متطابقتين/);
  await page.fill('#ek_p2', 'Fath2026!');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'تشفير وحفظ' }).click()]);
  assert.match(await page.evaluate(() => window.__dn), /مشفرة\.json$/);
  const f = await dl.path(), raw = fs.readFileSync(f, 'utf8'), j = JSON.parse(raw);
  assert.equal(j.enc, 'alfath-aes-gcm-v1'); assert.ok(!raw.includes('سري جداً') && !raw.includes('S1'));
  await page.evaluate(() => rmSubs(new Set(D.subs.map(s => s.id))));
  await page.setInputFiles('#fr', f); await page.locator('#ek_w').waitFor();
  await page.fill('#ek_p', 'wrong-pass'); await page.getByRole('button', { name: 'فتح' }).click();
  await page.locator('#ek_w').waitFor(); assert.match(log.alerts.join(), /كلمة السر غير صحيحة/);
  await page.fill('#ek_p', 'Fath2026!');
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'فتح' }).click()]);
  await page.waitForFunction(() => typeof D === 'object' && D.subs.length === 1);
  assert.equal(await page.evaluate(() => D.subs[0].name), 'سري جداً');
  assert.ok(clean(log), JSON.stringify(log));
});
test('F06-N2 cancelling the password window saves nothing', async () => {
  const { page } = await open();
  let got = false; page.on('download', () => got = true);
  page.evaluate(() => bkFull()); await page.locator('#ek_w').waitFor();
  await page.getByRole('button', { name: 'إلغاء' }).click(); await page.waitForTimeout(300);
  assert.equal(got, false); assert.equal(await page.evaluate(() => !!D.lastBk), false);
});
