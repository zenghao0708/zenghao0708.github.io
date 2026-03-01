'use strict';

const { stripMarkdown } = require('./markdown');

function buildXThread(post, limit) {
  const cleaned = stripMarkdown(post.body);
  const intro = `${post.title}\n\n${post.summary || cleaned.slice(0, 180)}`.trim();
  const blocks = [intro];

  const paragraphs = cleaned
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    if (paragraph.length < 40) {
      continue;
    }
    blocks.push(paragraph);
    if (blocks.length >= 8) {
      break;
    }
  }

  const tweets = [];
  let current = '';
  for (const block of blocks) {
    if (!current) {
      current = block;
      continue;
    }

    const candidate = `${current}\n\n${block}`;
    if (candidate.length <= limit) {
      current = candidate;
    } else {
      tweets.push(current);
      current = block;
    }
  }

  if (current) {
    tweets.push(current);
  }

  const normalized = tweets
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((t, idx, arr) => {
      if (arr.length <= 1) {
        return t;
      }
      return `${t}\n\n${idx + 1}/${arr.length}`;
    });

  return normalized;
}

function buildPlatformPayload(post, platform) {
  if (platform === 'x') {
    return {
      title: post.title,
      summary: post.summary,
      thread: buildXThread(post, 260),
      markdown: post.raw,
      source: post.sourcePath,
      images: post.images
    };
  }

  if (platform === 'xhs') {
    const bullets = stripMarkdown(post.body)
      .split(/[。！？!?]/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((line, idx) => `${idx + 1}. ${line}`);

    return {
      title: post.title,
      caption: `${post.summary}\n\n${bullets.join('\n')}`,
      source: post.sourcePath,
      images: post.images
    };
  }

  return {
    title: post.title,
    summary: post.summary,
    markdown: post.raw,
    source: post.sourcePath,
    images: post.images
  };
}

module.exports = {
  buildPlatformPayload
};
