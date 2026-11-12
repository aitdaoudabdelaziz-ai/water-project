#!/usr/bin/env python3
"""prep.py: يجهّز برنامج تعاونية الكبار (kabbar/index.html) كتطبيق APK و EXE،
انطلاقاً من غلافَي برنامج الماء (water/android-app و water/desktop) دون تعديلهما.
اسم ومعرّف مختلفان: يُثبَّت بجانب برنامج الماء ولا يعوّضه.
  prep.py www OUT_DIR       ← الصفحة + الأيقونة + جسر الهاتف (حفظ/مشاركة الملفات، زر الرجوع)
  prep.py android APP_DIR   ← نسخة من water/android-app
  prep.py desktop DESK_DIR  ← نسخة من water/desktop (النسخ الاحتياطي يقرأ بيانات التعاونية kb1)"""
import sys, json, re, shutil, pathlib
K = pathlib.Path(__file__).resolve().parents[1]          # kabbar/
VER = '1.0.0'
APPID, NAME, FILE = 'ma.alfath.kabbar', 'تعاونية الكبار', 'Kabbar-Coop'
ICONS = K / 'pack/icons'
mode, out = sys.argv[1], pathlib.Path(sys.argv[2])

def rep(p, a, b, n=1):
    s = p.read_text(encoding='utf-8'); c = s.count(a)
    if c != n: sys.exit(f'PREP FAIL {p.name} ({c}x, expected {n}): {a[:90]}')
    p.write_text(s.replace(a, b), encoding='utf-8')

def sub(p, rx, b):
    s = p.read_text(encoding='utf-8'); s2, c = re.subn(rx, lambda _: b, s, count=1, flags=re.S)
    if c != 1: sys.exit(f'PREP FAIL {p.name}: {rx[:90]}')
    p.write_text(s2, encoding='utf-8')

NATIVE = r'''<script>
/* جسر الهاتف (Capacitor): الملفات تُحفظ ثم تُشارك، وزر الرجوع يغلق النوافذ أولاً */
(function(){var C=window.Capacitor;if(!(C&&C.isNativePlatform&&C.isNativePlatform()))return;var P=C.Plugins||{};
 var oc=HTMLAnchorElement.prototype.click;
 HTMLAnchorElement.prototype.click=function(){
  if(!this.hasAttribute("download")||!/^(blob:|data:)/.test(this.href))return oc.apply(this,arguments);
  var name=(this.getAttribute("download")||"file").replace(/[\\/:*?"<>|]/g,"_"),href=this.href;
  fetch(href).then(function(r){return r.blob()}).then(function(b){return new Promise(function(ok,no){var f=new FileReader();f.onload=function(){ok(String(f.result).split(",")[1])};f.onerror=no;f.readAsDataURL(b)})})
  .then(function(d){return P.Filesystem.writeFile({path:name,data:d,directory:"CACHE"})})
  .then(function(r){return P.Share.share({title:name,files:[r.uri],dialogTitle:"حفظ / مشاركة الملف"})})
  .catch(function(e){if(!/cancel/i.test(String(e&&e.message)))alert("تعذّر حفظ الملف: "+(e&&e.message||e))})};
 if(P.App)P.App.addListener("backButton",function(){
  if(document.querySelector(".pv,.dlg,[role=dialog]")){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));return}
  var h=document.querySelector(".nav button");if(h&&!h.classList.contains("on")){h.click();return}
  P.App.exitApp()});
})();
</script>'''

if mode == 'www':
    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True)
    h = (K / 'index.html').read_text(encoding='utf-8')
    if h.count('<div id="root"></div>') != 1: sys.exit('PREP FAIL index.html: root')
    h = h.replace('<div id="root"></div>', '<div id="root"></div>\n' + NATIVE)
    (out / 'index.html').write_text(h, encoding='utf-8')
    shutil.copy(ICONS / 'icon-192.png', out / 'icon-192.png')
elif mode == 'android':
    c = json.loads((out / 'capacitor.config.json').read_text(encoding='utf-8'))
    c['appId'], c['appName'] = APPID, NAME
    (out / 'capacitor.config.json').write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding='utf-8')
    for f in (out / 'native').glob('*.java'): rep(f, 'package ma.alfath.water;', 'package ma.alfath.kabbar;')
    p = json.loads((out / 'package.json').read_text(encoding='utf-8')); p['name'] = 'kabbar-android'; p['version'] = VER
    (out / 'package.json').write_text(json.dumps(p, indent=1), encoding='utf-8')
    shutil.rmtree(out / 'res'); shutil.copytree(ICONS / 'res', out / 'res')
elif mode == 'desktop':
    p = json.loads((out / 'package.json').read_text(encoding='utf-8'))
    p.update(name='kabbar-coop', productName=FILE, version=VER, description='تعاونية الكبار - تسيير التعاونية الفلاحية', author='Cooperative Kabbar')
    b = p['build']; b.update(appId=APPID, productName=FILE)
    b['nsis'].update(shortcutName=NAME, artifactName=FILE + '-Setup-${version}.exe'); b['portable']['artifactName'] = FILE + '-Portable-${version}.exe'
    (out / 'package.json').write_text(json.dumps(p, ensure_ascii=False, indent=1), encoding='utf-8')
    for f in ('icon.png', 'icon.ico'): shutil.copy(ICONS / 'build' / f, out / 'build' / f)
    m = out / 'main.js'
    # بيانات التعاونية: window.__kb.D (مع حفظها أولاً)
    sub(m, r'const GET = `.*?`;', 'const GET = `(()=>{try{__kb.flush()}catch(e){};return JSON.stringify(__kb.D)})()`;')
    rep(m, '"AlFath-Water-Backups"', '"Kabbar-Backups"', 2)
    rep(m, 'title: "جمعية الفتح - تدبير الماء"', 'title: "تعاونية الكبار - التسيير"')
    rep(m, 'backgroundColor: "#EDF2E6"', 'backgroundColor: "#EEF2F6"')
    rep(m, 'if (!Array.isArray(d.subs) || typeof d.reads !== "object") throw new Error("ملف غير صالح");', 'if (!Array.isArray(d.mem) || typeof d.cfg !== "object") throw new Error("ملف غير صالح");')
    sub(m, r'await win\.webContents\.executeJavaScript\(`\(async\(\)=>\{let x=\$\{json\};.*?location\.reload\(\);return 1\}\)\(\)`, true\);',
        'await win.webContents.executeJavaScript(`(()=>{let x=${json};try{__kb.flush();localStorage.setItem("kb1pre",JSON.stringify(__kb.D))}catch(e){};window.__nf=1;localStorage.setItem("kb1",JSON.stringify(x));location.reload();return 1})()`, true);')
    rep(m, '`AlFath Water ${VERSION}`', '`Kabbar ${VERSION}`')
    rep(m, 'typeof D=="object"&&Array.isArray(D.subs)&&!!document.querySelector("nav")&&typeof XLSX=="object"',
        '!!document.querySelector(".kpi")&&!!window.__kb&&Array.isArray(__kb.D.mem)&&Array.isArray(__kb.D.cfg.grades)')
    rep(m, 'win.webContents.once("did-finish-load", async () => {', 'win.webContents.once("did-finish-load", async () => { await new Promise(r => setTimeout(r, 3000));')
    bk = out / 'backup.js'
    rep(bk, 'const APP = "w1"', 'const APP = "kb1"')
    rep(bk, 'const NAME_RX = /^w1-', 'const NAME_RX = /^kb1-')
    rep(bk, 'const name = `w1-${', 'const name = `kb1-${')
    rep(bk, 'if (m.app !== APP) throw new Error("هذه النسخة ليست من برنامج الماء");', 'if (m.app !== APP) throw new Error("هذه النسخة ليست من برنامج التعاونية");')
    rep(bk, 'if (!d || !Array.isArray(d.subs) || typeof d.reads !== "object") throw new Error("محتوى البيانات غير صالح");', 'if (!d || !Array.isArray(d.mem) || typeof d.cfg !== "object") throw new Error("محتوى البيانات غير صالح");')
else: sys.exit('mode?')
print('ok', mode, out)
