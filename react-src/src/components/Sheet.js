import { useEffect, useRef } from 'react';
/** نافذة سفلية على الهاتف، ووسطية على الحاسوب. Esc أو النقر خارجها يغلقها */
export default function Sheet({ title, sub, onClose, children, labelId = 'sh-t' }) {
  const ref = useRef(null);
  useEffect(() => { const prev = document.activeElement; const el = ref.current && ref.current.querySelector('[data-autofocus]') || ref.current;
    el && el.focus(); return () => prev && prev.focus && prev.focus(); }, []);
  // Esc يغلق النافذة حتى لو ضاع التركيز (مثلاً بعد اختفاء الزر الذي ضُغط)
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby={labelId} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="dlg-b sheet" ref={ref} tabIndex={-1}>
        <div className="sheet-h"><div><h3 id={labelId}>{title}</h3>{sub && <small>{sub}</small>}</div>
          <button type="button" className="x" onClick={onClose} aria-label="إغلاق">✕</button></div>
        {children}
      </div>
    </div>
  );
}
