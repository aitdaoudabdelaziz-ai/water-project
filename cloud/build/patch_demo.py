#!/usr/bin/env python3
"""patch_demo: نسخة تجريبية (demo) من برنامج الماء ببيانات وهمية، بدون سحابة.
الاستعمال: patch_demo.py SRC DASH_BLOCK OUT
- تستعمل مفاتيح تخزين خاصة بها (w1demo...) فلا تلمس بيانات البرنامج الحقيقي على نفس الجهاز.
- تُنشئ بيانات وهمية عند أول فتح، وفيها زر «إعادة البيانات التجريبية»."""
import sys, pathlib
src, dash_p, out_p = sys.argv[1:4]
out = pathlib.Path(src).read_text(encoding='utf-8')
dash = pathlib.Path(dash_p).read_text(encoding='utf-8')

def rep(old, new, count=None):
    global out
    n = out.count(old)
    if n == 0 or (count is not None and n != count):
        sys.exit(f'PATCH FAIL ({n}x): {old[:90]}')
    out = out.replace(old, new)

# مفاتيح تخزين منفصلة
rep('"w1pre"', '"w1demopre"'); rep('"w1b"', '"w1demob"'); rep('"w1"', '"w1demo"')
rep('sessionStorage.getItem("wu"', 'sessionStorage.getItem("wudemo"')
rep('sessionStorage.setItem("wu"', 'sessionStorage.setItem("wudemo"')
rep('sessionStorage.removeItem("wu"', 'sessionStorage.removeItem("wudemo"')
rep('<title>جمعية الفتح للتنمية والتعاون - لجنة الماء الصالح للشرب</title>', '<title>نسخة تجريبية - برنامج تدبير الماء</title>', 1)
if 'navigator.serviceWorker.register("sw.js")' in out:
    out = out.replace('navigator.serviceWorker.register("sw.js")', 'Promise.resolve()')

SEED = r'''<script>
(function(){try{if(localStorage.getItem("w1demo"))return;
const Y=new Date().getFullYear(),now=new Date(),CR=Math.floor(now.getMonth()/3);
let z=7;const rn=n=>{z=(z*16807)%2147483647;return z%n};
const F=["محمد","أحمد","فاطمة","خديجة","يوسف","عائشة","الحسن","مريم","إبراهيم","زينب","عمر","سعاد","رشيد","نعيمة","عبد الله","حليمة","مصطفى","رقية","سعيد","لطيفة"];
const L=["التجريبي","المثال","النموذجي","الوهمي","الاختباري"];
const p2=x=>String(x).padStart(2,"0");
const D={subs:[],reads:{},invs:[],sid:0,seq:0,fin:[],fid:0,users:[],uid:0,
 cfg:{price:5,fee:10,due:15,phone:"0500000000",email:"demo@example.com",short:"جمعية تجريبية",oc:3000,ob:15000},lastBk:now.toISOString().slice(0,10)};
for(let i=1;i<=40;i++){D.subs.push({id:i,name:F[(i-1)%20]+" "+L[Math.floor((i-1)/20)+(i%3)],meter:"D-"+String(1000+i),cin:"",phone:"06000000"+p2(i),addr:"الدوار "+(1+i%4),fl:[],ct:i%5?1:0})}
D.sid=40;
const day=(r,m,d)=>Y+"-"+p2(r*3+m+1)+"-"+p2(d);
D.subs.forEach(s=>{let v=100+rn(200);
 for(let r=0;r<=CR;r++){if(r==CR&&s.id%2)break;let c=8+rn(25),o=v,n=v+c;v=n;D.reads[s.id+"|"+Y+"|"+r]={o,n};
  let id=++D.seq,paid=r<CR?(rn(10)<8?1:0):(rn(10)<3?1:0),dt=r<CR?day(r,2,28):now.toISOString().slice(0,10);
  let pd=paid?(r<CR?(Y+"-"+p2(Math.min(12,r*3+4))+"-"+p2(2+rn(20))):dt):null;
  D.invs.push({id,s:s.id,y:Y,r,o,n,price:5,fee:10,date:dt,paid,pd,pw:paid?(rn(4)?"c":"b"):null,num:Y+"/"+String(id).padStart(5,"0")})}});
const fin=(t,w,d,c,a,lk)=>{let x={id:++D.fid,t,w,d,c,a,n:""};if(lk!=null)x.lk=lk;D.fin.push(x)};
for(let m=0;m<=now.getMonth();m++){fin("out","c",Y+"-"+p2(m+1)+"-05","كهرباء",350+rn(150));if(m%3==1)fin("out","c",Y+"-"+p2(m+1)+"-12","صيانة",200+rn(400));if(m%3==2)fin("dep","b",Y+"-"+p2(m+1)+"-20","إيداع بنكي",1000,1)}
fin("in","c",Y+"-02-10","اشتراكات جديدة",600);fin("out","b",Y+"-03-15","قطع الغيار",1200);
localStorage.setItem("w1demo",JSON.stringify(D))}catch(e){}})();
</script>
'''
BANNER = r'''<style>
#dm_bar{position:sticky;top:0;z-index:55;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;padding:7px 12px;background:#FFF4D6;color:#6B4B00;border-bottom:1px solid #F0D58A;font-size:13px;text-align:center}
#dm_bar button{border:1px solid #D9B65A;background:#fff;color:#6B4B00;border-radius:10px;padding:4px 10px;font:inherit;cursor:pointer}
html[data-th=dark] #dm_bar{background:#3A3016;color:#FFE3A1;border-color:#5C4A1C}
@media print{#dm_bar{display:none}}
@media (max-width:520px){#dm_bar .dm_t{display:none}#dm_bar{padding:5px 10px}}
</style>
<div id="dm_bar">🧪 <b>نسخة تجريبية</b><span class="dm_t"> — كل البيانات وهمية وتبقى في هذا الجهاز فقط.</span><button type="button" onclick="if(confirm('إعادة البيانات التجريبية من البداية؟')){window.__nf=1;['w1demo','w1demob','w1demopre'].forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem('wudemo');location.reload()}">↺ إعادة البيانات</button></div>
<script>document.body.prepend(document.getElementById("dm_bar"))</script>
'''
rep('<body>', '<body>\n' + SEED, 1)
rep('</script></body></html>', '</script>\n' + dash + '\n' + BANNER + '\n</body></html>', 1)
pathlib.Path(out_p).write_text(out, encoding='utf-8')
print('ok', out_p, len(out))
