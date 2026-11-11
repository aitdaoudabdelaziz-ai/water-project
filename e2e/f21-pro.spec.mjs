// F21 نسخة البيع على البرنامج الجديد: بدون هوية الفتح، 15 يوماً تجريبية، وكود تفعيل بنفس مولّد الأكواد الحالي
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process'; import { createHash } from 'node:crypto';
import { launch, close, URL } from './helpers.mjs';
after(close);
const SK = '00112233445566778899aabbccddeeff', ROOT = new globalThis.URL('..', import.meta.url).pathname;
const PURL = URL.replace(/water\/www\/index\.html/, '') + 'e2e/.pro/';
// نفس معادلة keygen-water-SECRET.html
const code = id => createHash('sha256').update(SK + '|' + id.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex').slice(0, 12).toUpperCase().match(/.{4}/g).join('-');
before(() => { execFileSync('node', ['build.mjs'], { cwd: ROOT + 'react-src', env: { ...process.env, PRO: '1', OUT: ROOT + 'e2e/.pro', WP_SK: SK, WP_SELLER: '{name:"البائع",phone:"0612345678",price:"500 درهم"}' } }); });
async function app(init) {
  const b = await launch(), c = await b.newContext({ viewport: { width: 390, height: 844 } }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  if (init) await c.addInitScript(init);
  const p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto(PURL); await p.locator('.kpi').first().waitFor(); return { p, errs };
}
const more = async (p, n) => { await p.locator('.nav .more-b').click(); await p.locator('.dlg .opt', { hasText: n }).click(); };
test('F21-H1 starts empty, unbranded, with 15 trial days and no cloud', async () => {
  const { p, errs } = await app();
  assert.match(await p.locator('.lic-bar').innerText(), /متبقي 15 يوماً/);
  const txt = await p.locator('body').innerText(); assert.doesNotMatch(txt, /الفتح|أقايغان|طاطا/);
  assert.equal(await p.title(), 'برنامج تدبير الماء الصالح للشرب');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('w1react')).data.subs.length), 0);
  await more(p, 'البيانات'); assert.equal(await p.getByRole('heading', { name: /سحابة/ }).count(), 0);
  assert.deepEqual(errs, []);
});
test('F21-H2 the existing keygen code activates; wrong code refused; stays active after reload', async () => {
  const { p } = await app();
  await p.locator('.lic-bar button').click(); const id = (await p.locator('.lic-id').innerText()).trim();
  assert.match(id, /^P[A-Z0-9]{3}-[A-Z0-9]{4}$/);
  await p.getByLabel('كود التفعيل').fill('AAAA-BBBB-CCCC'); await p.getByRole('button', { name: '✓ تفعيل' }).click();
  assert.match(await p.getByRole('alert').innerText(), /غير صحيح/);
  await p.getByLabel('كود التفعيل').fill(code(id).toLowerCase().replace(/-/g, ' ')); await p.getByRole('button', { name: '✓ تفعيل' }).click();
  await p.getByText('هذه النسخة مفعّلة بشكل دائم').waitFor();
  await p.reload(); await p.locator('.kpi').first().waitFor(); assert.equal(await p.locator('.lic-bar').count(), 0);
  await more(p, 'الإعدادات'); assert.match(await p.locator('.panel', { hasText: 'الترخيص' }).innerText(), /مفعّل/);
});
test('F21-N1 trial over: the app is locked until activation, backup still downloadable', async () => {
  const { p } = await app(() => { if (!localStorage.getItem('wplic')) localStorage.setItem('wplic', JSON.stringify({ id: 'PTST-AB12', start: Date.now() - 16 * 864e5, seen: Date.now(), code: '' })); });
  await p.getByText('انتهت المدة التجريبية', { exact: true }).first().waitFor();
  await p.keyboard.press('Escape'); assert.equal(await p.locator('.lic-dlg').count(), 1);
  assert.equal(await p.getByRole('button', { name: /تحميل نسخة احتياطية/ }).count(), 1);
  await p.getByLabel('كود التفعيل').fill(code('PTST-AB12')); await p.getByRole('button', { name: '✓ تفعيل' }).click();
  await p.getByText('هذه النسخة مفعّلة بشكل دائم').waitFor(); await p.waitForTimeout(1800); assert.equal(await p.locator('.lic-dlg').count(), 0);
});
test('F21-N2 clearing the licence keys does not restart the trial (start kept with the data)', async () => {
  const { p } = await app(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('wplic', JSON.stringify({ id: 'PTST-CD34', start: Date.now() - 10 * 864e5, seen: Date.now(), code: '' })); } });
  await p.locator('.lic-bar').waitFor(); assert.match(await p.locator('.lic-bar').innerText(), /متبقي 5 أيام/);
  await p.evaluate(() => { localStorage.removeItem('wplic'); localStorage.removeItem('wpt'); }); await p.reload(); await p.locator('.lic-bar').waitFor();
  assert.match(await p.locator('.lic-bar').innerText(), /متبقي 5 أيام/);
});
test('F21-E1 the AlFath site has no licence bar', async () => {
  const b = await launch(), c = await b.newContext(); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort()); const p = await c.newPage();
  await p.goto(URL.replace(/water\/www\/index\.html/, '') + 'react/'); await p.locator('.kpi').first().waitFor();
  assert.equal(await p.locator('.lic-bar').count(), 0);
});
