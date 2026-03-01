'use strict';

const { buildPlatformPayload } = require('../core/content');
const { publishByCommand, writePreview } = require('./base');

async function publish(post, ctx) {
  const payload = buildPlatformPayload(post, 'wechat');

  const previewPath = writePreview('wechat', post, payload);
  if (ctx.dryRun) {
    return {
      mode: 'dry-run',
      previewPath,
      payload
    };
  }

  const cmdResult = publishByCommand({
    envKey: 'PUBLISH_WECHAT_CMD',
    platform: 'wechat',
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
