const DEFAULT_ALLOWED_ORIGINS = ['https://coolzeng.com', 'https://www.coolzeng.com'];

function allowedOrigins(env) {
  const configured = env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || '';
  const items = configured.split(',').map((item) => item.trim()).filter(Boolean);
  return new Set(items.length > 0 ? items : DEFAULT_ALLOWED_ORIGINS);
}

function originIsAllowed(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  return !origin || allowed.has('*') || allowed.has(origin);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,x-admin-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  if (origin && (allowed.has('*') || allowed.has(origin))) {
    headers['Access-Control-Allow-Origin'] = allowed.has('*') ? '*' : origin;
  }
  return headers;
}

function json(data, init = {}, request, env) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(request ? corsHeaders(request, env) : {}),
      ...(init.headers || {})
    }
  });
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 512 || !url.startsWith('/')) {
    return '';
  }
  return url.replace(/\/index\.html$/, '/');
}

function normalizeTitle(value) {
  const title = String(value || '').trim();
  return title ? title.slice(0, 240) : null;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getOne(env, url) {
  const row = await env.DB.prepare(
    'SELECT url, title, views, updated_at AS updatedAt FROM page_views WHERE url = ?'
  ).bind(url).first();
  return row || { url, title: null, views: 0, updatedAt: null };
}

async function handleGetViews(request, env) {
  const { searchParams } = new URL(request.url);
  const url = normalizeUrl(searchParams.get('url'));
  const urls = searchParams.getAll('urls').map(normalizeUrl).filter(Boolean);

  if (urls.length > 0) {
    const placeholders = urls.map(() => '?').join(',');
    const result = await env.DB.prepare(
      `SELECT url, title, views, updated_at AS updatedAt FROM page_views WHERE url IN (${placeholders})`
    ).bind(...urls).all();
    const byUrl = new Map((result.results || []).map((row) => [row.url, row]));
    return json({ records: urls.map((item) => byUrl.get(item) || { url: item, title: null, views: 0, updatedAt: null }) }, {}, request, env);
  }

  if (!url) {
    return json({ error: 'missing-or-invalid-url' }, { status: 400 }, request, env);
  }
  return json(await getOne(env, url), {}, request, env);
}

async function handleIncrement(request, env) {
  if (!originIsAllowed(request, env)) {
    return json({ error: 'origin-not-allowed' }, { status: 403 }, request, env);
  }
  const body = await readJson(request);
  const url = normalizeUrl(body.url);
  const title = normalizeTitle(body.title);
  if (!url) {
    return json({ error: 'missing-or-invalid-url' }, { status: 400 }, request, env);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO page_views (url, title, views, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      views = views + 1,
      title = COALESCE(excluded.title, page_views.title),
      updated_at = excluded.updated_at
  `).bind(url, title, now, now).run();

  return json(await getOne(env, url), {}, request, env);
}

async function handleSiteTotal(request, env) {
  const row = await env.DB.prepare('SELECT COALESCE(SUM(views), 0) AS views FROM page_views').first();
  return json({ views: Number(row && row.views ? row.views : 0) }, {}, request, env);
}

function assertAdmin(request, env) {
  const token = request.headers.get('x-admin-token') || '';
  return Boolean(env.ADMIN_TOKEN && token && token === env.ADMIN_TOKEN);
}

async function handleImport(request, env) {
  if (!assertAdmin(request, env)) {
    return json({ error: 'unauthorized' }, { status: 401 }, request, env);
  }

  const body = await readJson(request);
  const records = Array.isArray(body.records) ? body.records : [];
  if (records.length === 0 || records.length > 500) {
    return json({ error: 'records must contain 1-500 items' }, { status: 400 }, request, env);
  }

  const now = new Date().toISOString();
  const statements = [];
  for (const record of records) {
    const url = normalizeUrl(record.url);
    if (!url) continue;
    const title = normalizeTitle(record.title);
    const views = Math.max(0, Number.parseInt(record.views ?? record.time ?? 0, 10) || 0);
    statements.push(env.DB.prepare(`
      INSERT INTO page_views (url, title, views, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        views = excluded.views,
        title = COALESCE(excluded.title, page_views.title),
        updated_at = excluded.updated_at
    `).bind(url, title, views, now, now));
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
  return json({ imported: statements.length }, {}, request, env);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      if (!originIsAllowed(request, env)) {
        return json({ error: 'origin-not-allowed' }, { status: 403 }, request, env);
      }
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/views') {
      return handleGetViews(request, env);
    }
    if (request.method === 'GET' && url.pathname === '/api/views/site') {
      return handleSiteTotal(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/api/views/increment') {
      return handleIncrement(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/import') {
      return handleImport(request, env);
    }

    return json({ error: 'not-found' }, { status: 404 }, request, env);
  }
};
