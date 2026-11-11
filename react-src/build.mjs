// يبني البرنامج إلى ../react/ (تُنشر على alfath-eau.org/react/)
// نسخة البيع: PRO=1 OUT=dir WP_SK=<32 hex> WP_SELLER='{name:"..",phone:"..",price:".."}' [WP_TARGET=android ← بدون مفتاح في JS]
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let nodePaths = [], esb;
try { esb = require('esbuild'); require.resolve('react'); } catch { esb = require('/opt/npm-tools/node_modules/esbuild'); nodePaths = ['/opt/npm-tools/node_modules']; } // بيئة بدون npm install
const { build } = esb;
const PRO = process.env.PRO === '1', OUT = process.env.OUT || '../react', AND = process.env.WP_TARGET === 'android';
let SK = '', SELLER = {};
if (PRO) {
  SK = AND ? '' : (process.env.WP_SK || '').trim();
  if (!AND && !/^[0-9a-f]{32}$/.test(SK)) { console.error('WP_SK missing (32 hex chars)'); process.exit(1); }
  try { SELLER = new Function('return ' + (process.env.WP_SELLER || '{}'))(); } catch { console.error('WP_SELLER invalid'); process.exit(1); }
}
mkdirSync(OUT, { recursive: true });
await build({
  entryPoints: ['src/main.js'], bundle: true, outfile: OUT + '/app.js', format: 'iife', target: 'es2019',
  loader: { '.js': 'jsx' }, jsx: 'automatic', minify: true, sourcemap: false, legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"', __PRO__: String(PRO), __SK__: JSON.stringify(SK), __SELLER__: JSON.stringify(SELLER) }, nodePaths,
});
copyFileSync('src/styles.css', OUT + '/styles.css');
// رقم نسخة في الروابط حتى لا يبقى المتصفح على نسخة قديمة بعد كل تحديث
const v = f => createHash('sha1').update(readFileSync(OUT + '/' + f)).digest('hex').slice(0, 10);
let html = readFileSync('index.html', 'utf8'); if (PRO) html = html.replace(/<title>[^<]*<\/title>/, '<title>برنامج تدبير الماء الصالح للشرب</title>');
writeFileSync(OUT + '/index.html', html.replace('href="styles.css"', 'href="styles.css?v=' + v('styles.css') + '"').replace('src="app.js"', 'src="app.js?v=' + v('app.js') + '"'));
if (!PRO) copyFileSync('assets/logo.jpg', OUT + '/logo.jpg');
mkdirSync(OUT + '/fonts', { recursive: true });
for (const f of readdirSync('fonts/noto-kufi-arabic')) copyFileSync('fonts/noto-kufi-arabic/' + f, OUT + '/fonts/' + f.replace('LICENSE', 'LICENSE-noto-kufi-arabic.txt'));
if (PRO) { // لا شيء من هوية الفتح أو سحابتها، ولا مفتاح في نسخة أندرويد
  const js = readFileSync(OUT + '/app.js', 'utf8') + readFileSync(OUT + '/index.html', 'utf8');
  for (const w of ['water-assoc', 'AIzaSy', 'الفتح', 'أقايغان', 'طاطا', 'aitdaoud']) if (js.includes(w)) { console.error('PRO leak: ' + w); process.exit(1); }
  if (AND && process.env.WP_SK && js.includes(process.env.WP_SK.trim())) { console.error('PC key leaked into Android build'); process.exit(1); }
}
console.log('ok ' + OUT + (PRO ? ' (PRO' + (AND ? ' android' : '') + ')' : ''));
