#!/usr/bin/env python3
"""patch_w2: نسخة سحابية من برنامج جمعية الفتح (نسخة الهاتف) للموقع والهاتف والحاسوب.
الاستعمال: patch_w2.py SRC BLOCK OUT --key w1c|w1 [--xlsx-local] [--title T]"""
import sys, pathlib, argparse
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('block'); ap.add_argument('out')
ap.add_argument('--key', default='w1c'); ap.add_argument('--xlsx-local', action='store_true')
a = ap.parse_args()
out = pathlib.Path(a.src).read_text(encoding='utf-8')
block = pathlib.Path(a.block).read_text(encoding='utf-8')
dash = (pathlib.Path(a.block).parent / 'dash_block.html').read_text(encoding='utf-8')
def rep(old, new, count=1):
    global out
    n = out.count(old)
    if n != count: sys.exit(f'PATCH FAIL ({n}x): {old[:90]}')
    out = out.replace(old, new)
EARLY = ('window.__cl=(()=>{try{return location.hash.indexOf("#c=")===0||(!!localStorage.getItem("wcloud_fb")&&localStorage.getItem("wcloud_mode")!=="local")}catch(e){return false}})();'
         f'const WK=window.__cl?"{a.key}":"w1";window.__clWK=WK;'
         'function NID(k){let v=(+D[k]||0)+1;if(window.__cl)v=Math.max(v,Date.now());D[k]=v;return v}\n')
rep('let D;try{D=JSON.parse(localStorage.getItem("w1"))}catch(e){}', EARLY + 'let D;try{D=JSON.parse(localStorage.getItem(WK))}catch(e){}')
rep('localStorage.setItem("w1",s);_ok=1;', 'localStorage.setItem(WK,s);_ok=1;window.__cs&&window.__cs();')
rep('localStorage.setItem("w1",s);location.reload()', 'localStorage.setItem(WK,s);try{if(window.__cl)localStorage.setItem("cl_restored","1")}catch(e){}location.reload()')
rep('let go=()=>{delete x.__files;D=x;flush();location.reload()}', 'let go=()=>{delete x.__files;if(window.__cl&&window.__clRestore){window.__clRestore(x);return}D=x;flush();location.reload()}')
rep('const save=()=>{_sm=null;_db=1;_dt||(_dt=setTimeout(flush,300))};',
    'const save=()=>{_sm=null;_db=1;_dt||(_dt=setTimeout(flush,300))};window.__clD=()=>D;window.__clCache=()=>{try{localStorage.setItem(WK,JSON.stringify(D))}catch(e){}};')
rep('SK="w1"', 'SK=WK')
rep('++D.sid', 'NID("sid")', 2); rep('++D.fid', 'NID("fid")'); rep('++D.uid', 'NID("uid")')
if a.xlsx_local:
    rep('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>', '<script src="xlsx.full.min.js"></script>')
UI = ('\nwindow.__clUI=function(){$("#cnt").textContent=D.subs.length+" مشترك";'
      '[["cp","price"],["cf","fee"],["cd","due"],["cph","phone"],["ce","email"],["cbk","bank"],["crb","rib"],["coc","oc"],["cob","ob"]].forEach(([id,k])=>{let e=$("#"+id);if(e&&document.activeElement!==e)e.value=D.cfg[k]==null?"":D.cfg[k]});'
      'let c=$("#csp");if(c)c.value=D.cfg.stampOn===false?"0":"1";[["stt","stT"],["stb","stB"],["stc","stC"],["stk","stK"],["stf","stF"]].forEach(([i,k])=>{let e=$("#"+i);if(e&&document.activeElement!==e)e.value=D.cfg[k]||""});'
      'let l=$("#ccl");if(l&&document.activeElement!==l)l.value=D.cfg.clauses||CL;try{stRefresh()}catch(e){}try{if(!$("#trbox")||!$("#trbox").contains(document.activeElement))trInit()}catch(e){}'
      'gate();if(!D.users.length||usr())render()};\n')
rep('gate();if(!D.users.length||usr())go(first());\n</script></body></html>',
    'gate();if(!D.users.length||usr())go(first());' + UI + '</script>\n' + dash + '\n' + block + '\n</body></html>')
pathlib.Path(a.out).write_text(out, encoding='utf-8'); print('ok', a.out, len(out))
