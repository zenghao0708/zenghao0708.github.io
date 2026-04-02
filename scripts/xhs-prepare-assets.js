#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { readPost, stripMarkdown } = require('../publish/core/markdown');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'publish', 'output', 'xhs');
const ICLOUD_BASE = path.join(
  process.env.HOME || '',
  'Library/Mobile Documents/com~apple~CloudDocs',
  'AI 文档',
  '小红书'
);
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1440;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeSegment(value, fallback = 'untitled') {
  const clean = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
  return clean || fallback;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  const raw = String(value || '').trim();
  if (!raw) {
    return [];
  }
  const bracketMatch = raw.match(/^\[(.*)\]$/);
  if (bracketMatch) {
    return bracketMatch[1]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [raw];
}

function getDateParts(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    year,
    month,
    day,
    ymd: `${year}${month}${day}`,
    ym: `${year}-${month}`
  };
}

function inferTheme(post) {
  const tags = normalizeList(post.frontMatter.tags);
  const raw = `${post.title}\n${tags.join(' ')}\n${post.summary}\n${post.body}`;
  const themeMap = [
    { label: '命令行效率', patterns: ['命令行', 'zsh', 'shell', '终端', 'oh-my-zsh', 'Ghostty', 'tmux'] },
    { label: 'AI 编码', patterns: ['AI 编码', 'Codex', 'Claude', 'Cursor', 'OpenAI', 'Agent'] },
    { label: '开发工具', patterns: ['工具', '效率', '开发', '工程', 'workflow', '工作流'] },
    { label: 'Mac 配置', patterns: ['Mac', 'macOS', 'Homebrew', 'iTerm', 'Ghostty'] }
  ];

  for (const item of themeMap) {
    if (item.patterns.some((pattern) => raw.toLowerCase().includes(pattern.toLowerCase()))) {
      return item.label;
    }
  }

  if (tags.length > 0) {
    return String(tags[0]);
  }

  return '未分类主题';
}

function compactLine(line) {
  return String(line || '')
    .replace(/\{%\s*asset_img[^%]+%\}/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '$1')
    .replace(/[>*_~#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(body) {
  const lines = body.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^##+\s+(.+)$/);
    if (heading) {
      if (current) {
        sections.push(current);
      }
      current = { title: compactLine(heading[1]), lines: [] };
      continue;
    }

    if (!current) {
      continue;
    }

    const clean = compactLine(line);
    if (clean) {
      current.lines.push(clean);
    }
  }

  if (current) {
    sections.push(current);
  }

  return sections
    .map((section) => ({
      title: section.title,
      text: section.lines.join(' ').trim()
    }))
    .filter((section) => section.title && section.text);
}

function splitSentences(text) {
  return stripMarkdown(text)
    .split(/[。！？!?]/)
    .map((line) => compactLine(line))
    .filter(Boolean);
}

function pickKeyPoints(post) {
  const sentences = splitSentences(post.body);
  return sentences.filter((line) => line.length >= 16).slice(0, 6);
}

function deriveCards(post) {
  const sections = extractHeadings(post.body);
  const keyPoints = pickKeyPoints(post);
  const summary = compactLine(post.summary).slice(0, 88);
  const sectionsWithSignals = sections.filter((section) => section.text.length >= 24);

  const problemSection = sectionsWithSignals.find((item) =>
    /为什么|前言|问题|背景|症状|原因/.test(item.title)
  ) || sectionsWithSignals[0];

  const compareSection = sectionsWithSignals.find((item) =>
    /迁走|迁移|old|new|对比|结构|边界|职责/.test(item.title)
  ) || sectionsWithSignals[1] || problemSection;

  const checklistSection = sectionsWithSignals.find((item) =>
    /提醒|原则|收口|最后|建议|checklist|验证/.test(item.title)
  ) || sectionsWithSignals[sectionsWithSignals.length - 1] || problemSection;

  const cards = [
    {
      type: 'cover',
      title: compactLine(post.title).slice(0, 28),
      subtitle: summary,
      badge: inferTheme(post),
      footer: '01 / 04'
    },
    {
      type: 'problem',
      title: problemSection ? problemSection.title : '为什么要迁移',
      lead: problemSection ? problemSection.text.slice(0, 72) : summary,
      bullets: keyPoints.slice(0, 3),
      footer: '02 / 04'
    },
    {
      type: 'compare',
      title: compareSection ? compareSection.title : '迁移后的结构变化',
      lead: compareSection ? compareSection.text.slice(0, 72) : summary,
      leftTitle: '旧栈',
      rightTitle: '新栈',
      leftItems: ['大一统 shell 入口', '插件 / PATH / 运行时互相缠绕', '出问题需要整段排查'],
      rightItems: ['按职责拆层', '插件 / prompt / 历史 / 跳转 / 运行时独立', '每一层都可验证与回滚'],
      footer: '03 / 04'
    },
    {
      type: 'checklist',
      title: checklistSection ? checklistSection.title : '迁移 checklist',
      lead: checklistSection ? checklistSection.text.slice(0, 66) : summary,
      bullets: keyPoints.slice(3, 6).concat([
        '先拆结构，再切换默认入口',
        '保留回滚路径和验证命令'
      ]).slice(0, 4),
      footer: '04 / 04'
    }
  ];

  return cards;
}

function buildXhsCopy(post) {
  const title = compactLine(post.title).slice(0, 20);
  const keyPoints = pickKeyPoints(post).slice(0, 5);
  const tags = normalizeList(post.frontMatter.tags)
    .map((tag) => `#${String(tag).replace(/^#/, '')}`)
    .slice(0, 5);
  const contentLines = [
    compactLine(post.summary),
    '',
    ...keyPoints.map((line, idx) => `${idx + 1}. ${line}`),
    '',
    '如果你也在迁移命令行环境，最重要的不是换哪个工具，而是先把职责边界拆清楚。'
  ].filter(Boolean);

  return {
    title,
    content: contentLines.join('\n'),
    tags
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapHtml(body) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: ${CARD_WIDTH}px;
      height: ${CARD_HEIGHT}px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      color: #132238;
      background:
        radial-gradient(circle at top right, rgba(56, 189, 248, 0.20), transparent 30%),
        radial-gradient(circle at bottom left, rgba(20, 184, 166, 0.16), transparent 28%),
        linear-gradient(160deg, #eef9f8 0%, #f9fcff 100%);
    }
    .page {
      width: 100%;
      height: 100%;
      padding: 70px;
      position: relative;
    }
    .badge {
      display: inline-flex;
      padding: 12px 22px;
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.10);
      color: #0f766e;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    h1 {
      margin: 28px 0 18px;
      font-size: 78px;
      line-height: 1.08;
      letter-spacing: -0.04em;
      color: #0f172a;
    }
    p {
      margin: 0;
      font-size: 34px;
      line-height: 1.65;
      color: #415a73;
    }
    .panel {
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 34px;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(12px);
    }
    .tokens {
      display: grid;
      gap: 16px;
      margin-top: 22px;
    }
    .token {
      padding: 18px 22px;
      border-radius: 20px;
      font-size: 28px;
      line-height: 1.45;
      font-weight: 700;
      background: #f7ffff;
      color: #155e75;
      border: 1px solid rgba(8, 145, 178, 0.10);
    }
    .muted {
      background: #fff9f4;
      color: #9a3412;
      border-color: rgba(180, 83, 9, 0.12);
    }
    .steps {
      margin-top: 34px;
      display: grid;
      gap: 18px;
    }
    .step {
      display: grid;
      grid-template-columns: 64px 1fr;
      gap: 18px;
      align-items: start;
    }
    .num {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(160deg, #0f766e 0%, #14b8a6 100%);
    }
    .foot {
      position: absolute;
      left: 70px;
      right: 70px;
      bottom: 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 24px;
      color: #55718b;
    }
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
    }
    .col-title {
      font-size: 26px;
      color: #4b6b88;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function renderCard(card) {
  if (card.type === 'cover') {
    return wrapHtml(`
      <div class="page">
        <div class="badge">${escapeHtml(card.badge)}</div>
        <h1>${escapeHtml(card.title).replace(/\s+/g, '<br />')}</h1>
        <p>${escapeHtml(card.subtitle)}</p>
        <div class="panel" style="margin-top:46px; padding:30px;">
          <div class="tokens">
            <div class="token">从“大一统入口”回到按职责拆层</div>
            <div class="token">更容易验证，也更容易回滚</div>
            <div class="token">适合长期演进的命令行工作流</div>
          </div>
        </div>
        <div class="foot"><span>自动生成的小红书素材</span><span>${escapeHtml(card.footer)}</span></div>
      </div>
    `);
  }

  if (card.type === 'compare') {
    return wrapHtml(`
      <div class="page">
        <div class="badge">STRUCTURE</div>
        <h1>${escapeHtml(card.title)}</h1>
        <p>${escapeHtml(card.lead)}</p>
        <div class="compare">
          <div class="panel" style="padding:26px;">
            <div class="col-title">${escapeHtml(card.leftTitle)}</div>
            <div class="tokens">
              ${card.leftItems.map((item) => `<div class="token muted">${escapeHtml(item)}</div>`).join('')}
            </div>
          </div>
          <div class="panel" style="padding:26px;">
            <div class="col-title">${escapeHtml(card.rightTitle)}</div>
            <div class="tokens">
              ${card.rightItems.map((item) => `<div class="token">${escapeHtml(item)}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="foot"><span>重点是边界清晰</span><span>${escapeHtml(card.footer)}</span></div>
      </div>
    `);
  }

  return wrapHtml(`
    <div class="page">
      <div class="badge">${card.type === 'problem' ? 'WHY NOW' : 'CHECKLIST'}</div>
      <h1>${escapeHtml(card.title)}</h1>
      <p>${escapeHtml(card.lead)}</p>
      <div class="panel" style="margin-top:34px; padding:30px;">
        <div class="steps">
          ${card.bullets.map((item, idx) => `
            <div class="step">
              <div class="num">${idx + 1}</div>
              <p>${escapeHtml(item)}</p>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="foot"><span>按时间与主题归档</span><span>${escapeHtml(card.footer)}</span></div>
    </div>
  `);
}

async function renderCards(cards, outputDir) {
  ensureDir(outputDir);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: CARD_WIDTH, height: CARD_HEIGHT, deviceScaleFactor: 1 });
  const results = [];

  try {
    for (let i = 0; i < cards.length; i += 1) {
      const filename = `${String(i + 1).padStart(2, '0')}-${cards[i].type}.png`;
      const htmlName = `${String(i + 1).padStart(2, '0')}-${cards[i].type}.html`;
      const pngPath = path.join(outputDir, filename);
      const htmlPath = path.join(outputDir, htmlName);
      const html = renderCard(cards[i]);

      fs.writeFileSync(htmlPath, html, 'utf8');
      await page.setContent(html, { waitUntil: 'load', timeout: 0 });
      await page.screenshot({ path: pngPath, type: 'png' });
      results.push({ pngPath, htmlPath });
    }
  } finally {
    await browser.close();
  }

  return results;
}

function buildTargetDirs(post) {
  const dateParts = getDateParts(post.date);
  const theme = inferTheme(post);
  const slugDir = `${dateParts.ymd}_${sanitizeSegment(post.slug)}`;
  const repoDir = path.join(OUTPUT_ROOT, 'generated', sanitizeSegment(post.slug));
  const icloudDir = path.join(
    ICLOUD_BASE,
    dateParts.year,
    dateParts.ym,
    sanitizeSegment(theme, '主题'),
    slugDir
  );

  return {
    repoDir,
    icloudDir,
    theme,
    dateParts
  };
}

function copyFiles(files, targetDir) {
  ensureDir(targetDir);
  for (const filePath of files) {
    const targetPath = path.join(targetDir, path.basename(filePath));
    fs.copyFileSync(filePath, targetPath);
  }
}

function writeTextArtifacts(targetDir, post, xhsCopy, generatedImages, theme) {
  const publishText = [
    `标题：${xhsCopy.title}`,
    '',
    '正文：',
    xhsCopy.content,
    '',
    `话题：${xhsCopy.tags.join(' ')}`,
    '',
    `主题：${theme}`,
    `来源：${post.sourcePath}`,
    '',
    '图片顺序：',
    ...generatedImages.map((img, idx) => `${idx + 1}. ${path.basename(img)}`)
  ].join('\n');

  fs.writeFileSync(path.join(targetDir, '发布内容.txt'), publishText, 'utf8');
  fs.writeFileSync(
    path.join(targetDir, 'payload.json'),
    JSON.stringify({
      title: xhsCopy.title,
      content: xhsCopy.content,
      tags: xhsCopy.tags,
      images: generatedImages.map((img) => path.basename(img)),
      source: post.sourcePath,
      theme
    }, null, 2),
    'utf8'
  );
}

async function prepareXhsAssetsFromPost(post) {
  const { repoDir, icloudDir, theme } = buildTargetDirs(post);
  const cards = deriveCards(post);
  const xhsCopy = buildXhsCopy(post);
  const generated = await renderCards(cards, repoDir);
  const imagePaths = generated.map((item) => item.pngPath);
  const allArtifacts = generated.flatMap((item) => [item.pngPath, item.htmlPath]);

  if (fs.existsSync(path.dirname(ICLOUD_BASE))) {
    copyFiles(allArtifacts, icloudDir);
    writeTextArtifacts(icloudDir, post, xhsCopy, imagePaths, theme);
  }

  return {
    title: xhsCopy.title,
    content: xhsCopy.content,
    caption: xhsCopy.content,
    tags: xhsCopy.tags,
    images: imagePaths,
    theme,
    repoDir,
    icloudDir
  };
}

async function prepareXhsAssetsFromFile(markdownFile) {
  const post = readPost(path.resolve(markdownFile));
  return prepareXhsAssetsFromPost(post);
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/xhs-prepare-assets.js <markdown-file>');
    process.exit(1);
  }

  const result = await prepareXhsAssetsFromFile(input);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  prepareXhsAssetsFromPost,
  prepareXhsAssetsFromFile,
  inferTheme
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : String(error));
    process.exit(1);
  });
}
