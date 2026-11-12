// F22 نسخة React: استيراد وتصدير Excel للمشتركين والقراءات (نفس قواعد imp/tpl/expAll في البرنامج القديم)
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { launch, close, URL } from './helpers.mjs';
const require = createRequire(import.meta.url);
let JSZip; try { JSZip = require('jszip'); } catch { JSZip = require('/opt/npm-tools/node_modules/jszip'); }
after(close);
const RURL = URL.replace(/water\/www\/index\.html|cloud\/index\.html/, '') + 'react/';

/** ملف xlsx كما يكتبه Excel: نصوص في sharedStrings */
async function book(rows) {
  const S = [], si = v => { let i = S.indexOf(v); if (i < 0) { S.push(v); i = S.length - 1; } return i; }, L = j => String.fromCharCode(65 + j);
  const z = new JSZip(), x = '<?xml version="1.0" encoding="UTF-8"?>';
  const sheet = rows.map((r, i) => `<row r="${i + 1}">` + r.map((v, j) => v === '' ? '' : typeof v === 'number' ? `<c r="${L(j)}${i + 1}"><v>${v}</v></c>` : `<c r="${L(j)}${i + 1}" t="s"><v>${si(v)}</v></c>`).join('') + '</row>').join('');
  z.file('[Content_Types].xml', x + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  z.file('xl/workbook.xml', x + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Feuil1" sheetId="1" r:id="rId1"/></sheets></workbook>');
  z.file('xl/_rels/workbook.xml.rels', x + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  z.file('xl/sharedStrings.xml', x + '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + S.map(s => `<si><t>${s}</t></si>`).join('') + '</sst>');
  z.file('xl/worksheets/sheet1.xml', x + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`);
  return z.generateAsync({ type: 'nodebuffer' });
}
async function sheets(buf) {
  const z = await JSZip.loadAsync(buf), wb = await z.file('xl/workbook.xml').async('string');
  return [...wb.matchAll(/<sheet name="([^"]+)"/g)].map(m => m[1]);
}
async function app(tab) {
  const b = await launch(), c = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort());
  const p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto(RURL); await p.locator('.kpi').first().waitFor();
  if (tab) await p.locator('.nav button', { hasText: tab }).click();
  return { p, errs };
}
const data = p => p.evaluate(() => JSON.parse(localStorage.getItem('w1react')).data);
const round = () => { const d = new Date(); return { y: d.getFullYear(), r: Math.floor(d.getMonth() / 3) }; };

test('F22-H1 import subscribers + readings: preview first, then save; meter is the key', async () => {
  const { p, errs } = await app('المشتركون'); let D = await data(p); const { y, r } = round();
  const free = D.subs.find(s => !D.invs.some(i => i.s === s.id && i.y == y && i.r == r && i.paid));
  const locked = D.subs.find(s => D.invs.some(i => i.s === s.id && i.y == y && i.r == r && i.paid));
  const n0 = D.subs.length;
  const rows = [['الاسم الكامل', 'رقم العداد', 'رقم البطاقة الوطنية', 'الهاتف', 'العنوان', 'قديمة', 'جديدة'],
    ['مشترك من إكسل', 'XL-1', 'ab12', '0611223344', 'الدوار 3', 10, 25],
    ['', free.meter, '', '0699999999', '', 100, 140],
    ['مكرر', 'XL-1', '', '', '', '', ''],
    ['بدون عداد', '', '', '', '', '', ''],
    ['قراءة خاطئة', 'XL-2', '', '', '', 50, 20]];
  if (locked) rows.push(['', locked.meter, '', '', '', 1, 2]);
  await p.locator('label', { hasText: 'استيراد من Excel' }).locator('input').setInputFiles({ name: 'abonnes.xlsx', mimeType: 'application/octet-stream', buffer: await book(rows) });
  await p.locator('#xl-t').waitFor();
  assert.equal((await data(p)).subs.length, n0, 'nothing saved before confirm');
  const facts = await p.locator('.dlg .facts').innerText();
  assert.match(facts, /مشتركون جدد\s*2/); assert.match(facts, /قراءات مسجَّلة\s*2/);
  await p.getByRole('button', { name: 'تأكيد الاستيراد' }).click();
  await p.locator('#xl-t', { hasText: 'تم الاستيراد' }).waitFor();
  D = await data(p);
  assert.equal(D.subs.length, n0 + 2);
  const s = D.subs.find(x => x.meter === 'XL-1'); assert.equal(s.name, 'مشترك من إكسل'); assert.equal(s.cin, 'AB12'); assert.equal(s.id, D.sid - 1);
  assert.deepEqual(D.reads[s.id + '|' + y + '|' + r], { o: 10, n: 25 });
  const f = D.subs.find(x => x.id === free.id); assert.equal(f.name, free.name); assert.equal(f.phone, '0699999999');
  assert.deepEqual(D.reads[free.id + '|' + y + '|' + r], { o: 100, n: 140 });
  const s2 = D.subs.find(x => x.meter === 'XL-2'); assert.ok(s2); assert.equal(D.reads[s2.id + '|' + y + '|' + r], undefined, 'smaller new reading refused');
  if (locked) assert.notDeepEqual(D.reads[locked.id + '|' + y + '|' + r], { o: 1, n: 2 }, 'paid round stays locked');
  assert.equal(D.subs.filter(x => x.meter === 'XL-1').length, 1);
  assert.deepEqual(errs, []);
});

test('F22-H2 readings export → fill → import back: no duplicate subscribers', async () => {
  const { p, errs } = await app('القراءات'); const D0 = await data(p);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: '⬇ تصدير / نموذج القراءات' }).click()]);
  const { y, r } = round(); assert.equal(dl.suggestedFilename(), `releves-${y}-T${r + 1}.xlsx`);
  const path = await dl.path();
  await p.locator('label', { hasText: 'استيراد القراءات من Excel' }).locator('input').setInputFiles(path);
  await p.locator('#xl-t').waitFor();
  assert.match(await p.locator('.dlg .facts').innerText(), /مشتركون جدد\s*0/);
  await p.getByRole('button', { name: 'تأكيد الاستيراد' }).click(); await p.locator('#xl-t', { hasText: 'تم الاستيراد' }).waitFor();
  const D = await data(p); assert.equal(D.subs.length, D0.subs.length); assert.deepEqual(D.reads, D0.reads, 're-importing the same values changes nothing');
  assert.deepEqual(errs, []);
});

test('F22-H3 exports: subscribers list, template, and all data (4 sheets)', async () => {
  const { p, errs } = await app('المشتركون'); const fs = await import('node:fs');
  let [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: '⬇ تصدير Excel' }).click()]);
  assert.match(dl.suggestedFilename(), /^abonnes-\d{4}-\d\d-\d\d\.xlsx$/); assert.deepEqual(await sheets(fs.readFileSync(await dl.path())), ['المشتركون']);
  [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'نموذج Excel' }).click()]);
  assert.equal(dl.suggestedFilename(), 'modele-abonnes.xlsx');
  await p.locator('.nav .more-b').click(); await p.locator('.opt', { hasText: 'البيانات' }).click();
  [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: '⬇ تصدير كل البيانات إلى Excel' }).click()]);
  assert.deepEqual(await sheets(fs.readFileSync(await dl.path())), ['المشتركون', 'القراءات', 'الفواتير', 'المالية']);
  assert.deepEqual(errs, []);
});

test('F22-N1 a file without «رقم العداد» is refused with a clear message', async () => {
  const { p } = await app('المشتركون'); const msgs = []; p.removeAllListeners('dialog'); p.on('dialog', d => { msgs.push(d.message()); d.accept(); });
  await p.locator('label', { hasText: 'استيراد من Excel' }).locator('input').setInputFiles({ name: 'x.xlsx', mimeType: 'application/octet-stream', buffer: await book([['الاسم', 'الهاتف'], ['أحمد', '06']]) });
  await p.waitForTimeout(500); assert.match(msgs.join(), /رقم العداد/); assert.equal(await p.locator('#xl-t').count(), 0);
  await p.locator('label', { hasText: 'استيراد من Excel' }).locator('input').setInputFiles({ name: 'x.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('not a zip') });
  await p.waitForTimeout(500); assert.match(msgs.at(-1), /ليس ملف Excel/);
});
