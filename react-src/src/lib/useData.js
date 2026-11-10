import { createContext, useContext, useMemo } from 'react';
import { tot, evs, eff } from './calc.js';

export const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

/** قيم محسوبة مرة واحدة لكل مجموعة بيانات */
export function useDerived(D) {
  return useMemo(() => {
    if (!D) return null;
    const byId = new Map(D.subs.map(s => [s.id, s]));
    const live = D.invs.filter(i => byId.has(i.s));
    const unpaid = live.filter(i => !i.paid);
    const debtBySub = new Map();
    unpaid.forEach(i => debtBySub.set(i.s, (debtBySub.get(i.s) || 0) + tot(i)));
    const E = evs(D, byId);
    const bal = E.reduce((C, x) => { const f = eff(x); return [C[0] + f[0], C[1] + f[1]]; }, [+D.cfg.oc || 0, +D.cfg.ob || 0]);
    return { byId, live, unpaid, debtBySub, events: E, balance: bal };
  }, [D]);
}
