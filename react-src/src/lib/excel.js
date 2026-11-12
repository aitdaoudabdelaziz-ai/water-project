// ملفات Excel (.xlsx) بدون أنترنت: كتابة وقراءة بمكتبة JSZip (مُضمَّنة في البرنامج)
// تعوّض مكتبة SheetJS التي كان البرنامج القديم يحمّلها من الأنترنت.
import JSZip from 'jszip';

const xe = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
const colL = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'http://schemas.openxmlformats.org/';

function sheetXml(A) {
  const w = (A[0] || []).map((_, j) => Math.min(45, Math.max(8, ...A.map(r => String(r[j] ?? '').length + 2))));
  const cell = (v, i, j) => { const r = colL(j) + (i + 1), st = i === 0 ? ' s="1"' : '';
    if (typeof v === 'number' && isFinite(v)) return `<c r="${r}"${st}><v>${v}</v></c>`;
    if (v === '' || v == null) return '';
    return `<c r="${r}" t="inlineStr"${st}><is><t xml:space="preserve">${xe(v)}</t></is></c>`; };
  return XML + `<worksheet xmlns="${NS}spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    + (w.length ? '<cols>' + w.map((x, j) => `<col min="${j + 1}" max="${j + 1}" width="${x}" customWidth="1"/>`).join('') + '</cols>' : '')
    + '<sheetData>' + A.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => cell(v, i, j)).join('')}</row>`).join('') + '</sheetData></worksheet>';
}

/** ينشئ ملف xlsx. sheets = [[اسم الورقة، صفوف], ...] — الصف الأول هو الرأس */
export async function xlsxBlob(sheets) {
  const z = new JSZip(), n = sheets.length;
  z.file('[Content_Types].xml', XML + `<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
    + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>');
  z.file('_rels/.rels', XML + `<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file('xl/workbook.xml', XML + `<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets>`
    + sheets.map(([nm], i) => `<sheet name="${xe(String(nm).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>');
  z.file('xl/_rels/workbook.xml.rels', XML + `<Relationships xmlns="${NS}package/2006/relationships">`
    + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
    + `<Relationship Id="rId${n + 1}" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file('xl/styles.xml', XML + `<styleSheet xmlns="${NS}spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F2B44"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  sheets.forEach(([, A], i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(A)));
  return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** يحفظ الملف (نفس طريقة تحميل النسخ الاحتياطية في البرنامج).
 *  اسم الملف بحروف لاتينية: المتصفح يحذف الأسماء العربية من التحميل. */
export async function saveXlsx(name, sheets) {
  try {
    const b = await xlsxBlob(sheets), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name + '.xlsx'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  } catch (e) { alert('تعذر إنشاء ملف Excel: ' + e.message); }
}

function parseCsv(t) {
  t = t.replace(/^﻿/, ''); const l0 = t.split('\n')[0], sep = (l0.match(/;/g) || []).length >= (l0.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { row.push(f); f = ''; } else if (ch === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; } else f += ch; }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

/** يقرأ كل أوراق ملف xlsx (أو csv) ← [{ name, rows }] */
export async function readBook(file) {
  if (/\.(csv|txt)$/i.test(file.name)) return [{ name: file.name, rows: parseCsv(await file.text()) }];
  if (/\.xls$/i.test(file.name)) throw new Error('صيغة xls القديمة غير مدعومة. افتح الملف في Excel واحفظه بصيغة xlsx.');
  let z; try { z = await JSZip.loadAsync(await file.arrayBuffer()); } catch { throw new Error('الملف ليس ملف Excel صالحاً (xlsx)'); }
  const X = async p => { const f = z.file(p); return f ? new DOMParser().parseFromString(await f.async('string'), 'application/xml') : null; };
  const wb = await X('xl/workbook.xml'); if (!wb) throw new Error('الملف ليس ملف Excel صالحاً (xlsx)');
  const rels = await X('xl/_rels/workbook.xml.rels'), R = {};
  if (rels) for (const r of rels.getElementsByTagName('Relationship')) R[r.getAttribute('Id')] = r.getAttribute('Target');
  const ss = await X('xl/sharedStrings.xml'), SS = ss ? [...ss.getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  const ci = r => { let n = 0; for (const ch of r.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const out = [];
  for (const s of wb.getElementsByTagName('sheet')) {
    const t = R[s.getAttribute('r:id')] || 'worksheets/sheet' + (out.length + 1) + '.xml';
    const sh = await X(t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '')); if (!sh) continue;
    const rows = [];
    for (const row of sh.getElementsByTagName('row')) {
      const o = [], ri = (+row.getAttribute('r') || rows.length + 1) - 1;
      for (const c of row.getElementsByTagName('c')) { const ty = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], j = c.getAttribute('r') ? ci(c.getAttribute('r')) : o.length;
        o[j] = ty === 's' ? SS[+v.textContent] : ty === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : v ? (ty === 'str' || ty === 'b' || ty === 'e' ? v.textContent : +v.textContent) : ''; }
      while (rows.length < ri) rows.push([]);
      rows[ri] = Array.from(o, x => x ?? '');
    }
    out.push({ name: s.getAttribute('name'), rows });
  }
  return out;
}
