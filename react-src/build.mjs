// يبني نسخة React إلى ../react/ (تُنشر على alfath-eau.org/react/)
import { copyFileSync, mkdirSync } from 'node:fs';
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
copyFileSync('index.html', '../react/index.html');
copyFileSync('src/styles.css', '../react/styles.css');
console.log('ok ../react/');
