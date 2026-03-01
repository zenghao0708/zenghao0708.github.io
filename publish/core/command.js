'use strict';

const { execSync } = require('child_process');

function escapeSingleQuoted(s) {
  return String(s).replace(/'/g, "'\\''");
}

function runTemplatedCommand(template, vars) {
  let cmd = template;
  for (const [k, v] of Object.entries(vars)) {
    cmd = cmd.replaceAll(`{${k}}`, `'${escapeSingleQuoted(v)}'`);
  }

  const shellCmd = `set -e\n${cmd}`;
  const stdout = execSync(shellCmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env
  });

  return stdout.trim();
}

module.exports = {
  runTemplatedCommand
};
