# Test plan — AlFath water app

Target: `water/www/index.html` (phone + PC build) and `cloud/index.html` (web), local mode.
Run: `python3 -m http.server 8765` at repo root, then `node --test --test-concurrency=1 e2e/*.spec.mjs`
(`WURL=http://127.0.0.1:8765/cloud/index.html` to test the web build).

| Flow | Cases | Spec |
| --- | --- | --- |
| F01 Subscribers | H1 add · H2 search · H3 edit/delete · N1 empty fields · N2 duplicate meter · E1 long name / emoji / HTML | f01-subscribers |
| F02 Readings → invoices | H1 invoice amount · N1 new < old · N2 no readings · E1 next round carries reading · E2 paid invoice frozen · E3 delete keeps collected money | f02-readings-invoices |
| F03 Quick collection | H1 search→reading→invoice→cash · N1 bad reading · E1 double click | f03-quick |
| F04 Payments & finance | H1 cash/bank accounts · H2 cancel payment · H3 expense/deposit/withdrawal · N1 zero amount | f04-payments-finance |
| F05 Users & login | H1 admin/logout/login (hashed pwd) · N1 wrong pwd + 30 s lock · N2 restricted user · E1 session per tab | f05-users |
| F06 Backup | H1 backup → restore · N1 invalid file | f06-backup |
| F07 Tariff | H1 price change keeps old invoices · H2 tiers | f07-tariff |
| F08 Dashboard & layout | H1 390/1440 × light/dark, no h-scroll, numbers · H2 all tabs at 390 px · H3 FR/AR | f08-dashboard-layout |
| F09 Two windows | E1 two windows same device | f09-two-tabs |

Manual only (not automatable here): real Firebase sync between devices, Excel import/export (SheetJS from CDN), printing and thermal printer, Electron EXE and Android APK on real devices.
| F10 Demo | H1 fake data 390/1440, real data untouched · H2 reset | f10-demo |
| F11 WhatsApp | H1 reminder · H2 receipt · H3 quick screen · N1 no phone · E1 number formats | f11-whatsapp |
