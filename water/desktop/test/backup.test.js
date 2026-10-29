"use strict";
const test = require("node:test"), assert = require("node:assert");
const fs = require("fs"), os = require("os"), path = require("path"), zlib = require("zlib");
const B = require("../backup.js");

const DATA = JSON.stringify({ subs: [{ id: 1, name: "محمد", meter: "1001" }], reads: { "1|2026|3": { o: 0, n: 25 } }, invs: [], cfg: {} });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "w1bk-"));

test("zip/unzip round trip with Arabic names", () => {
  const z = B.zip([{ name: "ملف.json", data: Buffer.from("مرحبا") }, { name: "b", data: Buffer.alloc(5000, 7) }]);
  const u = B.unzip(z);
  assert.equal(u["ملف.json"].toString(), "مرحبا"); assert.equal(u.b.length, 5000);
});

test("backup -> read back gives identical data", () => {
  const { buf } = B.makeBackup(DATA, { version: "1.0.0" });
  assert.equal(B.readBackup(buf, { version: "1.0.0" }).json, DATA);
});

test("tampered data is refused", () => {
  const { buf } = B.makeBackup(DATA, { version: "1.0.0" }), f = B.unzip(buf);
  const bad = B.zip([{ name: "manifest.json", data: f["manifest.json"] }, { name: "data.json", data: Buffer.from(DATA.replace("25", "99")) }]);
  assert.throws(() => B.readBackup(bad), /بصمة/);
});

test("newer version / schema / other app are refused", () => {
  assert.throws(() => B.readBackup(B.makeBackup(DATA, { version: "9.0.0" }).buf, { version: "1.0.0" }), /أحدث/);
  const f = B.unzip(B.makeBackup(DATA, { version: "1.0.0" }).buf), m = JSON.parse(f["manifest.json"]);
  for (const ch of [{ schema: 99 }, { app: "tr1" }]) {
    const z = B.zip([{ name: "manifest.json", data: Buffer.from(JSON.stringify({ ...m, ...ch })) }, { name: "data.json", data: f["data.json"] }]);
    assert.throws(() => B.readBackup(z));
  }
});

test("corrupt zip is refused", () => {
  const { buf } = B.makeBackup(DATA, {}); buf[60] ^= 0xff;
  assert.throws(() => B.readBackup(buf));
  assert.throws(() => B.readBackup(Buffer.from("hello")));
});

test("invalid JSON is never written", () => {
  assert.throws(() => B.makeBackup("{bad", {}));
});

test("save writes to both folders atomically, no temp files left", () => {
  const a = tmp(), b = tmp(), r = B.save(DATA, [a, b], { version: "1.0.0", reason: "manual" });
  assert.equal(r.saved.length, 2);
  for (const d of [a, b]) { const L = fs.readdirSync(d); assert.equal(L.length, 1); assert.ok(!L[0].includes(".tmp")); }
});

test("second folder failure is a warning, not an error", () => {
  const a = tmp(), file = path.join(tmp(), "not-a-dir"); fs.writeFileSync(file, "x");
  const r = B.save(DATA, [a, path.join(file, "sub")], { version: "1.0.0" });
  assert.equal(r.saved.length, 1); assert.equal(r.warnings.length, 1);
});

test("pruning keeps 14 daily, 6 monthly, 5 pre", () => {
  const d = tmp(), start = new Date(2026, 0, 1, 10);
  for (let i = 0; i < 200; i++) { const t = new Date(start.getTime() + i * 864e5); B.save(DATA, [d], { now: t, reason: "daily" }); }
  for (let i = 0; i < 9; i++) B.save(DATA, [d], { now: new Date(2026, 7, 1, 12, i), reason: "pre" });
  const L = B.list(d), reg = L.filter(x => x.reason === "daily"), pre = L.filter(x => x.reason === "pre");
  assert.equal(pre.length, 5);
  assert.ok(reg.length >= 14 && reg.length <= 14 + 6, "regular kept: " + reg.length);
  const months = new Set(reg.map(x => x.day.slice(0, 7))); assert.ok(months.size >= 6);
});
