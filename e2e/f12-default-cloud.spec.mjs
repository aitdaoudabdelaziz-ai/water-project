// F12 جهاز جديد: يتصل بسحابة الجمعية مباشرة بدون شاشة «ربط البرنامج بالسحابة»
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { launch, close, URL } from './helpers.mjs';
after(close);
for (const u of [URL, URL.replace('water/www/index.html', 'old/cloud/index.html')])
  test('F12-H1 fresh device goes to cloud login, not setup: ' + u.split('8765/')[1], async () => {
    const b = await launch(); const ctx = await b.newContext();
    await ctx.route(/gstatic|googleapis|firebase|cdnjs/, r => r.abort());
    const page = await ctx.newPage(); await page.goto(u);
    await page.waitForFunction(() => typeof D === 'object'); await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => window.__cl), true);
    assert.equal(await page.locator('#cl_setup').isVisible(), false, 'setup screen must not show');
    await ctx.close();
  });
test('F12-H2 a device set to "local" stays local', async () => {
  const b = await launch(); const ctx = await b.newContext();
  await ctx.addInitScript(() => localStorage.setItem('wcloud_mode', 'local'));
  const page = await ctx.newPage(); await page.goto(URL); await page.waitForFunction(() => typeof D === 'object');
  assert.equal(await page.evaluate(() => window.__cl), false); await ctx.close();
});
