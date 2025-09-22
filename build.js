/* eslint-disable */
// Simple build script: copies static assets, minifies HTML/CSS/JS into dist/
const path = require('path');
const fs = require('fs-extra');
const globby = require('globby');
const { minify: minifyHtml } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const terser = require('terser');
let sharp = null;

async function ensureDir(dir) {
  await fs.mkdirp(dir);
}

async function copyStatic(src, dest) {
  await fs.copy(src, dest, {
    filter: (srcPath) => {
      const rel = path.relative(process.cwd(), srcPath).replace(/\\/g, '/');
      // Skip node_modules, dist, deployment duplicates
      if (rel.startsWith('node_modules') || rel.startsWith('dist') || rel.startsWith('deployment') || rel.startsWith('github-upload')) return false;
      // Skip package files and build scripts from copying raw
      if (/^package(-lock)?\.json$/.test(path.basename(rel))) return false;
      if (path.basename(rel) === 'build.js') return false;
      return true;
    },
  });
}

async function minifyCssFiles(patterns, outDir) {
  const files = await globby(patterns);
  const cleaner = new CleanCSS({ level: 2 });
  for (const file of files) {
    const css = await fs.readFile(file, 'utf8');
    const out = cleaner.minify(css);
    const rel = path.relative(process.cwd(), file);
    const dest = path.join(outDir, rel);
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, out.styles);
  }
}

async function minifyJsFiles(patterns, outDir) {
  const files = await globby(patterns);
  for (const file of files) {
    const code = await fs.readFile(file, 'utf8');
    const result = await terser.minify(code, { compress: true, mangle: true });
    if (result.error) throw result.error;
    const rel = path.relative(process.cwd(), file);
    const dest = path.join(outDir, rel);
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, result.code);
  }
}

async function minifyHtmlFiles(patterns, outDir) {
  const files = await globby(patterns);
  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    const min = await minifyHtml(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      minifyCSS: true,
      minifyJS: true,
      keepClosingSlash: true,
      sortAttributes: true,
      sortClassName: true,
    });
    const rel = path.relative(process.cwd(), file);
    const dest = path.join(outDir, rel);
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, min);
  }
}

async function optimizeBackgroundImages(outDir) {
  try {
    // Lazy-load sharp so environments without it can still run other steps
    sharp = sharp || require('sharp');
  } catch (e) {
    console.warn('Sharp not available; skipping background image optimization. Run: npm i -D sharp');
    return;
  }
  const srcFiles = await globby(['background-pic/*.{png,jpg,jpeg,JPG,JPEG,PNG}']);
  const optDir = path.join(outDir, 'background-pic', 'opt');
  await ensureDir(optDir);
  const tasks = srcFiles.map(async (file) => {
    const base = path.basename(file).replace(/\.[^.]+$/, '');
    const dest = path.join(optDir, `${base}.webp`);
    try {
      const img = sharp(file).rotate();
      const meta = await img.metadata();
      const width = meta.width || 1920;
      const target = Math.min(1400, Math.max(640, width));
      await img
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: 74 })
        .toFile(dest);
    } catch (e) {
      console.warn('Optimization failed for', file, e.message);
    }
  });
  await Promise.all(tasks);
}

async function main() {
  const outDir = path.join(process.cwd(), 'dist');
  await fs.remove(outDir);
  await ensureDir(outDir);

  // Copy all assets first (images, gifs, svg, json, etc.)
  await copyStatic(process.cwd(), outDir);

  // Overwrite with minified sources
  await minifyCssFiles(['styles.css'], outDir);
  await minifyJsFiles(['*.js'], outDir);
  await minifyHtmlFiles(['*.html'], outDir);

  // Generate optimized WebP versions for background images
  await optimizeBackgroundImages(outDir);

  console.log('Build completed. Output in dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


