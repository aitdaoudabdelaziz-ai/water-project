// F23 أمان: رابط دعوة مزيّف لا يحوّل البرنامج القديم إلى سحابة أخرى
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { launch, close, URL } from './helpers.mjs';
after(close);
const BASE = URL.replace(/water\/www\/index\.html/, '');
const evil = Buffer.from(JSON.stringify({ cfg: { apiKey: 'AIzaEVIL', projectId: 'evil-project', authDomain: 'evil.firebaseapp.com' }, admin: 'victim@example.com' })).toString('base64');
async function page() { const b = await launch(), c = await b.newContext(); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort()); return c.newPage(); }
test('F23-N1 a forged #c= link to another Firebase project is ignored by the old app', async () => {
  const p = await page(); await p.goto(BASE + 'old/cloud/#c=' + evil); await p.waitForTimeout(800);
  assert.equal(await p.evaluate(() => localStorage.getItem('wcloud_fb')), null);
  assert.ok(!(await p.url()).includes('#c='));
});
test('F23-N2 a foreign config already stored on the device is dropped', async () => {
  const p = await page(); await p.goto(BASE + 'icon-192.png');
  await p.evaluate(e => localStorage.setItem('wcloud_fb', atob(e)), evil);
  await p.goto(BASE + 'old/cloud/'); await p.waitForTimeout(800);
  assert.equal(await p.evaluate(() => localStorage.getItem('wcloud_fb')), null);
});
test('F23-H1 the association own invite link is still accepted', async () => {
  const p = await page(); await p.goto(BASE + 'old/cloud/'); await p.waitForTimeout(300);
  const own = await p.evaluate(() => { const s = [...document.scripts].map(x => x.textContent).find(t => t.includes('const DEFFB=')); const i = s.indexOf("const DEFFB=") + 12; return s.slice(i, s.indexOf(";", i)); });
  await p.goto(BASE + 'icon-192.png'); await p.goto(BASE + 'old/cloud/#c=' + Buffer.from(own).toString('base64')); await p.waitForTimeout(800);
  assert.equal(JSON.parse(await p.evaluate(() => localStorage.getItem('wcloud_fb'))).cfg.projectId, 'water-assoc');
});
