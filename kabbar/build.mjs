// يبني البرنامج في ملف HTML واحد (kabbar/index.html) يعمل بدون أنترنت (الخط مُضمَّن)
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let esb, nodePaths = [];
try { esb = require('esbuild'); require.resolve('react'); } catch { esb = require('/opt/npm-tools/node_modules/esbuild'); nodePaths = ['/opt/npm-tools/node_modules']; }
const r = await esb.build({ entryPoints: ['src/app.jsx'], bundle: true, minify: true, write: false, format: 'iife', jsx: 'automatic', target: 'es2019', nodePaths,
  define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
let css = fs.readFileSync('src/water.css', 'utf8') + '\n' + fs.readFileSync('src/kb.css', 'utf8');
css = css.replace(/url\(fonts\/([\w.-]+\.woff2)\)/g, (_, f) => 'url(data:font/woff2;base64,' + fs.readFileSync('fonts/' + f).toString('base64') + ')');
const html = fs.readFileSync('src/index.html', 'utf8').replace('/*CSS*/', () => css).replace('<script>/*APP*/</script>', () => '<script>' + js + '</script>');
fs.writeFileSync('index.html', html);
console.log('ok', (html.length / 1024).toFixed(0) + ' KB');
