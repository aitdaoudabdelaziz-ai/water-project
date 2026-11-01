# Bugs — AlFath water app (replica-test, 2026-11-01)

Run: 34 cases, web + phone/PC builds. Before fixes: 31 pass, 3 fail. After fixes: 34/34 on both builds.

## BUG-01 · S1 · fixed
Paid invoice changes amount after its reading is edited.
- Steps: reading 10→20, register invoices, pay cash (30 DH). Edit new reading to 60, register again.
- Expected: paid invoice stays 30 DH (money already in the cash box).
- Actual: invoice becomes 150 DH and the cash box shows 150 DH that was never collected.
- Test: F02-E2. Fix: readings of a paid round are refused with a message (readings tab and quick screen); `regInv` never rewrites a paid invoice.

## BUG-02 · S1 · fixed
Deleting a subscriber erases money already collected from the treasury.
- Steps: invoice 30 DH paid cash, delete the subscriber.
- Expected: cash box still 30 DH.  Actual: 0 DH.
- Test: F02-E3. Fix: before deletion each paid invoice is kept as a finance income line «مياه الشرب … (مشترك محذوف)».

## BUG-03 · S2 · fixed
Two windows of the app on the same device (local mode) overwrite each other.
- Steps: open the app twice, add a subscriber in each.
- Expected: both saved.  Actual: only the last window's subscriber survives.
- Test: F09-E1. Fix: a window adopts data saved by another window (`storage` event) when it has no pending changes. Cloud mode already syncs.

## To check (not reproduced as bugs)
- «إلغاء الدفع» un-pays an invoice with one tap, no confirmation (S4 candidate).
- Form labels are not linked to inputs (`for=`), so screen readers read fields without names (accessibility, S4).
- Accessibility scan (axe) not run: package not installed in this run.
