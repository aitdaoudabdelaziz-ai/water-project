// F16 نسخة React (المرحلة 3): المالية، الإعدادات والأشطر، المستخدمون والدخول، الطباعة، والتوافق مع الأصل
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launch, close, URL } from './helpers.mjs';
after(close);
const BASE = URL.replace(/water\/www\/index\.html|cloud\/index\.html/, ''), RURL = BASE + 'react/', LURL = BASE + 'water/www/index.html';
async function app(w = 1280) {
  const b = await launch(), c = await b.newContext({ viewport: { width: w, height: 900 } }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  const p = await c.newPage(), errs = [], dialogs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await p.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await p.goto(RURL); await p.locator('.kpi').first().waitFor();
  return { c, p, errs, dialogs };
}
const data = p => p.evaluate(() => JSON.parse(localStorage.getItem('w1react')).data);
const tab = (p, n) => p.locator('.nav button', { hasText: n }).click();
const bal = D => { const ev = D.fin.map(x => ({ ...x, w: x.w || 'c' })).concat(D.invs.filter(i => i.paid).map(i => ({ t: 'in', w: i.pw || 'c', a: (i.tr ? 0 : (i.n - i.o) * i.price) + i.fee })));
  return ev.reduce((C, e) => { const f = e.t == 'in' ? (e.w == 'b' ? [0, e.a] : [e.a, 0]) : e.t == 'out' ? (e.w == 'b' ? [0, -e.a] : [-e.a, 0]) : e.t == 'dep' ? (e.lk === 0 ? [0, e.a] : [-e.a, e.a]) : (e.lk === 0 ? [0, -e.a] : [e.a, -e.a]); return [C[0] + f[0], C[1] + f[1]]; }, [+D.cfg.oc || 0, +D.cfg.ob || 0]); };
async function addFin(p, type, c, a, opts = {}) {
  await p.getByRole('button', { name: '＋ عملية جديدة' }).click();
  await p.getByRole('radio', { name: type }).click();
  await p.getByLabel('البيان').fill(c); await p.getByLabel('المبلغ (درهم)').fill(String(a));
  if (opts.lk === false) await p.getByRole('checkbox').uncheck();
  await p.getByRole('button', { name: 'إضافة العملية' }).click();
}
test('F16-H1 finance: expense and cash-to-bank deposit move the right accounts', async () => {
  const { p, errs } = await app(); await tab(p, 'المالية');
  const D0 = await data(p).catch(() => null) || await p.evaluate(() => null);
  await addFin(p, 'مصروف', 'كهرباء', 200);
  await addFin(p, 'إيداع في البنك', 'إيداع', 300);
  const D = await data(p), b = bal(D), f = D.fin.slice(-2);
  assert.equal(f[0].t, 'out'); assert.equal(f[0].w, 'c'); assert.equal(f[1].t, 'dep'); assert.equal(f[1].lk, 1);
  const shown = await p.locator('.bal div').first().locator('b').innerText();
  assert.equal(+shown.replace(/[^\d-]/g, ''), Math.round(b[0]));
  assert.deepEqual(errs, []);
});
test('F16-N1 finance: empty label or zero amount is refused; edit and delete work', async () => {
  const { p, dialogs } = await app(); await tab(p, 'المالية');
  await p.getByRole('button', { name: '＋ عملية جديدة' }).click(); await p.getByRole('button', { name: 'إضافة العملية' }).click();
  assert.match(await p.getByRole('alert').innerText(), /مبلغاً صحيحاً/); await p.keyboard.press('Escape');
  await addFin(p, 'مصروف', 'اختبار حذف', 77);
  await p.locator('.fr', { hasText: 'اختبار حذف' }).click(); await p.getByLabel('المبلغ (درهم)').fill('88'); await p.getByRole('button', { name: 'حفظ التعديل' }).click();
  let D = await data(p); assert.equal(D.fin.find(x => x.c === 'اختبار حذف').a, 88);
  await p.locator('.fr', { hasText: 'اختبار حذف' }).click(); await p.getByRole('button', { name: '🗑 حذف' }).click();
  D = await data(p); assert.equal(D.fin.some(x => x.c === 'اختبار حذف'), false); assert.match(dialogs.join(), /حذف هذه العملية/);
});
test('F16-H2 settings: new price applies to new invoices only; tiered tariff computes like the original', async () => {
  const { p } = await app(); await tab(p, 'الإعدادات');
  const old = (await data(p)).invs[0]; const oldAmt = (old.n - old.o) * old.price + old.fee;
  await p.getByLabel('ثمن المتر المكعب (درهم)').fill('7'); await p.getByLabel('الواجب الثابت لكل فاتورة (درهم)').click();
  await p.getByLabel('ثمن بالأشطر (كلما زاد الاستهلاك تغيّر الثمن)').check();
  await p.getByLabel('ثمن الشطر 1').fill('3'); await p.getByLabel('حدّ الشطر 1').click();
  await p.getByLabel('ثمن الشطر 2').fill('5'); await p.getByLabel('حدّ الشطر 1').click();
  let D = await data(p); assert.equal(D.cfg.price, 7); assert.equal(D.cfg.trOn, true); assert.deepEqual(D.cfg.tr, [{ to: 10, price: 3 }, { to: null, price: 5 }]);
  const o2 = D.invs.find(i => i.id === old.id); assert.equal((o2.n - o2.o) * o2.price + o2.fee, oldAmt);
  await tab(p, 'القراءات'); await p.locator('.rr').first().click(); await p.getByLabel('القراءة القديمة').fill('0'); await p.getByLabel('القراءة الجديدة').fill('28');
  await p.getByRole('button', { name: 'حفظ القراءة وإصدار الفاتورة' }).click();
  D = await data(p); const ni = D.invs[D.invs.length - 1]; assert.deepEqual(ni.tr, [{ to: 10, price: 3 }, { to: null, price: 5 }]);
  assert.match(await p.locator('.rs-inv').innerText(), new RegExp((120 + D.cfg.fee).toFixed(2)));
});
test('F16-H3 users: first admin gets a recovery code, logout, wrong password refused, login works', async () => {
  const { p } = await app(); await tab(p, 'الإعدادات');
  await p.getByRole('button', { name: '＋ مستخدم' }).click(); await p.getByLabel('رمز الدخول').fill('Admin'); await p.getByLabel('كلمة السر').fill('pass1234');
  await p.getByRole('button', { name: 'إضافة المستخدم' }).click();
  assert.match(await p.locator('.code').innerText(), /^[A-Z2-9]{6}$/); await p.getByRole('button', { name: 'حفظتُه' }).click();
  const D = await data(p); assert.equal(D.users[0].u, 'admin'); assert.equal(D.users[0].r, 'a'); assert.ok(!JSON.stringify(D.users).includes('pass1234'));
  await p.evaluate(() => sessionStorage.clear()); await p.reload(); await p.getByRole('button', { name: 'دخول' }).waitFor();
  await p.getByLabel('رمز الدخول').fill('admin'); await p.getByLabel('كلمة السر').fill('nope'); await p.getByRole('button', { name: 'دخول' }).click();
  assert.match(await p.getByRole('alert').innerText(), /غير صحيحة/);
  await p.getByLabel('كلمة السر').fill('pass1234'); await p.getByRole('button', { name: 'دخول' }).click(); await p.locator('.kpi').first().waitFor();
});
test('F16-H4 a user with "subscribers only" sees only that section and cannot edit', async () => {
  const { p } = await app(); await tab(p, 'الإعدادات');
  await p.getByRole('button', { name: '＋ مستخدم' }).click(); await p.getByLabel('رمز الدخول').fill('admin'); await p.getByLabel('كلمة السر').fill('pass1234'); await p.getByRole('button', { name: 'إضافة المستخدم' }).click(); await p.getByRole('button', { name: 'حفظتُه' }).click();
  await p.getByRole('button', { name: '＋ مستخدم' }).click(); await p.getByLabel('رمز الدخول').fill('clerk'); await p.getByLabel('كلمة السر').fill('abcd1234');
  for (const l of ['الاطلاع على القراءات', 'الاطلاع على الفواتير', 'الإضافة والتعديل', 'الطباعة والتقارير']) await p.getByLabel(l).uncheck();
  await p.getByRole('button', { name: 'إضافة المستخدم' }).click();
  await p.evaluate(() => sessionStorage.clear()); await p.reload();
  await p.getByLabel('رمز الدخول').fill('clerk'); await p.getByLabel('كلمة السر').fill('abcd1234'); await p.getByRole('button', { name: 'دخول' }).click();
  await p.locator('.toolbar').waitFor();
  assert.deepEqual((await p.locator('.nav button:visible span').allInnerTexts()), ['المشتركون']);
  await p.locator('.row-b').first().click(); assert.equal(await p.getByRole('button', { name: /تسجيل قراءة/ }).count(), 0);
});
test('F16-H5 print: same invoice template as the original, preview then print', async () => {
  const { p } = await app(); await tab(p, 'الفواتير'); await p.locator('.inv-r').first().click();
  const num = (await p.locator('#is-t').innerText()).replace('فاتورة ', '');
  await p.getByRole('button', { name: /طباعة الفاتورة|طباعة الوصل/ }).click();
  const pg = p.locator('.pv .pg'); await pg.first().waitFor();
  assert.match(await pg.first().textContent(), new RegExp(num.replace('/', '\\/'))); assert.match(await pg.first().textContent(), /فاتورة الماء الصالح للشرب/);
  await p.locator('.pv-bar').getByRole('button', { name: '🖨 طباعة' }).click(); assert.equal(await p.evaluate(() => window.__printed), 1);
  await p.locator('.pv-bar').getByRole('button', { name: 'إغلاق' }).click(); assert.equal(await p.locator('.pv').count(), 0);
});
test('F16-C1 a user created in React can log in to the original app (same password hashing)', async () => {
  const { c, p } = await app(); await tab(p, 'الإعدادات');
  await p.getByRole('button', { name: '＋ مستخدم' }).click(); await p.getByLabel('رمز الدخول').fill('boss'); await p.getByLabel('كلمة السر').fill('Secret99'); await p.getByRole('button', { name: 'إضافة المستخدم' }).click(); await p.getByRole('button', { name: 'حفظتُه' }).click();
  const D = await data(p);
  const l = await c.newPage(); l.on('dialog', d => d.accept());
  await l.addInitScript(d => { localStorage.setItem('wcloud_mode', 'local'); localStorage.setItem('w1', JSON.stringify(d)); sessionStorage.clear(); }, D);
  await l.goto(LURL); await l.locator('#lk').waitFor({ state: 'visible' });
  await l.fill('#lu', 'boss'); await l.fill('#lp', 'Secret99'); await l.getByRole('button', { name: 'دخول' }).click();
  await l.locator('#lk').waitFor({ state: 'hidden' });
});

test('F16-C2 printed invoice is pixel-for-pixel the same layout as the original app', async () => {
  const { c, p } = await app(1000);
  const D = await data(p), i = D.invs.find(x => x.paid);
  await p.evaluate(id => { window.__id = id; }, i.id);
  await tab(p, 'الفواتير'); await p.getByLabel('الحالة').selectOption('1'); await p.locator('.inv-r', { hasText: i.num }).click();
  await p.getByRole('button', { name: /طباعة الوصل/ }).click(); await p.locator('.pv .pg').first().waitFor();
  const rt = await p.locator('.pv .pg').first().innerText(), rb = await p.locator('.pv .pg').first().boundingBox();
  const l = await c.newPage(); l.on('dialog', d => d.accept());
  await l.addInitScript(d => { localStorage.setItem('wcloud_mode', 'local'); localStorage.setItem('w1', JSON.stringify(d)); }, D);
  await l.goto(LURL); await l.waitForFunction(() => typeof showInv === 'function'); await l.evaluate(id => showInv([id]), i.id);
  const lt = await l.locator('#pp .pg').first().innerText(), lb = await l.locator('#pp .pg').first().boundingBox();
  assert.equal(rt.replace(/\s+/g, ' ').trim(), lt.replace(/\s+/g, ' ').trim()); assert.equal(Math.round(rb.width), Math.round(lb.width)); assert.equal(Math.round(rb.height), Math.round(lb.height));
});
test('F16-C3 thermal payment receipt: same content as the original, 58 mm option, page sized to the ticket', async () => {
  const { c, p } = await app(900);
  const D = await data(p), i = D.invs.find(x => x.paid);
  await tab(p, 'الفواتير'); await p.getByLabel('الحالة').selectOption('1'); await p.locator('.inv-r', { hasText: i.num }).click();
  await p.getByRole('button', { name: 'وصل حراري للأداء' }).click(); await p.locator('.tkt').first().waitFor();
  const rt = await p.locator('.tkt').first().innerText();
  assert.match(rt, /وصل أداء - فاتورة الماء/); assert.match(rt, /✔ مدفوعة/);
  const l = await c.newPage(); l.on('dialog', d => d.accept());
  await l.addInitScript(d => { localStorage.setItem('wcloud_mode', 'local'); localStorage.setItem('w1', JSON.stringify(d)); }, D);
  await l.goto(LURL); await l.waitForFunction(() => typeof thInv === 'function'); await l.evaluate(id => thInv([id]), i.id);
  assert.equal(rt.replace(/\s+/g, ' ').trim(), (await l.locator('#tkw .tkt').first().innerText()).replace(/\s+/g, ' ').trim());
  await p.getByLabel('الصيغة').selectOption('58');
  assert.equal(Math.round((await p.locator('.tkt').first().boundingBox()).width), Math.round(58 * 96 / 25.4));
  assert.deepEqual((await data(p)).cfg.th, { fmt: '58', w: 58, pad: 3, fs: 10, logo: 1, bar: 1 });
  await p.locator('.tkb').getByRole('button', { name: 'طباعة' }).click();
  assert.equal(await p.evaluate(() => window.__printed), 1); assert.match(await p.evaluate(() => document.getElementById('thpg').textContent), /@page\{size:58mm \d+mm;margin:0\}/);
});
