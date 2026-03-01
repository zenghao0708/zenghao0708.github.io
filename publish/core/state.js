'use strict';

const crypto = require('crypto');
const { LOG_FILE, STATE_FILE } = require('./constants');
const { appendUtf8, exists, readUtf8, writeUtf8 } = require('./fs-utils');

function nowIso() {
  return new Date().toISOString();
}

function hashForPostPlatform(post, platform, payload) {
  const digest = crypto.createHash('sha256');
  digest.update(platform);
  digest.update(post.title || '');
  digest.update(post.body || '');
  digest.update(JSON.stringify(payload || {}));
  return digest.digest('hex');
}

function loadState() {
  if (!exists(STATE_FILE)) {
    return { posts: {} };
  }

  try {
    return JSON.parse(readUtf8(STATE_FILE));
  } catch (_err) {
    return { posts: {} };
  }
}

function saveState(state) {
  writeUtf8(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function upsertPublishState(state, { sourcePath, platform, hash, result }) {
  if (!state.posts[sourcePath]) {
    state.posts[sourcePath] = { platforms: {} };
  }

  if (!state.posts[sourcePath].platforms[platform]) {
    state.posts[sourcePath].platforms[platform] = {};
  }

  state.posts[sourcePath].platforms[platform] = {
    hash,
    lastPublishedAt: nowIso(),
    result
  };
}

function getPublishState(state, sourcePath, platform) {
  return state.posts[sourcePath] && state.posts[sourcePath].platforms
    ? state.posts[sourcePath].platforms[platform]
    : null;
}

function appendLog(event) {
  appendUtf8(LOG_FILE, `${JSON.stringify({ ts: nowIso(), ...event })}\n`);
}

module.exports = {
  hashForPostPlatform,
  loadState,
  saveState,
  upsertPublishState,
  getPublishState,
  appendLog
};
