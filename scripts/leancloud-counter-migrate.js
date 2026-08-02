#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage(code = 0) {
  console.log(`Usage:
  node scripts/leancloud-counter-migrate.js <leancloud-counter-export.json> [options]

Options:
  --out <file>             Write normalized JSON records
  --sql <file>             Write D1 import SQL
  --endpoint <url>         Import to deployed Worker /api/admin/import
  --token <token>          Admin token for Worker import (or PAGE_VIEWS_ADMIN_TOKEN)
  --batch-size <n>         Import batch size, default 200

Examples:
  node scripts/leancloud-counter-migrate.js Counter.json --out tmp/page-views.json --sql tmp/page-views.sql
  PAGE_VIEWS_ADMIN_TOKEN=xxx node scripts/leancloud-counter-migrate.js Counter.json --endpoint https://worker.example.workers.dev/api/admin/import
`);
  process.exit(code);
}

function parseArgs(argv) {
  const out = {
    input: '',
    outFile: '',
    sqlFile: '',
    endpoint: '',
    token: process.env.PAGE_VIEWS_ADMIN_TOKEN || '',
    batchSize: 200
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--out' && argv[i + 1]) out.outFile = argv[++i];
    else if (arg === '--sql' && argv[i + 1]) out.sqlFile = argv[++i];
    else if (arg === '--endpoint' && argv[i + 1]) out.endpoint = argv[++i];
    else if (arg === '--token' && argv[i + 1]) out.token = argv[++i];
    else if (arg === '--batch-size' && argv[i + 1]) out.batchSize = Number(argv[++i]) || 200;
    else if (!out.input) out.input = arg;
  }
  return out;
}

function pickArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.records)) return raw.records;
  if (Array.isArray(raw.data)) return raw.data;
  if (raw.Counter && Array.isArray(raw.Counter)) return raw.Counter;
  if (raw._default && Array.isArray(raw._default.Counter)) return raw._default.Counter;
  throw new Error('Unsupported export format: expected an array, {results:[]}, {data:[]}, or {Counter:[]}');
}

function unwrapValue(value) {
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '$numberInt')) return Number(value.$numberInt);
    if (Object.prototype.hasOwnProperty.call(value, '$numberLong')) return Number(value.$numberLong);
    if (Object.prototype.hasOwnProperty.call(value, '__type') && value.__type === 'Date') return value.iso;
  }
  return value;
}

function normalizeUrl(value) {
  const url = String(unwrapValue(value) || '').trim();
  if (!url || !url.startsWith('/')) return '';
  return url.replace(/\/index\.html$/, '/');
}

function normalizeRecord(record) {
  const url = normalizeUrl(record.url || record.URL || record.path);
  if (!url) return null;
  const title = String(unwrapValue(record.title) || '').trim();
  const views = Math.max(0, Number.parseInt(unwrapValue(record.time ?? record.views ?? record.count) || 0, 10) || 0);
  return {
    url,
    title,
    views
  };
}

function sqlString(value) {
  return `'${String(value || '').replace(/'/g, "''")}'`;
}

function toSql(records) {
  const lines = [
    'BEGIN TRANSACTION;',
    ...records.map((record) => [
      'INSERT INTO page_views (url, title, views, created_at, updated_at)',
      `VALUES (${sqlString(record.url)}, ${sqlString(record.title)}, ${record.views}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      'ON CONFLICT(url) DO UPDATE SET',
      '  title = excluded.title,',
      '  views = excluded.views,',
      '  updated_at = CURRENT_TIMESTAMP;'
    ].join('\n')),
    'COMMIT;'
  ];
  return `${lines.join('\n')}\n`;
}

async function importRecords(endpoint, token, records, batchSize) {
  if (!token) throw new Error('Missing admin token. Provide --token or PAGE_VIEWS_ADMIN_TOKEN.');
  let imported = 0;
  const totalViews = records.reduce((sum, record) => sum + Number(record.views || 0), 0);
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ records: batch, totalViews })
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Import failed: HTTP ${response.status} ${text}`);
    }
    const data = JSON.parse(text);
    imported += Number(data.imported || 0);
  }
  return imported;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) usage(1);

  const inputPath = path.resolve(args.input);
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const records = pickArray(raw).map(normalizeRecord).filter(Boolean);
  records.sort((a, b) => a.url.localeCompare(b.url));
  const totalViews = records.reduce((sum, record) => sum + Number(record.views || 0), 0);

  if (args.outFile) {
    fs.mkdirSync(path.dirname(path.resolve(args.outFile)), { recursive: true });
    fs.writeFileSync(path.resolve(args.outFile), `${JSON.stringify({ records }, null, 2)}\n`, 'utf8');
  }
  if (args.sqlFile) {
    fs.mkdirSync(path.dirname(path.resolve(args.sqlFile)), { recursive: true });
    fs.writeFileSync(path.resolve(args.sqlFile), toSql(records), 'utf8');
  }

  let imported = 0;
  if (args.endpoint) {
    imported = await importRecords(args.endpoint, args.token, records, args.batchSize);
  }

  console.log(JSON.stringify({
    inputPath,
    records: records.length,
    totalViews,
    outFile: args.outFile ? path.resolve(args.outFile) : '',
    sqlFile: args.sqlFile ? path.resolve(args.sqlFile) : '',
    endpoint: args.endpoint || '',
    imported
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
