# patch_w1.py: water_app-8.html -> www/index.html (PWA + EXE + APK)
import sys
src, out = sys.argv[1], sys.argv[2]
h = open(src, encoding='utf-8').read()

CDN = '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>'
assert h.count(CDN) == 1
HEAD = ('<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png">'
        '<link rel="apple-touch-icon" href="icon-192.png">'
        '<script src="xlsx.full.min.js"></script>'
        '<script>window.XLSX||document.write(\'<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"><\\/script>\')</script>')
h = h.replace(CDN, HEAD)

BRIDGE = r'''<script>
/* ===== منصّات التشغيل: PWA / Android (Capacitor) ===== */
(function(){
 var C=window.Capacitor,nat=!!(C&&C.isNativePlatform&&C.isNativePlatform());
 if(!nat&&location.protocol=="https:"&&"serviceWorker" in navigator&&!window.desk)
  addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
 if(!nat)return;
 var P=C.Plugins||{};
 /* التنزيلات (نسخة احتياطية، Excel): حفظ الملف ثم فتح نافذة المشاركة */
 var oc=HTMLAnchorElement.prototype.click;
 HTMLAnchorElement.prototype.click=function(){
  if(!this.hasAttribute("download")||!/^(blob:|data:)/.test(this.href))return oc.apply(this,arguments);
  var name=(this.getAttribute("download")||"file").replace(/[\\/:*?"<>|]/g,"_"),href=this.href;
  fetch(href).then(function(r){return r.blob()}).then(function(b){return new Promise(function(ok,no){var f=new FileReader();f.onload=function(){ok(String(f.result).split(",")[1])};f.onerror=no;f.readAsDataURL(b)})})
  .then(function(d){return P.Filesystem.writeFile({path:name,data:d,directory:"CACHE"})})
  .then(function(r){return P.Share.share({title:name,files:[r.uri],dialogTitle:"حفظ / مشاركة الملف"})})
  .catch(function(e){if(!/cancel/i.test(String(e&&e.message)))alert("تعذّر حفظ الملف: "+(e&&e.message||e))});
 };
 /* الطباعة عبر خدمة الطباعة في أندرويد (PDF أو طابعة) */
 window.print=function(){if(P.WaterPrint)P.WaterPrint.print({name:"Al-Fath"}).catch(function(e){alert("تعذّرت الطباعة: "+(e&&e.message||e))});else alert("الطباعة غير متاحة في هذا الجهاز")};
 /* زر الرجوع في الهاتف يغلق النوافذ أولاً */
 if(P.App)P.App.addListener("backButton",function(){
  var pv=document.getElementById("pv"),tv=document.getElementById("tv"),qk=document.getElementById("qk"),m=document.querySelector(".mdl:not([hidden])");
  if(tv&&tv.style.display=="block")thClose();else if(pv&&pv.style.display=="block")pv.style.display="none";
  else if(m)closeM(m.id);else if(qk&&!qk.hidden)qkClose();else if(typeof tab!="undefined"&&tab!=first())go(first());else{flush(1);P.App.exitApp()}});
 if(P.App)P.App.addListener("pause",function(){try{flush(1)}catch(e){}});
})();
</script></body></html>'''
assert h.rstrip().endswith('</body></html>')
h = h.rstrip()[:-len('</body></html>')] + BRIDGE  # append platform bridge before </body>
open(out, 'w', encoding='utf-8').write(h)
print('ok', len(h))
