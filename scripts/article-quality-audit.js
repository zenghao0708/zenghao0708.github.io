#!/usr/bin/env node
'use strict';

const { POSTS_ROOT } = require('../publish/core/constants');
const { listFilesRecursive } = require('../publish/core/fs-utils');
const { readPost } = require('../publish/core/markdown');
const { scoreArticleFromPost, writeQualityReport } = require('../publish/core/article-quality');

function parseArgs(argv) {
  const out = {
    minScore: 9.0,
    top: 20,
    includeUnpublished: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--min-score' && argv[i + 1]) {
      out.minScore = Number(argv[++i]);
    } else if (arg === '--top' && argv[i + 1]) {
      out.top = Number(argv[++i]);
    } else if (arg === '--include-unpublished') {
      out.includeUnpublished = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/article-quality-audit.js [--min-score 9] [--top 20] [--include-unpublished]');
      process.exit(0);
    }
  }

  return out;
}

function isPublished(post) {
  return post.frontMatter.published !== false && post.frontMatter.draft !== true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = listFilesRecursive(POSTS_ROOT, '.md').sort();
  const results = [];

  for (const file of files) {
    const post = readPost(file);
    if (!args.includeUnpublished && !isPublished(post)) {
      continue;
    }
    results.push(scoreArticleFromPost(post));
  }

  results.sort((a, b) => a.score.final - b.score.final);
  const low = results.filter((item) => item.score.final < args.minScore);
  const report = {
    generatedAt: new Date().toISOString(),
    minScore: args.minScore,
    total: results.length,
    belowThreshold: low.length,
    lowest: results.slice(0, Math.max(1, args.top)),
    low
  };

  const reportPath = writeQualityReport(
    {
      slug: 'all-posts-audit',
      title: 'all-posts-audit',
      metrics: { total: results.length, belowThreshold: low.length },
      score: { raw: 0, final: low.length === 0 ? args.minScore : low[0].score.final },
      vetoes: [],
      report
    },
    { suffix: 'audit' }
  );

  console.log(JSON.stringify({ reportPath, total: results.length, belowThreshold: low.length, low }, null, 2));
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
