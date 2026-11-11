#!/bin/sh
# يبني كل النسخ من المصدر water/src/water_app.html
set -e; cd "$(dirname "$0")/.."; B=cloud/build
python3 $B/patch_w2.py water/src/water_app.html $B/cloud_block.html /tmp/cw.html --key w1c
# البرنامج القديم صار في /old/ (نسخة احتياط). العنوان الرئيسي و /cloud/ يفتحان النسخة الجديدة.
mkdir -p old/cloud
python3 $B/patch_w1_platform.py /tmp/cw.html old/index.html && cp old/index.html old/cloud/index.html
for d in old old/cloud; do cp manifest.webmanifest icon-192.png icon-512.png icon-maskable.png $d/; done
cp $B/go.html index.html && cp $B/go.html cloud/index.html
python3 $B/patch_w2.py water/src/water_app.html $B/cloud_block.html /tmp/ca.html --key w1
python3 $B/patch_w1_platform.py /tmp/ca.html water/www/index.html
python3 $B/patch_demo.py water/src/water_app.html $B/dash_block.html demo/index.html
