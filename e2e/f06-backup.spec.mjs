// F06 النسخ الاحتياطي والاسترجاع
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs';
import { open, close, addSub, data, clean } from './helpers.mjs';
after(close);
test('F06-H1 full backup then restore brings the data back', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'محفوظ', meter: 'B1' });
  await page.evaluate(() => go(4));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => bkFull())]);
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
