#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function usage(code) {
  console.log(`Usage:
  node scripts/export-blog-svg.js <file-or-dir> [--png-only] [--jpg-only]

Examples:
  node scripts/export-blog-svg.js blog_new/source/images/claude-code-source-deep-dive
  node scripts/export-blog-svg.js blog_new/source/images/foo/bar.svg --png-only
`);
  process.exit(code);
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error((res.stderr || res.stdout || `${cmd} failed`).trim());
  }
}

function exportOne(svgFile, formats) {
  const base = svgFile.replace(/\.svg$/i, '');
  const outputs = [];
  if (formats.has('png')) {
    const pngPath = `${base}.png`;
    run('sips', ['-s', 'format', 'png', svgFile, '--out', pngPath]);
    outputs.push(pngPath);
  }
  if (formats.has('jpg')) {
    const jpgPath = `${base}.jpg`;
    run('sips', ['-s', 'format', 'jpeg', svgFile, '--out', jpgPath]);
    outputs.push(jpgPath);
  }
  return outputs;
}

function collectSvgs(target) {
  const resolved = path.resolve(target);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    if (!resolved.toLowerCase().endsWith('.svg')) {
      throw new Error(`Expected an .svg file: ${resolved}`);
    }
    return [resolved];
  }
  return fs.readdirSync(resolved)
    .filter((name) => name.toLowerCase().endsWith('.svg'))
    .sort()
    .map((name) => path.join(resolved, name));
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    usage(args.length === 0 ? 1 : 0);
  }
  const target = args.find((arg) => !arg.startsWith('--'));
  if (!target) usage(1);
  const formats = new Set(['png', 'jpg']);
  if (args.includes('--png-only')) formats.delete('jpg');
  if (args.includes('--jpg-only')) formats.delete('png');
  if (formats.size === 0) {
    throw new Error('At least one output format is required.');
  }
  const svgs = collectSvgs(target);
  if (svgs.length === 0) {
    throw new Error(`No SVG files found under: ${path.resolve(target)}`);
  }
  const exported = [];
  for (const svgFile of svgs) {
    exported.push(...exportOne(svgFile, formats));
  }
  console.log(JSON.stringify({ target: path.resolve(target), exported }, null, 2));
}

try {
  main();
} catch (err) {
  console.error(`export-blog-svg failed: ${err.message}`);
  process.exit(1);
}
