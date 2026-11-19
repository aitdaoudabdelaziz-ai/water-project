// حركات GSAP (3.13، الترخيص المجاني القياسي). كل الحركات قصيرة، وتُلغى عند «تقليل الحركة» في الجهاز.
import { useLayoutEffect, useRef } from 'react';
import G from '../../vendor/gsap.min.js';
export const gsap = G.gsap || G.default || G;
export const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off'; } catch { return false; } };

/** دخول الصفحة: البطاقات واللوحات تظهر بالتتابع */
export function pageEnter(root) {
  if (!root || calm()) return () => {};
  const ctx = gsap.context(() => {
    const q = s => root.querySelectorAll(s);
    gsap.from(q(':scope > .stack > *, :scope > .stack > .ph > *'), { y: 22, opacity: 0, duration: .5, ease: 'power3.out', stagger: .055, clearProps: 'transform,opacity' });
    gsap.from(q('.kpi.kpi-ic'), { y: 26, scale: .94, opacity: 0, duration: .55, ease: 'back.out(1.6)', stagger: .07, delay: .08, clearProps: 'transform,opacity' });
    gsap.from(q('.kpi-i svg'), { rotate: -14, scale: .6, duration: .7, ease: 'elastic.out(1,.55)', stagger: .07, delay: .2, clearProps: 'transform' });
    gsap.from(q('.tbl tbody tr'), { x: 24, opacity: 0, duration: .4, ease: 'power2.out', stagger: .045, delay: .25, clearProps: 'transform,opacity' });
    gsap.from(q('.alr'), { x: -24, opacity: 0, duration: .4, ease: 'power2.out', stagger: .05, delay: .3, clearProps: 'transform,opacity' });
    gsap.from(q('.strip .tile'), { y: 14, opacity: 0, duration: .4, ease: 'power2.out', stagger: .06, delay: .35, clearProps: 'transform,opacity' });
    gsap.from(q('.rule'), { scaleX: .2, opacity: 0, duration: .7, ease: 'power3.out', delay: .4, clearProps: 'transform,opacity' });
    gsap.from(q('.act'), { y: 18, opacity: 0, duration: .45, ease: 'back.out(1.7)', stagger: .07, delay: .45, clearProps: 'transform,opacity' });
    // القوائم: أول 14 سطراً فقط (سرعة)
    gsap.from([...q('.list > li, .rows > li')].slice(0, 14), { y: 12, opacity: 0, duration: .32, ease: 'power2.out', stagger: .03, delay: .12, clearProps: 'transform,opacity' });
  }, root);
  return () => ctx.revert();
}
export function usePageEnter(dep) { const ref = useRef(null); useLayoutEffect(() => pageEnter(ref.current), [dep]); return ref; }

/** نافذة: تصعد من الأسفل على الهاتف وتكبر قليلاً على الحاسوب */
export function sheetEnter(el, bg) {
  if (!el || calm()) return;
  const phone = innerWidth < 700;
  gsap.fromTo(bg, { backgroundColor: 'rgba(8,22,36,0)' }, { backgroundColor: 'rgba(8,22,36,.45)', duration: .25, clearProps: 'backgroundColor' });
  gsap.from(el, phone ? { yPercent: 40, opacity: 0, duration: .38, ease: 'power3.out', clearProps: 'transform,opacity' }
    : { y: 18, scale: .97, opacity: 0, duration: .3, ease: 'power3.out', clearProps: 'transform,opacity' });
  gsap.from(el.querySelectorAll('.row .btn'), { y: 10, opacity: 0, duration: .3, stagger: .035, delay: .12, ease: 'power2.out', clearProps: 'transform,opacity' });
}
/** نبضة صغيرة عند نجاح عملية (حفظ، أداء) */
export const pop = el => { if (el && !calm()) gsap.fromTo(el, { scale: .94 }, { scale: 1, duration: .45, ease: 'elastic.out(1,.5)', clearProps: 'transform' }); };
