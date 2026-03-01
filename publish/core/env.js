'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./constants');

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const idx = trimmed.indexOf('=');
  if (idx === -1) {
    return null;
  }

  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadOneFile(envPath) {
  if (!envPath || !fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      continue;
    }

    if (typeof process.env[parsed.key] === 'undefined') {
      process.env[parsed.key] = parsed.value;
    }
  }
}

function loadEnv() {
  const customEnvPath = process.env.PUBLISH_ENV_FILE
    ? path.resolve(process.env.PUBLISH_ENV_FILE)
    : '';
  const homeDir = process.env.HOME || '';
  const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
  const userDefaultEnvPath = path.join(xdgConfigHome, 'blog-publish.env');
  const defaultEnvPath = path.join(ROOT_DIR, '.env');

  if (customEnvPath) {
    loadOneFile(customEnvPath);
    return;
  }

  // Auto-load user-level config first to avoid committing secrets in repo.
  loadOneFile(userDefaultEnvPath);
  loadOneFile(defaultEnvPath);
}

module.exports = { loadEnv };
