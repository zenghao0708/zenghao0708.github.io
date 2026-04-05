#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage(code = 0) {
  console.log(`Usage:
  node scripts/article-quality-score.js <markdown-file>
`);
  process.exit(code);
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontMatter: {}, body: raw };
  }
  const frontMatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) {
      frontMatter[m[1]] = m[2];
    }
  }
  return { frontMatter, body: raw.slice(match[0].length) };
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function scoreArticle(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { frontMatter, body } = parseFrontMatter(raw);
  const title = frontMatter.title || '';
  const description = frontMatter.description || '';
  const hasMore = body.includes('<!-- more -->');
  const h2Count = countMatches(body, /^##\s+/gm);
  const imageCount = countMatches(body, /!\[[^\]]*\]\([^)]+\)/g);
  const internalPostLinks = countMatches(body, /\]\(\/posts\/[^)]+\)/g);
  const actionSignals = countMatches(body, /(建议|先做|怎么做|如果你也在做|最值得|可以直接|检查清单|Checklist|延伸阅读)/g);
  const evidenceSignals = countMatches(body, /(源码|模块|QueryEngine|query\.ts|tool|compact|permissions|日志|截图|结构图|流程图|例子|案例)/g);
  const positioningSignals = countMatches(body, /(这篇是|适合.*看|快速判断版|导读版|主稿|这篇文章的任务|如果你只想|延伸阅读)/g);

  let positioning = 0;
  if (title && description && positioningSignals >= 2) positioning = 2.0;
  else if (title && description) positioning = 1.2;
  else positioning = 0.5;

  let structure = 0;
  if (hasMore && h2Count >= 5 && h2Count <= 12) structure = 2.0;
  else if (h2Count >= 4) structure = 1.3;
  else structure = 0.6;

  let actionability = 0;
  if (actionSignals >= 5) actionability = 2.5;
  else if (actionSignals >= 2) actionability = 1.7;
  else actionability = 0.8;

  let evidence = 0;
  if (evidenceSignals >= 20) evidence = 1.5;
  else if (evidenceSignals >= 10) evidence = 1.0;
  else evidence = 0.4;

  let visuals = 0;
  if (imageCount >= 3) visuals = 1.0;
  else if (imageCount >= 1) visuals = 0.6;
  else visuals = 0;

  let differentiation = 0;
  if (internalPostLinks >= 2 && positioningSignals >= 3) differentiation = 1.0;
  else if (internalPostLinks >= 1 || positioningSignals >= 2) differentiation = 0.6;
  else differentiation = 0.2;

  const vetoes = [];
  if (!title || !description || !frontMatter.abbrlink) {
    vetoes.push('缺少完整 front matter');
  }
  if (!hasMore) {
    vetoes.push('缺少 <!-- more -->');
  }
  if (positioningSignals < 1) {
    vetoes.push('开头没有明确文章定位');
  }
  if (actionSignals < 2) {
    vetoes.push('可执行建议不足');
  }
  if (imageCount === 0) {
    vetoes.push('缺少配图');
  }

  const rawScore = positioning + structure + actionability + evidence + visuals + differentiation;
  const cappedScore = vetoes.length > 0 ? Math.min(rawScore, 8.5) : rawScore;

  return {
    filePath: path.resolve(filePath),
    title,
    metrics: {
      h2Count,
      imageCount,
      internalPostLinks,
      actionSignals,
      evidenceSignals,
      positioningSignals
    },
    score: {
      positioning,
      structure,
      actionability,
      evidence,
      visuals,
      differentiation,
      raw: Number(rawScore.toFixed(1)),
      final: Number(cappedScore.toFixed(1))
    },
    vetoes
  };
}

function main() {
  const input = process.argv[2];
  if (!input) usage(1);
  const filePath = path.resolve(input);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  console.log(JSON.stringify(scoreArticle(filePath), null, 2));
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
