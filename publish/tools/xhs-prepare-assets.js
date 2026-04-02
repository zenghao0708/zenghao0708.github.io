#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const res = spawnSync('node', ['scripts/xhs-prepare-assets.js', ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: require('path').resolve(__dirname, '..', '..'),
  env: process.env
});

if (res.error) {
  throw res.error;
}

process.exit(typeof res.status === 'number' ? res.status : 0);
