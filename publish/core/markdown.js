'use strict';

const path = require('path');
const { BLOG_SOURCE_ROOT } = require('./constants');
const { exists, readUtf8 } = require('./fs-utils');

function coerceValue(raw) {
  const value = raw.trim();
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

function parseFrontMatter(text) {
  if (!text.startsWith('---\n')) {
    return { frontMatter: {}, body: text };
  }

  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    return { frontMatter: {}, body: text };
  }

  const headerRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  const lines = headerRaw.split(/\r?\n/);
  const frontMatter = {};

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const topLevel = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!topLevel) {
      continue;
    }

    const key = topLevel[1];
    const valuePart = topLevel[2];

    if (valuePart) {
      frontMatter[key] = coerceValue(valuePart);
      continue;
    }

    const arr = [];
    let j = i + 1;
    while (j < lines.length) {
      const arrayLine = lines[j].match(/^\s*-\s*(.*)$/);
      if (!arrayLine) {
        break;
      }
      arr.push(coerceValue(arrayLine[1]));
      j += 1;
    }

    if (arr.length > 0) {
      frontMatter[key] = arr;
      i = j - 1;
    } else {
      frontMatter[key] = '';
    }
  }

  return { frontMatter, body };
}

function extractFirstUrlToken(raw) {
  let link = raw.trim();
  if (link.startsWith('<') && link.endsWith('>')) {
    link = link.slice(1, -1);
  }
  const spaceIdx = link.search(/\s/);
  if (spaceIdx !== -1) {
    link = link.slice(0, spaceIdx);
  }
  return link;
}

function resolveImagePath(markdownPath, imageRef) {
  if (/^(https?:)?\/\//.test(imageRef) || imageRef.startsWith('data:')) {
    return { type: 'remote', resolvedPath: imageRef, exists: true };
  }

  let resolvedPath;
  if (imageRef.startsWith('/')) {
    resolvedPath = path.join(BLOG_SOURCE_ROOT, imageRef.slice(1));
  } else {
    resolvedPath = path.resolve(path.dirname(markdownPath), imageRef);
  }

  return {
    type: 'local',
    resolvedPath,
    exists: exists(resolvedPath)
  };
}

function extractImages(markdownPath, body) {
  const images = [];

  const mdImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = mdImagePattern.exec(body)) !== null) {
    const alt = (match[1] || '').trim();
    const ref = extractFirstUrlToken(match[2] || '');
    const resolved = resolveImagePath(markdownPath, ref);

    images.push({
      syntax: 'markdown',
      alt,
      ref,
      ...resolved
    });
  }

  const htmlImagePattern = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlImagePattern.exec(body)) !== null) {
    const ref = extractFirstUrlToken(match[1] || '');
    const resolved = resolveImagePath(markdownPath, ref);

    images.push({
      syntax: 'html',
      alt: '',
      ref,
      ...resolved
    });
  }

  return images;
}

function stripMarkdown(raw) {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '$1')
    .replace(/[>#*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readPost(markdownPath) {
  const raw = readUtf8(markdownPath);
  const { frontMatter, body } = parseFrontMatter(raw);
  const images = extractImages(markdownPath, body);
  const slug = path.basename(markdownPath, '.md');

  return {
    sourcePath: markdownPath,
    slug,
    frontMatter,
    body,
    raw,
    images,
    title: frontMatter.title || slug,
    date: frontMatter.date || '',
    description: frontMatter.description || '',
    summary: frontMatter.description || stripMarkdown(body).slice(0, 180)
  };
}

module.exports = {
  parseFrontMatter,
  readPost,
  stripMarkdown
};
