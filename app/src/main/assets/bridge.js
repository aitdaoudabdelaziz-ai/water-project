(function(){
 if(!window.AndroidApp)return;
 function send(blob,name){var r=new FileReader();r.onload=function(){var s=String(r.result);AndroidApp.saveFile(name||"file",blob.type||"application/octet-stream",s.slice(s.indexOf(",")+1))};r.readAsDataURL(blob)}
 window.saveAs=function(b,n){send(b,n)};
 var oc=HTMLAnchorElement.prototype.click;
 HTMLAnchorElement.prototype.click=function(){
  var h=this.href||"";
  if(this.hasAttribute("download")&&(h.indexOf("blob:")==0||h.indexOf("data:")==0)){
   var n=this.getAttribute("download");fetch(h).then(function(x){return x.blob()}).then(function(b){send(b,n)});return}
  return oc.apply(this,arguments)};
 window.print=function(){try{dispatchEvent(new Event("beforeprint"))}catch(e){}AndroidApp.print(document.title||"print")};
 window.__afterPrint=function(){try{dispatchEvent(new Event("afterprint"))}catch(e){}};
})();
