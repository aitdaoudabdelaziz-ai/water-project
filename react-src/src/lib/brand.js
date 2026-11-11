// هوية البرنامج: نسخة جمعية الفتح، أو نسخة البيع (__PRO__) بدون أي هوية للفتح
/* global __PRO__ */
export const PRO = typeof __PRO__ !== 'undefined' && __PRO__;
const DROP = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23E8F4EE' stroke='%231E6B48' stroke-width='3'/%3E%3Cpath d='M50 18C62 34 70 45 70 57a20 20 0 0 1-40 0c0-12 8-23 20-39Z' fill='%232A8FD0'/%3E%3Cpath d='M41 58a10 10 0 0 0 9 10' fill='none' stroke='%23fff' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E";
export const AS0 = PRO ? 'اسم الجمعية' : 'جمعية الفتح للتنمية والتعاون';
export const CT0 = PRO ? '' : 'أقايغان - إقليم طاطا';
export const LC0 = PRO ? 'جمعية - توزيع الماء الصالح للشرب' : 'جمعية تنموية - مرخصة لتوزيع الماء الصالح للشرب';
export const SHORT0 = PRO ? 'الجمعية' : 'جمعية الفتح';
/** شعار الفاتورة والوصل */
export const LOGO0 = PRO ? DROP : 'logo.jpg';
/** شعار الرأس وشاشة الدخول */
export const ICON0 = PRO ? DROP : '../icon-192.png';
export const logoOf = cfg => cfg.logo || LOGO0;
export const iconOf = cfg => cfg.logo || ICON0;
