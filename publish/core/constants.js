'use strict';

const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const BLOG_ROOT = path.join(ROOT_DIR, 'blog_new');
const POSTS_ROOT = path.join(BLOG_ROOT, 'source', '_posts');
const BLOG_SOURCE_ROOT = path.join(BLOG_ROOT, 'source');
const PUBLISH_ROOT = path.join(ROOT_DIR, 'publish');
const STATE_FILE = path.join(PUBLISH_ROOT, 'state', 'state.json');
const LOG_FILE = path.join(PUBLISH_ROOT, 'state', 'publish-log.jsonl');
const OUTPUT_ROOT = path.join(PUBLISH_ROOT, 'output');

const SUPPORTED_PLATFORMS = ['feishu', 'wechat', 'xhs', 'x'];

module.exports = {
  ROOT_DIR,
  BLOG_ROOT,
  POSTS_ROOT,
  BLOG_SOURCE_ROOT,
  PUBLISH_ROOT,
  STATE_FILE,
  LOG_FILE,
  OUTPUT_ROOT,
  SUPPORTED_PLATFORMS
};
