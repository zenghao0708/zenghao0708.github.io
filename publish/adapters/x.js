'use strict';

const { buildPlatformPayload } = require('../core/content');
const { publishByCommand, writePreview } = require('./base');

async function publish(post, ctx) {
  const payload = buildPlatformPayload(post, 'x');

  const previewPath = writePreview('x', post, payload);
  if (ctx.dryRun) {
    return {
      mode: 'dry-run',
      previewPath,
      payload
    };
  }

  const cmdResult = publishByCommand({
    envKey: 'PUBLISH_X_CMD',
    platform: 'x',
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
