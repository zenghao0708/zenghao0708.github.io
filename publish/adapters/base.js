'use strict';

const path = require('path');
const { OUTPUT_ROOT } = require('../core/constants');
const { writeUtf8 } = require('../core/fs-utils');
const { runTemplatedCommand } = require('../core/command');

function writePreview(platform, post, payload) {
  const previewPath = path.join(OUTPUT_ROOT, platform, `${post.slug}.preview.md`);

  const body = [
    `# ${platform} preview`,
    '',
    `- title: ${post.title}`,
    `- source: ${post.sourcePath}`,
    '',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
    ''
  ].join('\n');

  writeUtf8(previewPath, body);
  return previewPath;
}

function publishByCommand({ envKey, platform, post, payload }) {
  const cmdTemplate = process.env[envKey];
  if (!cmdTemplate) {
    throw new Error(
      `${platform}: missing ${envKey}. Set it in .env to enable --publish mode.`
    );
  }

  const outputPath = path.join(OUTPUT_ROOT, platform, `${post.slug}.payload.json`);
  writeUtf8(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  const stdout = runTemplatedCommand(cmdTemplate, {
    file: outputPath,
    source: post.sourcePath,
    title: post.title,
    slug: post.slug,
    platform
  });

  return {
    command: cmdTemplate,
    outputPath,
    stdout
  };
}

module.exports = {
  writePreview,
  publishByCommand
};
