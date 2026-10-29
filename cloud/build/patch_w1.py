#!/usr/bin/env python3
"""patch_w1: يحوّل برنامج جمعية الفتح (index.html) إلى نسخة سحابية في cloud/index.html"""
import sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
block = pathlib.Path(sys.argv[2]).read_text(encoding='utf-8')
out = src

def rep(old, new, count=1):
    global out
    n = out.count(old)
    if n != count:
        sys.exit(f'PATCH FAIL ({n}x): {old[:80]}')
    out = out.replace(old, new)

EARLY = ('window.__cl=(()=>{try{return location.hash.indexOf("#c=")===0||(!!localStorage.getItem("wcloud_fb")&&localStorage.getItem("wcloud_mode")!=="local")}catch(e){return false}})();'
         'const WK=window.__cl?"w1c":"w1";'
         'function NID(k){let v=(+D[k]||0)+1;if(window.__cl)v=Math.max(v,Date.now());D[k]=v;return v}\n')
rep('let D;try{D=JSON.parse(localStorage.getItem("w1"))}catch(e){}',
    EARLY + 'let D;try{D=JSON.parse(localStorage.getItem(WK))}catch(e){}')
rep('const save=()=>{try{localStorage.setItem("w1",JSON.stringify(D))}catch(e){alert("تعذّر الحفظ في الهاتف")}};',
    'const save=()=>{try{localStorage.setItem(WK,JSON.stringify(D))}catch(e){alert("تعذّر الحفظ في الهاتف")}window.__cs&&window.__cs()};'
    'window.__clD=()=>D;window.__clCache=()=>{try{localStorage.setItem(WK,JSON.stringify(D))}catch(e){}};')
rep('SK="w1"', 'SK=WK')
rep('++D.sid', 'NID("sid")', 2)
rep('++D.fid', 'NID("fid")')
rep('++D.uid', 'NID("uid")')
rep('if(confirm("استبدال كل البيانات الحالية بالنسخة؟")){D=x;save();location.reload()}',
    'if(confirm("استبدال كل البيانات الحالية بالنسخة؟")){if(window.__cl&&window.__clRestore){window.__clRestore(x);return}D=x;save();location.reload()}')
UI = ('\nwindow.__clUI=function(){$("#cnt").textContent=D.subs.length+" مشترك";'
      '[["cp","price"],["cf","fee"],["cd","due"],["cph","phone"],["ce","email"],["cbk","bank"],["crb","rib"],["coc","oc"],["cob","ob"]].forEach(([id,k])=>{let e=$("#"+id);if(e&&document.activeElement!==e)e.value=D.cfg[k]==null?"":D.cfg[k]});'
      '$("#csp").value=D.cfg.stampOn===false?"0":"1";[["stt","stT"],["stb","stB"],["stc","stC"],["stk","stK"],["stf","stF"]].forEach(([i,k])=>{let e=$("#"+i);if(e&&document.activeElement!==e)e.value=D.cfg[k]||""});'
      'if(document.activeElement!==$("#ccl"))$("#ccl").value=D.cfg.clauses||CL;stRefresh();gate();if(!D.users.length||usr())render()};\n')
rep('if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>0);\n</script>',
    UI + '</script>')
rep('<title>جمعية الفتح - الماء الصالح للشرب</title>', '<title>جمعية الفتح - الماء (سحابي)</title>')
rep('</body></html>', block + '\n</body></html>')
pathlib.Path(sys.argv[3]).write_text(out, encoding='utf-8')
print('ok', len(out))
