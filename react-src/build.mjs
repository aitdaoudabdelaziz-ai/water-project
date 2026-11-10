// يبني نسخة React إلى ../react/ (تُنشر على alfath-eau.org/react/)
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let nodePaths = [], esb;
try { esb = require('esbuild'); require.resolve('react'); } catch { esb = require('/opt/npm-tools/node_modules/esbuild'); nodePaths = ['/opt/npm-tools/node_modules']; } // بيئة بدون npm install
const { build } = esb;
mkdirSync('../react', { recursive: true });
await build({
  entryPoints: ['src/main.js'], bundle: true, outfile: '../react/app.js', format: 'iife', target: 'es2019',
  loader: { '.js': 'jsx' }, jsx: 'automatic', minify: true, sourcemap: false, legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' }, nodePaths,
});
copyFileSync('src/styles.css', '../react/styles.css');
// رقم نسخة في الروابط حتى لا يبقى المتصفح على نسخة قديمة بعد كل تحديث
const v = f => createHash('sha1').update(readFileSync('../react/' + f)).digest('hex').slice(0, 10);
writeFileSync('../react/index.html', readFileSync('index.html', 'utf8').replace('href="styles.css"', 'href="styles.css?v=' + v('styles.css') + '"').replace('src="app.js"', 'src="app.js?v=' + v('app.js') + '"'));
copyFileSync('assets/logo.jpg', '../react/logo.jpg');
mkdirSync('../react/fonts', { recursive: true });
for (const f of readdirSync('fonts/noto-kufi-arabic')) copyFileSync('fonts/noto-kufi-arabic/' + f, '../react/fonts/' + f.replace('LICENSE', 'LICENSE-noto-kufi-arabic.txt'));
console.log('ok ../react/');
