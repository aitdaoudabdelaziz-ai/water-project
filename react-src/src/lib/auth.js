// المستخدمون وكلمات السر — نفس صيغة البرنامج الأصلي (SHA-256 للملح + كلمة السر)، فتعمل نفس الحسابات في النسختين
export const rnd = () => [...crypto.getRandomValues(new Uint8Array(6))].map(x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
export async function hs(p, s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s + p)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch { let h = 5381; for (const c of s + p) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return 'f' + h; }
}
export const ALL = ['v0', 'v1', 'v2', 'v3', 'ed', 'del', 'pr'];
export const DEF = ['v0', 'v1', 'v2', 'ed', 'pr'];
export const PL = [['v0', 'الاطلاع على المشتركين'], ['v1', 'الاطلاع على القراءات'], ['v2', 'الاطلاع على الفواتير'], ['v3', 'الاطلاع على المالية'],
  ['ed', 'الإضافة والتعديل'], ['del', 'الحذف والمسح'], ['pr', 'الطباعة والتقارير']];
const SK = 'w1react_user';
export const session = { get: () => { try { return JSON.parse(sessionStorage.getItem(SK) || 'null'); } catch { return null; } },
  set: v => { try { v ? sessionStorage.setItem(SK, JSON.stringify(v)) : sessionStorage.removeItem(SK); } catch { /* */ } } };
/** الصلاحيات: بدون مستخدمين = كل شيء مسموح (كالأصل) */
export function perms(D, cu) {
  const u = cu && D.users.find(x => x.id === cu.id);
  const can = k => !D.users.length || !!(u && (u.r === 'a' || (u.p || ALL).includes(k)));
  return { user: u || null, admin: !D.users.length || !!(u && u.r === 'a'), can, needLogin: D.users.length > 0 && !u,
    dash: ['v0', 'v1', 'v2', 'v3'].every(can) };
}
