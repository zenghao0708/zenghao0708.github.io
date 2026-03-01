#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_SKILL_DIR = '/Users/zenghao/.agents/skills/baoyu-skills/skills/baoyu-post-to-wechat';

function parseArgs(argv) {
  const out = {
    input: '',
    source: '',
    mode: process.env.WECHAT_PUBLISH_MODE || 'article',
    theme: process.env.WECHAT_ARTICLE_THEME || 'default',
    profile: process.env.WECHAT_CHROME_PROFILE || '',
    execute: false,
    submit: false,
    title: process.env.WECHAT_TITLE || '',
    summary: process.env.WECHAT_SUMMARY || '',
    author: process.env.WECHAT_AUTHOR || '',
    imagesDir: process.env.WECHAT_IMAGES_DIR || '',
    auditDir: process.env.WECHAT_AUDIT_DIR || '',
    auditPrefix: process.env.WECHAT_AUDIT_PREFIX || '',
    autoCoverGlm: /^(1|true|yes|on)$/i.test(process.env.WECHAT_AUTO_COVER_GLM || ''),
    coverImage: process.env.WECHAT_COVER_IMAGE || '',
    coverOutputDir: process.env.WECHAT_COVER_OUTPUT_DIR || '',
    coverPrompt: process.env.WECHAT_COVER_PROMPT || '',
    coverEngine: process.env.WECHAT_COVER_ENGINE || 'gemini-cli',
    coverVariants: process.env.WECHAT_COVER_VARIANTS || '1',
    coverScorer: process.env.WECHAT_COVER_SCORER || 'codex-cli',
    coverScoreModel: process.env.WECHAT_COVER_SCORE_MODEL || '',
    coverScoreTimeoutMs: process.env.WECHAT_COVER_SCORE_TIMEOUT_MS || '120000',
    coverGeminiTimeoutMs: process.env.WECHAT_COVER_GEMINI_TIMEOUT_MS || '600000',
    coverGeminiFallbackGlm: !/^(0|false|no|off)$/i.test(process.env.WECHAT_COVER_GEMINI_FALLBACK_GLM || 'true'),
    coverGeminiBin: process.env.WECHAT_COVER_GEMINI_BIN || 'gemini',
    coverGeminiIncludeDirs: process.env.WECHAT_COVER_GEMINI_INCLUDE_DIRS || '/Users/zenghao/.baoyu-skills',
    coverCodexBin: process.env.WECHAT_COVER_CODEX_BIN || 'codex',
    coverCodexCd: process.env.WECHAT_COVER_CODEX_CD || process.cwd(),
    coverModel: process.env.WECHAT_COVER_MODEL || 'glm-image',
    coverSize: process.env.WECHAT_COVER_SIZE || '1888x800',
    coverQuality: process.env.WECHAT_COVER_QUALITY || 'hd',
    coverPreferRatio: process.env.WECHAT_COVER_PREFER_RATIO || '2.35'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' && argv[i + 1]) {
      out.input = argv[++i];
    } else if (arg === '--source' && argv[i + 1]) {
      out.source = argv[++i];
    } else if (arg === '--mode' && argv[i + 1]) {
      out.mode = argv[++i];
    } else if (arg === '--theme' && argv[i + 1]) {
      out.theme = argv[++i];
    } else if (arg === '--profile' && argv[i + 1]) {
      out.profile = argv[++i];
    } else if (arg === '--title' && argv[i + 1]) {
      out.title = argv[++i];
    } else if (arg === '--summary' && argv[i + 1]) {
      out.summary = argv[++i];
    } else if (arg === '--author' && argv[i + 1]) {
      out.author = argv[++i];
    } else if (arg === '--images-dir' && argv[i + 1]) {
      out.imagesDir = argv[++i];
    } else if (arg === '--audit-dir' && argv[i + 1]) {
      out.auditDir = argv[++i];
    } else if (arg === '--audit-prefix' && argv[i + 1]) {
      out.auditPrefix = argv[++i];
    } else if (arg === '--auto-cover-glm') {
      out.autoCoverGlm = true;
    } else if (arg === '--cover-image' && argv[i + 1]) {
      out.coverImage = argv[++i];
    } else if (arg === '--cover-output-dir' && argv[i + 1]) {
      out.coverOutputDir = argv[++i];
    } else if (arg === '--cover-prompt' && argv[i + 1]) {
      out.coverPrompt = argv[++i];
    } else if (arg === '--cover-engine' && argv[i + 1]) {
      out.coverEngine = argv[++i];
    } else if (arg === '--cover-variants' && argv[i + 1]) {
      out.coverVariants = argv[++i];
    } else if (arg === '--cover-scorer' && argv[i + 1]) {
      out.coverScorer = argv[++i];
    } else if (arg === '--cover-score-model' && argv[i + 1]) {
      out.coverScoreModel = argv[++i];
    } else if (arg === '--cover-score-timeout-ms' && argv[i + 1]) {
      out.coverScoreTimeoutMs = argv[++i];
    } else if (arg === '--cover-gemini-timeout-ms' && argv[i + 1]) {
      out.coverGeminiTimeoutMs = argv[++i];
    } else if (arg === '--no-cover-gemini-fallback-glm') {
      out.coverGeminiFallbackGlm = false;
    } else if (arg === '--cover-gemini-bin' && argv[i + 1]) {
      out.coverGeminiBin = argv[++i];
    } else if (arg === '--cover-gemini-include-dirs' && argv[i + 1]) {
      out.coverGeminiIncludeDirs = argv[++i];
    } else if (arg === '--cover-codex-bin' && argv[i + 1]) {
      out.coverCodexBin = argv[++i];
    } else if (arg === '--cover-codex-cd' && argv[i + 1]) {
      out.coverCodexCd = argv[++i];
    } else if (arg === '--cover-model' && argv[i + 1]) {
      out.coverModel = argv[++i];
    } else if (arg === '--cover-size' && argv[i + 1]) {
      out.coverSize = argv[++i];
    } else if (arg === '--cover-quality' && argv[i + 1]) {
      out.coverQuality = argv[++i];
    } else if (arg === '--cover-prefer-ratio' && argv[i + 1]) {
      out.coverPreferRatio = argv[++i];
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
  console.log(`Post payload to WeChat Official Account using baoyu-post-to-wechat skill

Usage:
  node scripts/post-wechat.js --input <payload.json> [options]

Options:
  --source <markdown>          Prefer original markdown file
  --mode <article|image-text>  Publish mode (default: article)
  --theme <name>               Article theme: default|grace|simple|mdnice-simple|mdnice-lanqing
  --profile <dir>              Chrome profile dir for WeChat
  --title <text>               Optional override title
  --summary <text>             Optional override summary
  --author <text>              Optional override author
  --images-dir <dir>           Image directory for image-text mode
  --audit-dir <dir>            Save draft verification screenshot/report
  --audit-prefix <text>        Prefix for audit artifact file names
  --auto-cover-glm             Auto-generate WeChat cover via GLM and apply to draft
  --cover-image <path>         Use existing cover image (skip GLM generation)
  --cover-output-dir <dir>     Directory for generated cover assets
  --cover-prompt <text>        Override cover prompt
  --cover-engine <name>        Cover generator: glm|gemini-cli (default: glm)
  --cover-variants <n>         Candidate count with auto scoring (default: 1)
  --cover-scorer <name>        auto|codex-cli|heuristic|none (default: auto)
  --cover-score-model <name>   Optional model for codex scorer
  --cover-score-timeout-ms <n> Timeout for each codex scoring call
  --cover-gemini-timeout-ms <n> Timeout for each gemini generation call
  --no-cover-gemini-fallback-glm Disable fallback to GLM when gemini fails
  --cover-gemini-bin <path>    Gemini CLI binary path
  --cover-gemini-include-dirs <csv> Extra include dirs for gemini CLI
  --cover-codex-bin <path>     Codex CLI binary path
  --cover-codex-cd <dir>       Working dir for codex scorer
  --cover-model <name>         GLM image model (default: glm-image)
  --cover-size <WxH>           GLM output size (default: 1888x800)
  --cover-quality <q>          GLM quality: hd|standard (default: hd)
  --cover-prefer-ratio <num>   Prefer ratio when selecting cover from content (default: 2.35)
  --execute                    Actually run wechat skill script
  --submit                     Save as draft (skill behavior)
  --help                       Show this help

Examples:
  node scripts/post-wechat.js --input publish/output/wechat/demo.payload.json
  node scripts/post-wechat.js --input publish/output/wechat/demo.payload.json --source blog_new/source/_posts/a.md --execute --submit
  node scripts/post-wechat.js --input publish/output/wechat/demo.payload.json --source blog_new/source/_posts/a.md --execute --submit --auto-cover-glm
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

function commandExists(name) {
  const res = spawnSync('sh', ['-lc', `command -v ${name}`], { stdio: 'ignore' });
  return res.status === 0;
}

function sanitizeFileToken(input) {
  return String(input || '').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'wechat';
}

function runCommand(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, options);
  if (res.error) throw res.error;
  if (typeof res.status === 'number' && res.status !== 0) {
    const stderr = options.encoding ? (res.stderr || '') : '';
    const msg = stderr ? `\n${String(stderr).trim()}` : '';
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}${msg}`);
  }
  return res;
}

function resolveBunRunner() {
  if (commandExists('bun')) {
    return { cmd: 'bun', prefix: [] };
  }
  return { cmd: 'npx', prefix: ['-y', 'bun'] };
}

function resolveDefaultProfileDir() {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'wechat-browser-profile');
}

function resolveMarkdownPath(opts, payload) {
  if (opts.source) {
    const resolved = path.resolve(opts.source);
    if (!fs.existsSync(resolved)) {
      throw new Error(`--source not found: ${resolved}`);
    }
    return { markdownPath: resolved, temp: false };
  }

  if (payload.source && fs.existsSync(payload.source)) {
    return { markdownPath: path.resolve(payload.source), temp: false };
  }

  if (typeof payload.markdown === 'string' && payload.markdown.trim()) {
    const tmpPath = path.join(
      os.tmpdir(),
      `wechat-article-${Date.now()}-${Math.random().toString(16).slice(2)}.md`
    );
    fs.writeFileSync(tmpPath, payload.markdown, 'utf8');
    return { markdownPath: tmpPath, temp: true };
  }

  throw new Error('No markdown source found. Provide --source or payload.markdown.');
}

function guessImagesDir(markdownPath) {
  const sameNameDir = markdownPath.replace(/\.md$/i, '');
  if (fs.existsSync(sameNameDir) && fs.statSync(sameNameDir).isDirectory()) {
    return sameNameDir;
  }
  return '';
}

function buildStepArticle(opts, payload, markdownPath, skillDir) {
  const scriptPath = path.join(skillDir, 'scripts', 'wechat-article.ts');
  const args = [scriptPath, '--markdown', markdownPath];

  if (opts.theme) {
    args.push('--theme', opts.theme);
  }
  if (opts.title || payload.title) {
    args.push('--title', opts.title || payload.title);
  }
  if (opts.author) {
    args.push('--author', opts.author);
  }
  if (opts.summary || payload.summary) {
    args.push('--summary', opts.summary || payload.summary);
  }
  if (opts.profile) {
    args.push('--profile', path.resolve(opts.profile));
  }
  if (opts.submit) {
    args.push('--submit');
  }
  if (opts.auditDir) {
    args.push('--audit-dir', path.resolve(opts.auditDir));
  }
  if (opts.auditPrefix) {
    args.push('--audit-prefix', opts.auditPrefix);
  }

  return {
    name: 'article',
    scriptPath,
    args,
    meta: {
      submit: opts.submit,
      mode: 'article',
      theme: opts.theme,
      profile: opts.profile || '',
      auditDir: opts.auditDir || '',
      auditPrefix: opts.auditPrefix || ''
    }
  };
}

function buildStepImageText(opts, payload, markdownPath, skillDir) {
  const scriptPath = path.join(skillDir, 'scripts', 'wechat-browser.ts');
  const args = [scriptPath, '--markdown', markdownPath];

  const imagesDir = opts.imagesDir ? path.resolve(opts.imagesDir) : guessImagesDir(markdownPath);
  if (imagesDir) {
    args.push('--images', imagesDir);
  }

  if (opts.profile) {
    args.push('--profile', path.resolve(opts.profile));
  }
  if (opts.submit) {
    args.push('--submit');
  }

  return {
    name: 'image-text',
    scriptPath,
    args,
    meta: {
      submit: opts.submit,
      mode: 'image-text',
      imagesDir: imagesDir || null,
      profile: opts.profile || ''
    }
  };
}

function buildStep(opts, payload, markdownPath, skillDir) {
  if (!['article', 'image-text'].includes(opts.mode)) {
    throw new Error(`Invalid --mode: ${opts.mode}. Expected article|image-text.`);
  }

  if (opts.mode === 'image-text') {
    return buildStepImageText(opts, payload, markdownPath, skillDir);
  }

  return buildStepArticle(opts, payload, markdownPath, skillDir);
}

function injectCoverIntoMarkdown(markdownPath, coverImagePath) {
  const content = fs.readFileSync(markdownPath, 'utf8');
  const coverLine = `![OpenClaw Cover](${coverImagePath})`;
  let output = '';
  const fmMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (fmMatch) {
    const head = fmMatch[0];
    const body = content.slice(head.length);
    output = `${head}\n${coverLine}\n\n${body}`;
  } else {
    output = `${coverLine}\n\n${content}`;
  }
  const tmpPath = path.join(
    os.tmpdir(),
    `wechat-cover-injected-${Date.now()}-${Math.random().toString(16).slice(2)}.md`
  );
  fs.writeFileSync(tmpPath, output, 'utf8');
  return tmpPath;
}

function generateCoverByGlm(opts, payload) {
  const scriptPath = path.resolve('scripts/wechat-cover-glm.js');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Cover generator script not found: ${scriptPath}`);
  }

  const outputDir = path.resolve(opts.coverOutputDir || 'publish/output/wechat/cover');
  const args = [
    scriptPath,
    '--title', opts.title || payload.title || '',
    '--summary', opts.summary || payload.summary || '',
    '--slug', payload.slug || path.basename(payload.source || 'wechat', '.md'),
    '--output-dir', outputDir,
    '--engine', opts.coverEngine,
    '--variants', String(opts.coverVariants || '1'),
    '--scorer', opts.coverScorer,
    '--score-timeout-ms', String(opts.coverScoreTimeoutMs || '120000'),
    '--gemini-timeout-ms', String(opts.coverGeminiTimeoutMs || '600000'),
    '--gemini-bin', opts.coverGeminiBin,
    '--gemini-include-dirs', opts.coverGeminiIncludeDirs,
    '--codex-bin', opts.coverCodexBin,
    '--codex-cd', path.resolve(opts.coverCodexCd || process.cwd()),
    '--model', opts.coverModel,
    '--size', opts.coverSize,
    '--quality', opts.coverQuality
  ];

  if (opts.coverPrompt) {
    args.push('--prompt', opts.coverPrompt);
  }
  if (!opts.coverGeminiFallbackGlm) {
    args.push('--no-gemini-fallback-glm');
  }
  if (opts.coverScoreModel) {
    args.push('--score-model', opts.coverScoreModel);
  }

  const res = runCommand('node', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: process.env
  });

  let parsed;
  try {
    parsed = JSON.parse(String(res.stdout || '').trim());
  } catch (err) {
    throw new Error(`Invalid GLM cover output: ${(res.stdout || '').toString()}`);
  }

  if (!parsed.coverPath || !fs.existsSync(parsed.coverPath)) {
    throw new Error(`Generated cover not found: ${parsed.coverPath || '(empty)'}`);
  }

  return parsed;
}

function findLatestAuditReport(auditDir, auditPrefix) {
  if (!fs.existsSync(auditDir)) return null;
  const safePrefix = sanitizeFileToken(auditPrefix);
  const files = fs.readdirSync(auditDir)
    .filter((name) => name.endsWith('.json') && name.startsWith(`${safePrefix}-appmsgid-`))
    .map((name) => ({
      name,
      abs: path.join(auditDir, name),
      mtimeMs: fs.statSync(path.join(auditDir, name)).mtimeMs
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (files.length === 0) return null;
  return files[0].abs;
}

function applyGeneratedCover(opts, appmsgid, coverPath, skillDir) {
  const scriptPath = path.resolve('scripts/wechat-cover-apply.ts');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Cover apply script not found: ${scriptPath}`);
  }

  const bun = resolveBunRunner();
  const args = [
    ...bun.prefix,
    scriptPath,
    '--appmsgid', appmsgid,
    '--profile', path.resolve(opts.profile),
    '--cover-path', path.resolve(coverPath),
    '--skill-dir', path.resolve(skillDir),
    '--audit-dir', path.resolve(opts.auditDir),
    '--audit-prefix', opts.auditPrefix,
    '--prefer-ratio', String(opts.coverPreferRatio || '2.35')
  ];

  const res = runCommand(bun.cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: process.env
  });

  const out = String(res.stdout || '').trim();
  if (out) {
    console.log(`[wechat] Cover apply result: ${out}`);
  }
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

  if (!opts.profile) {
    opts.profile = resolveDefaultProfileDir();
  }
  if (!opts.auditDir) {
    opts.auditDir = path.resolve('publish/output/wechat/audit');
  }
  if (!opts.auditPrefix) {
    opts.auditPrefix = path.basename(payloadPath, path.extname(payloadPath));
  }

  const payload = safeReadJson(payloadPath);
  const skillDir = process.env.BAOYU_POST_TO_WECHAT_SKILL_DIR || DEFAULT_SKILL_DIR;

  const { markdownPath, temp } = resolveMarkdownPath(opts, payload);
  let effectiveMarkdownPath = markdownPath;
  let tempCoverInjected = '';
  let generatedCoverPath = '';

  if (opts.autoCoverGlm && !opts.execute) {
    console.warn('[wechat] --auto-cover-glm is skipped in dry-run (without --execute).');
    opts.autoCoverGlm = false;
  } else if (opts.autoCoverGlm && opts.mode !== 'article') {
    console.warn('[wechat] --auto-cover-glm works with --mode article only. Skip cover automation.');
  } else if (opts.autoCoverGlm) {
    if (!opts.submit) {
      console.warn('[wechat] --auto-cover-glm requires --submit to get draft appmsgid. Skip cover automation.');
      opts.autoCoverGlm = false;
    } else {
      if (opts.coverImage) {
        generatedCoverPath = path.resolve(opts.coverImage);
        if (!fs.existsSync(generatedCoverPath)) {
          throw new Error(`--cover-image not found: ${generatedCoverPath}`);
        }
      } else {
        const generated = generateCoverByGlm(opts, payload);
        generatedCoverPath = path.resolve(generated.coverPath);
        console.log(`[wechat] GLM cover generated: ${generatedCoverPath}`);
      }
      tempCoverInjected = injectCoverIntoMarkdown(markdownPath, generatedCoverPath);
      effectiveMarkdownPath = tempCoverInjected;
      console.log(`[wechat] Injected cover image into markdown: ${effectiveMarkdownPath}`);
    }
  }

  const step = buildStep(opts, payload, effectiveMarkdownPath, skillDir);

  if (!fs.existsSync(step.scriptPath)) {
    throw new Error(`WeChat skill script not found: ${step.scriptPath}`);
  }

  const bun = resolveBunRunner();
  const command = [bun.cmd, ...bun.prefix, ...step.args];

  const plan = {
    platform: 'wechat',
    payloadPath,
    mode: opts.mode,
    markdownPath: effectiveMarkdownPath,
    profile: opts.profile,
    execute: opts.execute,
    submit: opts.submit,
    runner: bun,
    step: {
      name: step.name,
      scriptPath: step.scriptPath,
      command,
      meta: step.meta
    }
  };

  console.log(JSON.stringify(plan, null, 2));

  if (!opts.execute) {
    if (temp && fs.existsSync(markdownPath)) fs.unlinkSync(markdownPath);
    if (tempCoverInjected && fs.existsSync(tempCoverInjected)) fs.unlinkSync(tempCoverInjected);
    return;
  }

  const execArgs = [...bun.prefix, ...step.args];
  const res = spawnSync(bun.cmd, execArgs, {
    stdio: 'inherit',
    env: process.env
  });

  if (temp && fs.existsSync(markdownPath)) fs.unlinkSync(markdownPath);
  if (tempCoverInjected && fs.existsSync(tempCoverInjected)) fs.unlinkSync(tempCoverInjected);

  if (typeof res.status === 'number' && res.status !== 0) {
    process.exit(res.status);
  }

  if (opts.autoCoverGlm) {
    const reportPath = findLatestAuditReport(opts.auditDir, opts.auditPrefix);
    if (!reportPath) {
      throw new Error(`Unable to find draft audit report in ${opts.auditDir}.`);
    }
    const report = safeReadJson(reportPath);
    if (!report.appmsgid) {
      throw new Error(`Audit report missing appmsgid: ${reportPath}`);
    }
    console.log(`[wechat] Applying generated cover to draft appmsgid=${report.appmsgid} ...`);
    applyGeneratedCover(opts, report.appmsgid, generatedCoverPath, skillDir);
  }
}

try {
  main();
} catch (err) {
  console.error(`post-wechat failed: ${err.message}`);
  process.exit(1);
}
