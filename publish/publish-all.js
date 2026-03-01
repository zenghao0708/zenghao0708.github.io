#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { POSTS_ROOT, SUPPORTED_PLATFORMS } = require('./core/constants');
const { loadEnv } = require('./core/env');
const { getAdapter } = require('./adapters');
const { listFilesRecursive } = require('./core/fs-utils');
const { readPost } = require('./core/markdown');
const {
  appendLog,
  getPublishState,
  hashForPostPlatform,
  loadState,
  saveState,
  upsertPublishState
} = require('./core/state');

function printHelp() {
  const text = [
    'Usage: node publish/publish-all.js [options]',
    '',
    'Options:',
    '  --file <path>          Publish one markdown file',
    '  --all                  Publish all markdown files under blog_new/source/_posts',
    '  --platform <list>      Comma-separated: feishu,wechat,xhs,x',
    '  --publish              Execute publish commands (default: dry-run)',
    '  --dry-run              Force dry-run',
    '  --force                Ignore state hash and republish',
    '  --help                 Show help'
  ].join('\n');
  console.log(text);
}

function parseArgs(argv) {
  const out = {
    file: '',
    all: false,
    platforms: [],
    dryRun: true,
    force: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }

    if (arg === '--file') {
      out.file = argv[i + 1] || '';
      i += 1;
      continue;
    }

    if (arg === '--all') {
      out.all = true;
      continue;
    }

    if (arg === '--platform') {
      out.platforms = (argv[i + 1] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }

    if (arg === '--publish') {
      out.dryRun = false;
      continue;
    }

    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }

    if (arg === '--force') {
      out.force = true;
      continue;
    }
  }

  return out;
}

function discoverPosts(options) {
  if (options.file) {
    return [path.resolve(options.file)];
  }

  const files = listFilesRecursive(POSTS_ROOT, '.md').sort();
  if (options.all) {
    return files;
  }

  if (files.length === 0) {
    return [];
  }

  let latestFile = files[0];
  let latestMtime = fs.statSync(latestFile).mtimeMs;
  for (const file of files.slice(1)) {
    const mtime = fs.statSync(file).mtimeMs;
    if (mtime > latestMtime) {
      latestFile = file;
      latestMtime = mtime;
    }
  }

  return [latestFile];
}

function normalizePlatforms(optionsPlatforms, frontMatterPlatforms) {
  let platforms = [];
  if (optionsPlatforms.length > 0) {
    platforms = optionsPlatforms;
  } else if (Array.isArray(frontMatterPlatforms) && frontMatterPlatforms.length > 0) {
    platforms = frontMatterPlatforms;
  } else {
    platforms = ['feishu', 'x'];
  }

  return [...new Set(platforms)].filter((p) => SUPPORTED_PLATFORMS.includes(p));
}

async function run() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const postFiles = discoverPosts(args);
  if (postFiles.length === 0) {
    throw new Error(`No markdown files found under ${POSTS_ROOT}`);
  }

  const state = loadState();
  const summary = [];
  let hasFailure = false;

  for (const postFile of postFiles) {
    const post = readPost(postFile);
    const platforms = normalizePlatforms(args.platforms, post.frontMatter.publish_to);

    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      if (!adapter || typeof adapter.publish !== 'function') {
        appendLog({ level: 'warn', post: post.sourcePath, platform, msg: 'adapter-not-found' });
        summary.push({
          post: post.slug,
          platform,
          status: 'skipped',
          reason: 'adapter-not-found'
        });
        continue;
      }

      const payloadHash = hashForPostPlatform(post, platform, {
        title: post.title,
        summary: post.summary,
        images: post.images.map((img) => img.ref)
      });

      const oldState = getPublishState(state, post.sourcePath, platform);
      if (!args.dryRun && !args.force && oldState && oldState.hash === payloadHash) {
        summary.push({
          post: post.slug,
          platform,
          status: 'skipped',
          reason: 'same-content-hash'
        });
        continue;
      }

      try {
        const result = await adapter.publish(post, {
          dryRun: args.dryRun,
          force: args.force
        });

        appendLog({
          level: 'info',
          post: post.sourcePath,
          platform,
          dryRun: args.dryRun,
          result
        });

        if (!args.dryRun) {
          upsertPublishState(state, {
            sourcePath: post.sourcePath,
            platform,
            hash: payloadHash,
            result
          });
        }

        summary.push({
          post: post.slug,
          platform,
          status: args.dryRun ? 'dry-run' : 'published',
          detail: result.previewPath || ''
        });
      } catch (err) {
        hasFailure = true;
        appendLog({
          level: 'error',
          post: post.sourcePath,
          platform,
          dryRun: args.dryRun,
          error: err && err.message ? err.message : String(err)
        });

        summary.push({
          post: post.slug,
          platform,
          status: 'failed',
          reason: err && err.message ? err.message : String(err)
        });
      }
    }
  }

  saveState(state);

  console.log(JSON.stringify({
    mode: args.dryRun ? 'dry-run' : 'publish',
    posts: postFiles.length,
    summary
  }, null, 2));

  if (hasFailure) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exitCode = 1;
});
