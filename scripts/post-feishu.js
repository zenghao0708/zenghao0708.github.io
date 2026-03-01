#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_SKILL_DIR = '/Users/zenghao/.agents/skills/md2feishu-doc';

function parseArgs(argv) {
  const out = {
    input: '',
    source: '',
    mode: process.env.FEISHU_DOC_MODE || 'create',
    docId: process.env.FEISHU_DOC_ID || 'new',
    folderToken: process.env.FEISHU_FOLDER_TOKEN || '',
    execute: false,
    submit: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' && argv[i + 1]) {
      out.input = argv[++i];
    } else if (arg === '--source' && argv[i + 1]) {
      out.source = argv[++i];
    } else if (arg === '--mode' && argv[i + 1]) {
      out.mode = argv[++i];
    } else if (arg === '--doc-id' && argv[i + 1]) {
      out.docId = argv[++i];
    } else if (arg === '--folder-token' && argv[i + 1]) {
      out.folderToken = argv[++i];
    } else if (arg === '--execute') {
      out.execute = true;
    } else if (arg === '--submit') {
      out.submit = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage(0);
    }
  }

  return out;
}

function printUsage(exitCode) {
  console.log(`Post markdown payload to Feishu Docs

Usage:
  node scripts/post-feishu.js --input <payload.json> [options]

Options:
  --source <markdown>       Prefer original markdown file path
  --mode <create|append>    Default from FEISHU_DOC_MODE (create)
  --doc-id <id>             Required for append mode (or FEISHU_DOC_ID)
  --folder-token <token>    Optional folder token for create mode
  --execute                 Actually call md2feishu uploader
  --submit                  Alias marker for publish flow (used with --execute)
  --help                    Show this help

Examples:
  node scripts/post-feishu.js --input publish/output/feishu/demo.payload.json
  node scripts/post-feishu.js --input publish/output/feishu/demo.payload.json --source blog_new/source/_posts/a.md --execute --submit
`);
  process.exit(exitCode);
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Invalid JSON payload: ${filePath} (${err.message})`);
  }
}

function resolveMarkdownPath(opts, payload) {
  if (opts.source) {
    const resolved = path.resolve(opts.source);
    if (fs.existsSync(resolved)) {
      return { markdownPath: resolved, temp: false };
    }
    throw new Error(`--source not found: ${resolved}`);
  }

  if (payload.source && fs.existsSync(payload.source)) {
    return { markdownPath: path.resolve(payload.source), temp: false };
  }

  if (typeof payload.markdown === 'string' && payload.markdown.trim()) {
    const tmpPath = path.join(
      os.tmpdir(),
      `feishu-publish-${Date.now()}-${Math.random().toString(16).slice(2)}.md`
    );
    fs.writeFileSync(tmpPath, payload.markdown, 'utf8');
    return { markdownPath: tmpPath, temp: true };
  }

  throw new Error('No markdown source found. Provide --source or payload.markdown.');
}

function buildUploaderArgs(opts, markdownPath) {
  if (!['create', 'append'].includes(opts.mode)) {
    throw new Error(`Invalid --mode: ${opts.mode}. Expected create|append.`);
  }

  if (opts.mode === 'append') {
    if (!opts.docId || opts.docId === 'new') {
      throw new Error('append mode requires --doc-id or FEISHU_DOC_ID.');
    }
    return [markdownPath, 'append', opts.docId];
  }

  const args = [markdownPath, 'create', 'new'];
  if (opts.folderToken) {
    args.push(opts.folderToken);
  }
  return args;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) {
    printUsage(1);
  }

  const payloadPath = path.resolve(opts.input);
  if (!fs.existsSync(payloadPath)) {
    throw new Error(`Payload not found: ${payloadPath}`);
  }

  const payload = safeReadJson(payloadPath);
  const skillDir = process.env.MD2FEISHU_SKILL_DIR || DEFAULT_SKILL_DIR;
  const uploaderPath = path.join(skillDir, 'feishu-md-uploader.mjs');

  if (!fs.existsSync(uploaderPath)) {
    throw new Error(`Uploader not found: ${uploaderPath}`);
  }

  const { markdownPath, temp } = resolveMarkdownPath(opts, payload);
  const uploaderArgs = buildUploaderArgs(opts, markdownPath);

  const plan = {
    platform: 'feishu',
    payloadPath,
    markdownPath,
    mode: opts.mode,
    docId: opts.mode === 'append' ? opts.docId : null,
    folderToken: opts.mode === 'create' ? opts.folderToken || null : null,
    uploaderPath,
    willExecute: opts.execute,
    willSubmit: opts.submit
  };

  console.log(JSON.stringify(plan, null, 2));

  if (!opts.execute) {
    if (temp) {
      fs.unlinkSync(markdownPath);
    }
    return;
  }

  const res = spawnSync('node', [uploaderPath, ...uploaderArgs], {
    stdio: 'inherit',
    env: process.env
  });

  if (temp) {
    fs.unlinkSync(markdownPath);
  }

  if (res.error) {
    throw res.error;
  }

  if (typeof res.status === 'number' && res.status !== 0) {
    process.exit(res.status);
  }
}

try {
  main();
} catch (err) {
  console.error(`post-feishu failed: ${err.message}`);
  process.exit(1);
}
