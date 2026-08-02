# Blog page view service

Node 22 + built-in SQLite service for the blog page-view counter. It has no npm runtime dependencies.

Local verification:

```bash
node --test services/page-views/app.test.js
PAGE_VIEWS_DB_PATH=/tmp/page-views.db node services/page-views/server.js
```

Import a normalized LeanCloud export before starting the service:

```bash
PAGE_VIEWS_DB_PATH=/path/to/page-views.db \
node services/page-views/server.js --import /path/to/page-views-normalized.json
```

Production runs as `blog-page-views.service` behind Nginx at `https://coolzeng.cn/blog-views/` and binds only to `127.0.0.1:8789`.
