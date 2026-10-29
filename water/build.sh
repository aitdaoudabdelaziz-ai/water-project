#!/bin/sh
# يبني كل النسخ من المصدر water/src/water_app.html
set -e; cd "$(dirname "$0")/.."; B=cloud/build
python3 $B/patch_w2.py water/src/water_app.html $B/cloud_block.html /tmp/cw.html --key w1c
python3 $B/patch_w1_platform.py /tmp/cw.html index.html && cp index.html cloud/index.html
python3 $B/patch_w2.py water/src/water_app.html $B/cloud_block.html /tmp/ca.html --key w1
python3 $B/patch_w1_platform.py /tmp/ca.html water/www/index.html
