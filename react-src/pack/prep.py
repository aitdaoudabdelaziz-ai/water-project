#!/usr/bin/env python3
"""prep.py: يجهّز نسخة React للتطبيقات (APK و EXE) دون لمس البرنامج الحالي.
  prep.py www  OUT_DIR           ← نسخة الصفحة (react/) مع إصلاح الروابط + جسر الهاتف
  prep.py android APP_DIR         ← android-app منسوخ: معرّف واسم مختلفان (يُثبَّت بجانب البرنامج الحالي)
  prep.py desktop DESK_DIR        ← desktop منسوخ: اسم ومجلد نسخ مختلفان، والنسخ الاحتياطي يقرأ بيانات React"""
import sys, json, re, shutil, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
mode, out = sys.argv[1], pathlib.Path(sys.argv[2])
VER = json.loads((ROOT / 'react-src/package.json').read_text())['version']
APPID, NAME, FILE = 'ma.alfath.water.react', 'ماء الفتح React', 'AlFath-Water-React'

def rep(p, a, b, n=1):
    s = p.read_text(encoding='utf-8'); c = s.count(a)
    if c < n or (n == 1 and c != 1): sys.exit(f'PREP FAIL {p.name} ({c}x): {a[:80]}')
    p.write_text(s.replace(a, b), encoding='utf-8')

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
  if(document.querySelector(".dlg,.sheet,[role=dialog]")){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));return}
  var h=document.querySelector(".nav button");if(h&&!h.classList.contains("on")&&!h.getAttribute("aria-current")){h.click();return}
  P.App.exitApp()});
})();
</script>'''

if mode == 'www':
    if out.exists(): shutil.rmtree(out)
    shutil.copytree(ROOT / 'react', out)
    shutil.copy(ROOT / 'icon-192.png', out / 'icon-192.png')
    rep(out / 'index.html', 'href="../icon-192.png"', 'href="icon-192.png"')
    h = out / 'index.html'; h.write_text(re.sub(r'<link rel="preload"[^>]*>\n?', '', h.read_text(encoding='utf-8')), encoding='utf-8')  # file:// يرفض preload
    rep(out / 'index.html', '<div id="root"></div>', '<div id="root"></div>\n' + NATIVE)
    s = (out / 'app.js').read_text(encoding='utf-8')
    s = s.replace('"../icon-192.png"', '"icon-192.png"').replace("'../icon-192.png'", "'icon-192.png'")
    s = s.replace('"../cloud/"', '"https://alfath-eau.org/cloud/"').replace("'../cloud/'", "'https://alfath-eau.org/cloud/'")
    if '../icon-192.png' in s or '../cloud/' in s: sys.exit('PREP FAIL: relative link left in app.js')
    (out / 'app.js').write_text(s, encoding='utf-8')
elif mode == 'android':
    c = json.loads((out / 'capacitor.config.json').read_text(encoding='utf-8'))
    c['appId'], c['appName'] = APPID, NAME
    (out / 'capacitor.config.json').write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding='utf-8')
    for f in (out / 'native').glob('*.java'): rep(f, 'package ma.alfath.water;', 'package ma.alfath.water.react;')
    p = json.loads((out / 'package.json').read_text()); p['version'] = VER; (out / 'package.json').write_text(json.dumps(p, indent=1))
elif mode == 'desktop':
    p = json.loads((out / 'package.json').read_text(encoding='utf-8'))
    p.update(name='alfath-water-react', productName=FILE, version=VER)
    b = p['build']; b.update(appId=APPID, productName=FILE)
    b['nsis'].update(shortcutName=NAME, artifactName=FILE + '-Setup-${version}.exe'); b['portable']['artifactName'] = FILE + '-Portable-${version}.exe'
    (out / 'package.json').write_text(json.dumps(p, ensure_ascii=False, indent=1), encoding='utf-8')
    m = out / 'main.js'
    # النسخ الاحتياطي: بيانات React المعروضة (السحابة إن كانت مفعّلة، وإلا النسخة المحلية)
    GET = 'const GET = `(()=>{const L=localStorage,j=k=>{try{return JSON.parse(L.getItem(k)||"null")}catch(e){return null}};const c=L.getItem("w1react_cloud")==="1"&&j("w1react_cloudcache"),o=j("w1react");return JSON.stringify(c||(o&&o.data)||{})})()`;'
    s = m.read_text(encoding='utf-8'); s = re.sub(r'const GET = `.*?`;', lambda _: GET, s, count=1); m.write_text(s, encoding='utf-8')
    rep(m, '"AlFath-Water-Backups"', '"AlFath-Water-React-Backups"', 2)
    rep(m, 'typeof D=="object"&&Array.isArray(D.subs)&&!!document.querySelector("nav")&&typeof XLSX=="object"',
        '!!document.querySelector(".kpi")&&Array.isArray((JSON.parse(localStorage.getItem("w1react")||"{}").data||{}).subs)')
    rep(m, 'win.webContents.once("did-finish-load", async () => {', 'win.webContents.once("did-finish-load", async () => { await new Promise(r => setTimeout(r, 3000));')
    rep(m, 'title: "جمعية الفتح - تدبير الماء"', 'title: "جمعية الفتح - تدبير الماء (React)"')
else: sys.exit('mode?')
print('ok', mode, out)
