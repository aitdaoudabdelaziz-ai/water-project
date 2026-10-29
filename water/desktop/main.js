"use strict";
const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Menu } = require("electron");
const fs = require("fs"), path = require("path"), B = require("./backup.js");

const VERSION = app.getVersion();
const CFG = () => path.join(app.getPath("userData"), "desk-config.json");
const readCfg = () => { try { return JSON.parse(fs.readFileSync(CFG(), "utf8")); } catch (e) { return {}; } };
const writeCfg = c => B.writeAtomic(CFG(), Buffer.from(JSON.stringify(c, null, 1)));
const dir1 = () => path.join(app.getPath("documents"), "AlFath-Water-Backups");
const dirs = () => [dir1(), readCfg().dir2].filter(Boolean);

let win = null, closing = false, last = readCfg().last || null;

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

// قراءة بيانات البرنامج من الصفحة (مع المرفقات)
const GET = `(async()=>{try{flush()}catch(e){};let F=[];try{F=await flPack()}catch(e){};let o=Object.assign({},D);if(F.length)o.__files=F;return JSON.stringify(o)})()`;
async function snapshot(reason) {
  if (!win || win.isDestroyed()) throw new Error("النافذة غير متاحة");
  const json = await win.webContents.executeJavaScript(GET, true);
  const r = B.save(json, dirs(), { version: VERSION, reason });
  last = { at: r.manifest.at, reason, file: r.saved[0] };
  const c = readCfg(); c.last = last; c.lastDay = new Date().toDateString(); writeCfg(c);
  return r;
}
function status() {
  return { version: VERSION, last, count: B.list(dir1()).length, dir1: dir1(), dir2: readCfg().dir2 || "" };
}
async function dailyCheck() {
  if (readCfg().lastDay === new Date().toDateString()) return;
  try { await snapshot("daily"); } catch (e) { console.error("daily backup:", e.message); }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 860, minWidth: 380, minHeight: 500, show: false,
    title: "جمعية الفتح - تدبير الماء", icon: path.join(__dirname, "build", "icon.png"), backgroundColor: "#EDF2E6",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, "app", "index.html"));
  win.once("ready-to-show", () => { win.maximize(); win.show(); });
  win.webContents.on("did-finish-load", () => setTimeout(dailyCheck, 4000));
  // الروابط الخارجية تفتح في المتصفح
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file:")) { e.preventDefault(); shell.openExternal(url); } });
  // F5 / Ctrl+R تحديث، Ctrl+Shift+I أدوات المطوّر، Ctrl +/- تكبير
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    const k = i.key.toLowerCase();
    if (k === "f5" || (i.control && k === "r")) win.webContents.reload();
    else if (i.control && i.shift && k === "i") win.webContents.toggleDevTools();
    else if (i.control && (k === "=" || k === "+")) win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5);
    else if (i.control && k === "-") win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5);
    else if (i.control && k === "0") win.webContents.setZoomLevel(0);
  });
  // نسخة عند الإغلاق
  win.on("close", async e => {
    if (closing) return;
    e.preventDefault(); closing = true;
    try { await Promise.race([snapshot("close"), new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 8000))]); }
    catch (err) { console.error("close backup:", err.message); }
    win.destroy();
  });
}

ipcMain.handle("desk:status", () => status());
ipcMain.handle("desk:backupNow", async () => {
  try { const r = await snapshot("manual"); return { ok: 1, warnings: r.warnings, status: status() }; }
  catch (e) { return { error: e.message }; }
});
ipcMain.handle("desk:restore", async () => {
  const r = await dialog.showOpenDialog(win, { title: "اختر ملف النسخة الاحتياطية", defaultPath: dir1(), filters: [{ name: "Backup", extensions: ["zip", "json"] }], properties: ["openFile"] });
  if (r.canceled || !r.filePaths[0]) return { canceled: 1 };
  let json, info = "";
  try {
    const f = r.filePaths[0], buf = fs.readFileSync(f);
    if (/\.json$/i.test(f)) { json = buf.toString("utf8"); const d = JSON.parse(json); if (!Array.isArray(d.subs) || typeof d.reads !== "object") throw new Error("ملف غير صالح"); }
    else { const b = B.readBackup(buf, { version: VERSION }); json = b.json; info = new Date(b.manifest.at).toLocaleString("ar-MA"); }
  } catch (e) { return { error: e.message }; }
  const c = await dialog.showMessageBox(win, { type: "warning", buttons: ["استرجاع", "إلغاء"], defaultId: 1, cancelId: 1, title: "استرجاع", message: "استبدال كل البيانات الحالية بهذه النسخة؟", detail: (info ? "تاريخ النسخة: " + info + "\n" : "") + "ستُحفظ الحالة الحالية أولاً في نسخة «قبل الاسترجاع»." });
  if (c.response !== 0) return { canceled: 1 };
  try { await snapshot("pre"); } catch (e) { return { error: "تعذّر حفظ الحالة الحالية قبل الاسترجاع: " + e.message }; }
  await win.webContents.executeJavaScript(`(async()=>{let x=${json};try{localStorage.setItem("w1pre",JSON.stringify(D))}catch(e){};if(x.__files&&x.__files.length){try{await flRestore(x.__files)}catch(e){}};delete x.__files;window.__nf=1;try{if(window.__cl)localStorage.setItem("cl_restored","1")}catch(e){};localStorage.setItem(window.__clWK||"w1",JSON.stringify(x));location.reload();return 1})()`, true);
  return { ok: 1 };
});
ipcMain.handle("desk:pickDir2", async () => {
  const r = await dialog.showOpenDialog(win, { title: "اختر مجلداً ثانياً للنسخ (فلاشة / OneDrive)", properties: ["openDirectory", "createDirectory"] });
  if (r.canceled || !r.filePaths[0]) return { status: status() };
  const c = readCfg(); c.dir2 = path.join(r.filePaths[0], "AlFath-Water-Backups"); writeCfg(c);
  try { await snapshot("manual"); } catch (e) {}
  return { status: status() };
});
ipcMain.handle("desk:clearDir2", () => { const c = readCfg(); delete c.dir2; writeCfg(c); return { status: status() }; });
ipcMain.handle("desk:openFolder", () => { fs.mkdirSync(dir1(), { recursive: true }); return shell.openPath(dir1()); });
ipcMain.handle("desk:diagnostics", () => {
  const s = status();
  clipboard.writeText([`AlFath Water ${VERSION}`, `Electron ${process.versions.electron} / Chrome ${process.versions.chrome}`, `OS ${process.platform} ${require("os").release()}`,
    `userData ${app.getPath("userData")}`, `dir1 ${s.dir1}`, `dir2 ${s.dir2 || "-"}`, `backups ${s.count}`, `last ${JSON.stringify(s.last)}`].join("\n"));
  return { ok: 1 };
});

app.whenReady().then(() => {
  createWindow();
  setInterval(dailyCheck, 60 * 60 * 1000);
  // فحص ذاتي للبناء: AlFath-Water.exe --smoke-test
  if (process.argv.includes("--smoke-test")) {
    win.webContents.once("did-finish-load", async () => {
      try {
        const ok = await win.webContents.executeJavaScript(`typeof D=="object"&&Array.isArray(D.subs)&&!!document.querySelector("nav")&&typeof XLSX=="object"`);
        const r = await snapshot("manual"); B.readBackup(fs.readFileSync(r.saved[0]));
        console.log("SMOKE", ok ? "OK" : "FAIL"); closing = true; app.exit(ok ? 0 : 1);
      } catch (e) { console.log("SMOKE FAIL", e.message); closing = true; app.exit(1); }
    });
  }
});
app.on("window-all-closed", () => app.quit());
