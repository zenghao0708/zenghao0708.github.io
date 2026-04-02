'use strict';

const { buildPlatformPayload } = require('../core/content');
const { prepareXhsAssetsFromPost } = require('../../scripts/xhs-prepare-assets');
const { publishByCommand, writePreview } = require('./base');

async function publish(post, ctx) {
  const payload = buildPlatformPayload(post, 'xhs');
  const prepared = await prepareXhsAssetsFromPost(post);
  payload.title = prepared.title || payload.title;
  payload.content = prepared.content || payload.content || payload.caption;
  payload.caption = prepared.caption || payload.caption || payload.content;
  payload.tags = Array.isArray(prepared.tags) ? prepared.tags : payload.tags;
  payload.images = Array.isArray(prepared.images) && prepared.images.length > 0
    ? prepared.images
    : payload.images;
  payload.theme = prepared.theme;
  payload.icloudDir = prepared.icloudDir;
  payload.assetDir = prepared.repoDir;

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
