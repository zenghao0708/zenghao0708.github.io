#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_SKILL_DIR = '/Users/zenghao/.agents/skills/baoyu-skills/skills/baoyu-post-to-x';
const ROOT_DIR = path.resolve(__dirname, '..');
const BLOG_CONFIG_PATH = path.join(ROOT_DIR, 'blog_new', '_config.yml');
const DEFAULT_PROMO_TEMPLATE = '🆕 新文章已发布：《{title}》\n\n{link}\n\n欢迎交流你的看法。';

function parseArgs(argv) {
  const out = {
    input: '',
    source: '',
    mode: process.env.X_PUBLISH_MODE || 'article',
    title: '',
    cover: process.env.X_DEFAULT_COVER || '',
    execute: false,
    submit: false,
    profile: process.env.X_CHROME_PROFILE || '',
    autoPromo: (process.env.X_ARTICLE_AUTO_PROMO || 'true').toLowerCase() !== 'false',
    promoText: process.env.X_ARTICLE_PROMO_TEXT || '',
    promoUseImage: (process.env.X_ARTICLE_PROMO_USE_IMAGE || 'false').toLowerCase() === 'true'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' && argv[i + 1]) {
      out.input = argv[++i];
    } else if (arg === '--source' && argv[i + 1]) {
      out.source = argv[++i];
    } else if (arg === '--mode' && argv[i + 1]) {
      out.mode = argv[++i];
    } else if (arg === '--title' && argv[i + 1]) {
      out.title = argv[++i];
    } else if (arg === '--cover' && argv[i + 1]) {
      out.cover = argv[++i];
    } else if (arg === '--profile' && argv[i + 1]) {
      out.profile = argv[++i];
    } else if (arg === '--execute') {
      out.execute = true;
    } else if (arg === '--submit') {
      out.submit = true;
    } else if (arg === '--auto-promo') {
      out.autoPromo = true;
    } else if (arg === '--no-auto-promo') {
      out.autoPromo = false;
    } else if (arg === '--promo-text' && argv[i + 1]) {
      out.promoText = argv[++i];
    } else if (arg === '--promo-image') {
      out.promoUseImage = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage(0);
    }
  }

  return out;
}

function printUsage(exitCode) {
  console.log(`Post payload to X using baoyu-post-to-x skill

Usage:
  node scripts/post-x.js --input <payload.json> [options]

Options:
  --source <markdown>       Prefer original markdown for article mode
  --mode <article|tweet>    Default from X_PUBLISH_MODE (article)
  --title <text>            Override title in article mode
  --cover <path>            Cover image path in article mode
  --profile <dir>           Chrome profile dir passed to skill
  --execute                 Actually run X skill script
  --submit                  Publish (otherwise preview/draft)
  --auto-promo              Force auto promo tweet after article publish
  --no-auto-promo           Disable auto promo tweet after article publish
  --promo-text <text>       Override promo tweet text
  --promo-image             Attach first local image in promo tweet
  --help                    Show this help

Examples:
  node scripts/post-x.js --input publish/output/x/demo.payload.json
  node scripts/post-x.js --input publish/output/x/demo.payload.json --source blog_new/source/_posts/a.md --execute --submit
  node scripts/post-x.js --input publish/output/x/demo.payload.json --source blog_new/source/_posts/a.md --execute --submit --auto-promo
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

function resolveBunRunner() {
  if (commandExists('bun')) {
    return { cmd: 'bun', prefix: [] };
  }
  return { cmd: 'npx', prefix: ['-y', 'bun'] };
}

function resolveDefaultProfileDir() {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'x-browser-profile');
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
      `x-article-${Date.now()}-${Math.random().toString(16).slice(2)}.md`
    );
    fs.writeFileSync(tmpPath, payload.markdown, 'utf8');
    return { markdownPath: tmpPath, temp: true };
  }

  if (Array.isArray(payload.thread) && payload.thread.length > 0) {
    const threadMarkdown = [
      `# ${payload.title || 'Untitled'}`,
      '',
      ...payload.thread.map((item, index) => `## ${index + 1}\n\n${item}`)
    ].join('\n\n');

    const tmpPath = path.join(
      os.tmpdir(),
      `x-thread-${Date.now()}-${Math.random().toString(16).slice(2)}.md`
    );
    fs.writeFileSync(tmpPath, threadMarkdown, 'utf8');
    return { markdownPath: tmpPath, temp: true };
  }

  throw new Error('No markdown/thread source found. Provide --source or payload content.');
}

function resolveImages(payload) {
  if (!Array.isArray(payload.images)) {
    return [];
  }
  return payload.images
    .filter((img) => img && img.type === 'local' && img.exists && img.resolvedPath)
    .map((img) => img.resolvedPath)
    .slice(0, 4);
}

function parseSimpleFrontMatter(markdownText) {
  if (!markdownText.startsWith('---\n')) {
    return {};
  }
  const end = markdownText.indexOf('\n---\n', 4);
  if (end === -1) {
    return {};
  }
  const header = markdownText.slice(4, end);
  const out = {};
  for (const line of header.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) {
      continue;
    }
    out[m[1]] = m[2].trim();
  }
  return out;
}

function readHexoSiteConfig() {
  if (!fs.existsSync(BLOG_CONFIG_PATH)) {
    return { url: '', root: '/', permalink: '' };
  }

  const text = fs.readFileSync(BLOG_CONFIG_PATH, 'utf8');
  let url = '';
  let root = '/';
  let permalink = '';

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) {
      continue;
    }
    const key = m[1];
    const value = m[2].trim();
    if (key === 'url' && !url) {
      url = value;
    } else if (key === 'root' && root === '/') {
      root = value || '/';
    } else if (key === 'permalink' && !permalink) {
      permalink = value;
    }
  }

  return { url, root, permalink };
}

function joinUrl(base, part) {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(part || '').replace(/^\/+/, '');
  if (!b) {
    return p ? `/${p}` : '';
  }
  return p ? `${b}/${p}` : `${b}/`;
}

function buildBlogPostUrl(markdownPath, payload) {
  const site = readHexoSiteConfig();
  if (!site.url) {
    return '';
  }

  let fm = {};
  if (markdownPath && fs.existsSync(markdownPath)) {
    const text = fs.readFileSync(markdownPath, 'utf8');
    fm = parseSimpleFrontMatter(text);
  }

  const abbrlink = (fm.abbrlink || '').trim();
  const fileSlug = path.basename(markdownPath || payload.source || '', '.md');
  const titleSlug = String(fileSlug || '')
    .toLowerCase()
    .replace(/[^a-z0-9\-\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let permalinkPath = '';
  if (site.permalink) {
    permalinkPath = site.permalink;
    if (abbrlink) {
      permalinkPath = permalinkPath.replace(':abbrlink', abbrlink);
    }
    if (titleSlug) {
      permalinkPath = permalinkPath.replace(':title', titleSlug);
    }
  }

  if (!permalinkPath) {
    permalinkPath = abbrlink ? `posts/${abbrlink}/` : '';
  }

  if (!permalinkPath && payload.source) {
    permalinkPath = payload.source;
  }

  const base = joinUrl(site.url, site.root || '/');
  return joinUrl(base, permalinkPath);
}

function truncateForTweet(text, limit = 280) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) {
    return clean;
  }
  return `${clean.slice(0, Math.max(0, limit - 1))}…`;
}

function buildPromoTweetText(opts, payload, blogUrl) {
  const template = opts.promoText || process.env.X_ARTICLE_PROMO_TEMPLATE || DEFAULT_PROMO_TEMPLATE;
  const title = opts.title || payload.title || '新文章';
  const summary = payload.summary || '';
  const text = template
    .replaceAll('{title}', title)
    .replaceAll('{summary}', summary)
    .replaceAll('{link}', blogUrl || '');

  return truncateForTweet(text, 280);
}

function buildStepArticle(opts, payload, markdownPath, skillDir) {
  const scriptPath = path.join(skillDir, 'scripts', 'x-article.ts');
  const args = [scriptPath, markdownPath];
  if (opts.title || payload.title) {
    args.push('--title', opts.title || payload.title);
  }
  if (opts.cover) {
    args.push('--cover', path.resolve(opts.cover));
  }
  if (opts.profile) {
    args.push('--profile', path.resolve(opts.profile));
  }
  if (opts.submit) {
    args.push('--submit');
  }

  return {
    name: 'article',
    scriptPath,
    args,
    meta: {
      title: opts.title || payload.title || '',
      submit: opts.submit,
      profile: opts.profile || ''
    }
  };
}

function buildStepTweet(opts, payload, skillDir, textOverride) {
  const scriptPath = path.join(skillDir, 'scripts', 'x-browser.ts');
  const thread = Array.isArray(payload.thread) ? payload.thread : [];
  const text = textOverride || thread[0] || payload.summary || payload.title || '';
  if (!text) {
    throw new Error('tweet mode requires payload.thread[0] or summary/title.');
  }

  const args = [scriptPath, text];
  const images = resolveImages(payload);
  if (opts.promoUseImage) {
    for (const image of images.slice(0, 1)) {
      args.push('--image', image);
    }
  }

  if (opts.profile) {
    args.push('--profile', path.resolve(opts.profile));
  }
  if (opts.submit) {
    args.push('--submit');
  }

  return {
    name: 'tweet',
    scriptPath,
    args,
    meta: {
      text,
      submit: opts.submit,
      profile: opts.profile || '',
      imageCount: opts.promoUseImage ? Math.min(images.length, 1) : 0
    }
  };
}

function buildSteps(opts, payload, markdownPath, skillDir) {
  if (!['article', 'tweet'].includes(opts.mode)) {
    throw new Error(`Invalid --mode: ${opts.mode}. Expected article|tweet.`);
  }

  if (opts.mode === 'tweet') {
    return [buildStepTweet(opts, payload, skillDir, '')];
  }

  const steps = [buildStepArticle(opts, payload, markdownPath, skillDir)];

  // Auto promo applies to article publish flow.
  if (opts.submit && opts.autoPromo) {
    const blogUrl = buildBlogPostUrl(markdownPath, payload);
    const promoText = buildPromoTweetText(opts, payload, blogUrl);
    steps.push(buildStepTweet(opts, payload, skillDir, promoText));
  }

  return steps;
}

function runStep(step, bun) {
  const execArgs = [...bun.prefix, ...step.args];
  const res = spawnSync(bun.cmd, execArgs, {
    stdio: 'inherit',
    env: process.env
  });

  if (res.error) {
    throw res.error;
  }

  if (typeof res.status === 'number' && res.status !== 0) {
    throw new Error(`Step failed: ${step.name} (exit ${res.status})`);
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

  const payload = safeReadJson(payloadPath);
  const skillDir = process.env.BAOYU_POST_TO_X_SKILL_DIR || DEFAULT_SKILL_DIR;

  const { markdownPath, temp } = resolveMarkdownPath(opts, payload);
  const steps = buildSteps(opts, payload, markdownPath, skillDir);

  for (const step of steps) {
    if (!fs.existsSync(step.scriptPath)) {
      throw new Error(`X skill script not found: ${step.scriptPath}`);
    }
  }

  const bun = resolveBunRunner();
  const plan = {
    platform: 'x',
    payloadPath,
    mode: opts.mode,
    markdownPath,
    profile: opts.profile,
    autoPromo: opts.autoPromo,
    execute: opts.execute,
    submit: opts.submit,
    runner: bun,
    steps: steps.map((step) => ({
      name: step.name,
      scriptPath: step.scriptPath,
      command: [bun.cmd, ...bun.prefix, ...step.args],
      meta: step.meta
    }))
  };

  console.log(JSON.stringify(plan, null, 2));

  if (!opts.execute) {
    if (temp) {
      fs.unlinkSync(markdownPath);
    }
    return;
  }

  for (const step of steps) {
    runStep(step, bun);
  }

  if (temp) {
    fs.unlinkSync(markdownPath);
  }
}

try {
  main();
} catch (err) {
  console.error(`post-x failed: ${err.message}`);
  process.exit(1);
}
