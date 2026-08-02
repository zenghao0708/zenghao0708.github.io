'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createPageViewService } = require('./app');

async function startService() {
  const service = createPageViewService({
    dbPath: ':memory:',
    allowedOrigins: 'https://coolzeng.com'
  });
  await new Promise((resolve) => service.server.listen(0, '127.0.0.1', resolve));
  const address = service.server.address();
  return {
    ...service,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

test('increments page views and returns the site total', async (context) => {
  const service = await startService();
  context.after(() => new Promise((resolve) => service.server.close(() => {
    service.close();
    resolve();
  })));

  const headers = {
    origin: 'https://coolzeng.com',
    'content-type': 'application/json'
  };
  const body = JSON.stringify({ url: '/posts/example/index.html', title: 'Example' });
  const first = await fetch(`${service.baseUrl}/api/views/increment`, { method: 'POST', headers, body });
  const second = await fetch(`${service.baseUrl}/api/views/increment`, { method: 'POST', headers, body });

  assert.equal(first.status, 200);
  assert.equal((await first.json()).views, 1);
  assert.equal((await second.json()).views, 2);

  const page = await fetch(`${service.baseUrl}/api/views?url=/posts/example/`);
  const pageData = await page.json();
  assert.equal(pageData.url, '/posts/example/');
  assert.equal(pageData.title, 'Example');
  assert.equal(pageData.views, 2);
  assert.match(pageData.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  const total = await fetch(`${service.baseUrl}/api/views/site`);
  assert.deepEqual(await total.json(), { views: 2 });
});

test('describes the service at the root path', async (context) => {
  const service = await startService();
  context.after(() => new Promise((resolve) => service.server.close(() => {
    service.close();
    resolve();
  })));

  const response = await fetch(`${service.baseUrl}/`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'blog-page-views',
    endpoints: {
      health: './health',
      siteViews: './api/views/site',
      pageViews: './api/views?url=/posts/example/'
    }
  });
});

test('imports LeanCloud-compatible records and rejects other browser origins', async (context) => {
  const service = await startService();
  context.after(() => new Promise((resolve) => service.server.close(() => {
    service.close();
    resolve();
  })));

  assert.deepEqual(service.importRecords([
    { url: '/posts/a/', title: 'A', time: 5 },
    { url: '/posts/b/index.html', title: 'B', views: 7 }
  ]), { imported: 2, totalViews: 12 });

  const rejected = await fetch(`${service.baseUrl}/api/views/increment`, {
    method: 'POST',
    headers: { origin: 'https://example.com', 'content-type': 'application/json' },
    body: JSON.stringify({ url: '/posts/a/' })
  });
  assert.equal(rejected.status, 403);

  const page = await fetch(`${service.baseUrl}/api/views?url=/posts/a/`);
  assert.equal((await page.json()).views, 5);
});
