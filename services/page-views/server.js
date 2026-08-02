'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createPageViewService } = require('./app');

function extractRecords(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.records)) return raw.records;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.data)) return raw.data;
  throw new Error('Import file must contain an array, records, results, or data');
}

function main() {
  const dbPath = process.env.PAGE_VIEWS_DB_PATH || path.join(__dirname, 'data', 'page-views.db');
  const service = createPageViewService({
    dbPath,
    allowedOrigins: process.env.ALLOWED_ORIGINS
  });

  if (process.argv[2] === '--import') {
    const inputPath = process.argv[3];
    if (!inputPath) throw new Error('Usage: node server.js --import <json-file>');
    const raw = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
    const result = service.importRecords(extractRecords(raw));
    service.close();
    process.stdout.write(`${JSON.stringify({ dbPath, ...result })}\n`);
    return;
  }

  const port = Number.parseInt(process.env.PORT || '8789', 10);
  const host = process.env.HOST || '127.0.0.1';
  service.server.listen(port, host, () => {
    process.stdout.write(`${JSON.stringify({ listening: `http://${host}:${port}`, dbPath })}\n`);
  });

  function shutdown() {
    service.server.close(() => {
      service.close();
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
}
