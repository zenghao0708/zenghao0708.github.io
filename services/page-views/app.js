'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://coolzeng.com',
  'https://www.coolzeng.com'
];

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 512 || !url.startsWith('/')) return '';
  return url.replace(/\/index\.html$/, '/');
}

function normalizeTitle(value) {
  const title = String(value || '').trim();
  return title ? title.slice(0, 240) : null;
}

function parseAllowedOrigins(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(',');
  const origins = items.map((item) => String(item).trim()).filter(Boolean);
  return new Set(origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS);
}

function originIsAllowed(request, allowedOrigins) {
  const origin = request.headers.origin || '';
  return !origin || allowedOrigins.has('*') || allowedOrigins.has(origin);
}

function corsHeaders(request, allowedOrigins) {
  const origin = request.headers.origin || '';
  const headers = { Vary: 'Origin' };
  if (origin && (allowedOrigins.has('*') || allowedOrigins.has(origin))) {
    headers['Access-Control-Allow-Origin'] = allowedOrigins.has('*') ? '*' : origin;
    headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'content-type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function sendJson(response, status, data, request, allowedOrigins) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...corsHeaders(request, allowedOrigins)
  });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) throw new Error('request-body-too-large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function openDatabase(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS page_views (
      url TEXT PRIMARY KEY,
      title TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_page_views_updated_at ON page_views(updated_at);
  `);
  return db;
}

function createPageViewService(options = {}) {
  const db = openDatabase(options.dbPath || ':memory:');
  const allowedOrigins = parseAllowedOrigins(options.allowedOrigins);
  const getPage = db.prepare(
    'SELECT url, title, views, updated_at AS updatedAt FROM page_views WHERE url = ?'
  );
  const incrementPage = db.prepare(`
    INSERT INTO page_views (url, title, views, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      views = page_views.views + 1,
      title = COALESCE(excluded.title, page_views.title),
      updated_at = excluded.updated_at
  `);
  const importPage = db.prepare(`
    INSERT INTO page_views (url, title, views, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      views = excluded.views,
      title = COALESCE(excluded.title, page_views.title),
      updated_at = excluded.updated_at
  `);

  function readPage(url) {
    return getPage.get(url) || { url, title: null, views: 0, updatedAt: null };
  }

  function importRecords(records) {
    let imported = 0;
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const record of records) {
        const url = normalizeUrl(record.url || record.URL || record.path);
        if (!url) continue;
        const title = normalizeTitle(record.title);
        const views = Math.max(0, Number.parseInt(record.views ?? record.time ?? record.count ?? 0, 10) || 0);
        const updatedAt = String(record.updatedAt || record.updated_at || new Date().toISOString());
        importPage.run(url, title, views, updatedAt, updatedAt);
        imported += 1;
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    const total = db.prepare('SELECT COALESCE(SUM(views), 0) AS views FROM page_views').get();
    return { imported, totalViews: Number(total.views || 0) };
  }

  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === 'OPTIONS') {
        if (!originIsAllowed(request, allowedOrigins)) {
          sendJson(response, 403, { error: 'origin-not-allowed' }, request, allowedOrigins);
          return;
        }
        response.writeHead(204, corsHeaders(request, allowedOrigins));
        response.end();
        return;
      }

      const requestUrl = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && requestUrl.pathname === '/health') {
        sendJson(response, 200, { ok: true }, request, allowedOrigins);
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/api/views') {
        const urls = requestUrl.searchParams.getAll('urls').map(normalizeUrl).filter(Boolean).slice(0, 100);
        if (urls.length > 0) {
          sendJson(response, 200, { records: urls.map(readPage) }, request, allowedOrigins);
          return;
        }
        const url = normalizeUrl(requestUrl.searchParams.get('url'));
        if (!url) {
          sendJson(response, 400, { error: 'missing-or-invalid-url' }, request, allowedOrigins);
          return;
        }
        sendJson(response, 200, readPage(url), request, allowedOrigins);
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/api/views/site') {
        const total = db.prepare('SELECT COALESCE(SUM(views), 0) AS views FROM page_views').get();
        sendJson(response, 200, { views: Number(total.views || 0) }, request, allowedOrigins);
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/api/views/increment') {
        if (!originIsAllowed(request, allowedOrigins)) {
          sendJson(response, 403, { error: 'origin-not-allowed' }, request, allowedOrigins);
          return;
        }
        const body = await readJson(request);
        const url = normalizeUrl(body.url);
        if (!url) {
          sendJson(response, 400, { error: 'missing-or-invalid-url' }, request, allowedOrigins);
          return;
        }
        const title = normalizeTitle(body.title);
        const now = new Date().toISOString();
        incrementPage.run(url, title, now, now);
        sendJson(response, 200, readPage(url), request, allowedOrigins);
        return;
      }

      sendJson(response, 404, { error: 'not-found' }, request, allowedOrigins);
    } catch (error) {
      const status = error && (error.message === 'request-body-too-large' || error instanceof SyntaxError) ? 400 : 500;
      sendJson(response, status, { error: status === 400 ? 'invalid-request-body' : 'internal-error' }, request, allowedOrigins);
    }
  });

  return {
    db,
    server,
    importRecords,
    close() {
      db.close();
    }
  };
}

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  createPageViewService,
  normalizeUrl,
  parseAllowedOrigins
};
