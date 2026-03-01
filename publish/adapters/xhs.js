'use strict';

const { buildPlatformPayload } = require('../core/content');
const { publishByCommand, writePreview } = require('./base');

async function publish(post, ctx) {
  const payload = buildPlatformPayload(post, 'xhs');

  const previewPath = writePreview('xhs', post, payload);
  if (ctx.dryRun) {
    return {
      mode: 'dry-run',
      previewPath,
      payload
    };
  }

  const cmdResult = publishByCommand({
    envKey: 'PUBLISH_XHS_CMD',
    platform: 'xhs',
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
