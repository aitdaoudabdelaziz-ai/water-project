# patch_w2.py: auto-focus after opening a dialog must not steal focus from a field the user already started typing in
import sys
h=open(sys.argv[1],encoding='utf-8').read()
R=[('setTimeout(()=>$("#n").focus(),60)','setTimeout(()=>afocus("#n","#msub"),60)'),
   ('setTimeout(()=>$("#fcat").focus(),60)','setTimeout(()=>afocus("#fcat","#mfin"),60)'),
   ('setTimeout(()=>$("#qk_q").focus(),50)','setTimeout(()=>afocus("#qk_q","#qk"),50)')]
for a,b in R:
    assert h.count(a)==1,a; h=h.replace(a,b)
A='const dbn=f=>'
assert h.count(A)==1
h=h.replace(A,'const afocus=(s,box)=>{let a=document.activeElement;if(!(a&&a.closest&&a.closest(box)&&a.matches("input,select,textarea")))$(s).focus()};\n'+A)
open(sys.argv[2],'w',encoding='utf-8').write(h);print('ok')
