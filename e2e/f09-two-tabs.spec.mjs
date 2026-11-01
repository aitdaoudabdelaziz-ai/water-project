// F09 نافذتان مفتوحتان في نفس الوقت (نفس الجهاز، بدون سحابة)
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, data } from './helpers.mjs';
after(close);
test('F09-E1 two windows on the same device do not erase each other', async () => {
  const { page, context } = await open();
  const p2 = await context.newPage(); p2.on('dialog', d => d.accept());
  await p2.goto(page.url()); await p2.waitForFunction(() => typeof D === 'object');
  await addSub(page, { name: 'من النافذة 1', meter: 'W1' }); await data(page);
  await addSub(p2, { name: 'من النافذة 2', meter: 'W2' }); await data(p2);
  const p3 = await context.newPage(); await p3.goto(page.url()); await p3.waitForFunction(() => typeof D === 'object');
  const names = await p3.evaluate(() => D.subs.map(s => s.name));
  assert.deepEqual(names.sort(), ['من النافذة 1', 'من النافذة 2'].sort());
});
