'use strict';

const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function listFilesRecursive(dirPath, extFilter) {
  const out = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(fullPath, extFilter));
      continue;
    }

    if (!extFilter || fullPath.endsWith(extFilter)) {
      out.push(fullPath);
    }
  }

  return out;
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeUtf8(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function appendUtf8(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, content, 'utf8');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

module.exports = {
  ensureDir,
  listFilesRecursive,
  readUtf8,
  writeUtf8,
  appendUtf8,
  exists
};
