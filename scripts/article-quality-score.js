#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { scoreArticleFile } = require('../publish/core/article-quality');

function usage(code = 0) {
  console.log(`Usage:
  node scripts/article-quality-score.js <markdown-file>
`);
  process.exit(code);
}

function main() {
  const input = process.argv[2];
  if (!input) usage(1);
  const filePath = path.resolve(input);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  console.log(JSON.stringify(scoreArticleFile(filePath), null, 2));
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
