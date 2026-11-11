/** يقرأ صورة الشعار ويصغّرها إلى 256 بكسل (JPEG) ثم يرجعها كرابط data */
export function readLogo(file, done) {
  if (!file) return;
  const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => {
    const m = 256, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
    done(c.toDataURL('image/jpeg', 0.88)); }; im.onerror = () => alert('تعذّر فتح الصورة. اختر صورة PNG أو JPG.'); im.src = r.result; }; r.readAsDataURL(file);
}
