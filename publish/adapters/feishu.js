'use strict';

const { buildPlatformPayload } = require('../core/content');
const { publishByCommand, writePreview } = require('./base');

async function publish(post, ctx) {
  const payload = buildPlatformPayload(post, 'feishu');

  const previewPath = writePreview('feishu', post, payload);
  if (ctx.dryRun) {
    return {
      mode: 'dry-run',
      previewPath,
      payload
    };
  }

  const cmdResult = publishByCommand({
    envKey: 'PUBLISH_FEISHU_CMD',
    platform: 'feishu',
    post,
    payload
  });

  return {
    mode: 'publish',
    previewPath,
    ...cmdResult
  };
}

module.exports = { publish };
