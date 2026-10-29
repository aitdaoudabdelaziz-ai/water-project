// محرك النسخ الاحتياطي لسطح المكتب (بدون مكتبات خارجية)
// ZIP (deflate) + manifest.json مع بصمة SHA-256، كتابة ذرّية، وتنظيف تلقائي.
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib"), crypto = require("crypto");

const APP = "w1", SCHEMA = 1;
const KEEP = { daily: 14, monthly: 6, pre: 5 };

// ---------- ZIP ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zip(files) { // files: [{name, data:Buffer}]
  const parts = [], cen = []; let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8"), raw = f.data, comp = zlib.deflateRawSync(raw, { level: 9 }), crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(0, 10); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(0, 12); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    cen.push(ch, name);
    off += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(cen), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

function unzip(buf) { // -> {name: Buffer}
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("ليس ملف zip صالحاً");
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const out = {};
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("ملف zip تالف");
    const meth = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), cs = buf.readUInt32LE(p + 20),
      nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nl).toString("utf8");
    const lnl = buf.readUInt16LE(lo + 26), lxl = buf.readUInt16LE(lo + 28), ds = lo + 30 + lnl + lxl;
    const comp = buf.slice(ds, ds + cs), data = meth === 8 ? zlib.inflateRawSync(comp) : meth === 0 ? comp : null;
    if (!data) throw new Error("طريقة ضغط غير مدعومة");
    if (crc32(data) !== crc) throw new Error("فشل التحقق CRC للملف " + name);
    out[name] = data; p += 46 + nl + xl + cl;
  }
  return out;
}

// ---------- backups ----------
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const pad = x => String(x).padStart(2, "0");
const stamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const NAME_RX = /^w1-(\d{4}-\d{2}-\d{2})_(\d{6})-([a-z]+)\.zip$/;

function writeAtomic(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid + "-" + Date.now();
  const fd = fs.openSync(tmp, "w"); try { fs.writeSync(fd, buf); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}

function makeBackup(json, { version, reason = "manual", now = new Date() } = {}) {
  const data = Buffer.from(json, "utf8");
  JSON.parse(json); // must be valid
  const manifest = { app: APP, schema: SCHEMA, version, reason, at: now.toISOString(), size: data.length, sha256: sha(data) };
  return { buf: zip([{ name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 1)) }, { name: "data.json", data }]), manifest };
}

function cmpVer(a, b) { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; }

function readBackup(buf, { version } = {}) {
  const f = unzip(buf);
  if (!f["manifest.json"] || !f["data.json"]) throw new Error("النسخة ناقصة (manifest/data)");
  const m = JSON.parse(f["manifest.json"].toString("utf8"));
  if (m.app !== APP) throw new Error("هذه النسخة ليست من برنامج الماء");
  if (m.schema > SCHEMA) throw new Error("النسخة من صيغة أحدث، حدّث البرنامج أولاً");
  if (version && m.version && cmpVer(m.version, version) > 0) throw new Error("النسخة من إصدار أحدث (" + m.version + ")، حدّث البرنامج أولاً");
  if (sha(f["data.json"]) !== m.sha256) throw new Error("بصمة التحقق غير مطابقة: الملف تالف أو معدَّل");
  const json = f["data.json"].toString("utf8"), d = JSON.parse(json);
  if (!d || !Array.isArray(d.subs) || typeof d.reads !== "object") throw new Error("محتوى البيانات غير صالح");
  return { manifest: m, json };
}

function list(dir) {
  try { return fs.readdirSync(dir).map(n => { const m = NAME_RX.exec(n); return m && { name: n, file: path.join(dir, n), day: m[1], time: m[2], reason: m[3] }; }).filter(Boolean).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time)); }
  catch (e) { return []; }
}

function prune(dir, keep = KEEP) {
  const L = list(dir), keepSet = new Set();
  const pre = L.filter(x => x.reason === "pre"); pre.slice(-keep.pre).forEach(x => keepSet.add(x.name));
  const reg = L.filter(x => x.reason !== "pre");
  const byDay = new Map(); reg.forEach(x => byDay.set(x.day, x)); // last of each day
  [...byDay.values()].slice(-keep.daily).forEach(x => keepSet.add(x.name));
  const byMon = new Map(); reg.forEach(x => byMon.set(x.day.slice(0, 7), x));
  [...byMon.values()].slice(-keep.monthly).forEach(x => keepSet.add(x.name));
  const removed = [];
  L.forEach(x => { if (!keepSet.has(x.name)) { try { fs.unlinkSync(x.file); removed.push(x.name); } catch (e) {} } });
  return removed;
}

function save(json, dirs, opts = {}) {
  const now = opts.now || new Date(), { buf, manifest } = makeBackup(json, { ...opts, now });
  const name = `w1-${stamp(now)}-${opts.reason || "manual"}.zip`, saved = [], warnings = [];
  for (const d of dirs.filter(Boolean)) {
    try { writeAtomic(path.join(d, name), buf); readBackup(fs.readFileSync(path.join(d, name)), {}); prune(d, opts.keep); saved.push(path.join(d, name)); }
    catch (e) { warnings.push(d + ": " + e.message); }
  }
  if (!saved.length) throw new Error(warnings.join(" | ") || "لا يوجد مجلد للحفظ");
  return { name, saved, warnings, manifest };
}

module.exports = { zip, unzip, crc32, makeBackup, readBackup, save, list, prune, writeAtomic, cmpVer, KEEP, APP, SCHEMA };
