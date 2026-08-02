# 阅读数统计迁移方案

## 部署边界

- 博客仍然使用 `https://coolzeng.com`，源码在 GitHub 仓库维护，并通过 GitHub Pages 发布。
- `https://coolzeng.cn/blog-views` 只提供阅读数 API 和数据存储，不承载博客页面或文章内容。
- 浏览器从 `coolzeng.com` 跨域调用计数 API；服务端只允许配置过的博客 Origin。
- 当前不启用 `views.coolzeng.cn`：它需要额外配置 DNS 和独立证书，但不会改善现阶段的可用性。以后如果希望接口域名更独立，可以无损迁移到该子域名。

## 结论

阅读数主链路使用现有腾讯云主机上的 `Node 22 + SQLite`，通过已备案域名：

```text
https://coolzeng.cn/blog-views
```

Cloudflare Workers + D1 保留为可选的海外灾备。当前博客只使用自托管主链路；将来部署备用 endpoint 后，前端会按配置顺序请求，单次请求超过 2.5 秒自动尝试下一条链路。

这样做的原因：

- `coolzeng.cn` 已备案并部署在腾讯云中国大陆节点，国内访问无需新增服务或备案。
- 现有主机已有 Node、systemd 和 Nginx，SQLite 没有新增运行费用和外部数据库依赖。
- SQLite 使用原子自增，避免边缘 KV 读后写在并发访问时覆盖计数。
- 如有需要，Cloudflare D1 可以提供海外故障回退和第二份数据副本，但不是当前上线的前置条件。

## 当前生产状态

- 主服务：`https://coolzeng.cn/blog-views`
- 迁移基线：60 条记录、总阅读数 8029
- 生产切换后的首次端到端访问：`/posts/http2-overview/` 从 82 增至 83，全站从 8029 增至 8030
- 海外验证：Globalping 的美国、德国、新加坡、澳大利亚探针均返回 HTTP 200，耗时约 0.95-1.70 秒
- Cloudflare 备用服务：代码已准备，账号尚未授权，因此当前未部署、未写入博客配置

## 数据模型

LeanCloud `Counter` 表的核心字段：

- `url`: 文章路径，例如 `/posts/openclaw-architecture/`
- `title`: 文章标题
- `time`: 阅读数

新模型对应为：

- `url`: 主键
- `title`: 标题
- `views`: 阅读数
- `updatedAt`: 更新时间

## 目录结构

- 国内主服务：`services/page-views/`
- Cloudflare 备用服务：`cloudflare/page-views/`
- 前端运行时：`blog_new/source/scripts/page-views.js`
- Hexo 注入器：`blog_new/scripts/page-views-injector.js`
- 迁移脚本：`scripts/leancloud-counter-migrate.js`

## LeanCloud 备份

正式备份保存在 Git 仓库之外：

```text
~/.local/share/blog-publish/page-views/leancloud-counter-2026-08-01.json
~/.local/share/blog-publish/page-views/page-views-normalized-2026-08-01.json
~/.local/share/blog-publish/page-views/page-views-d1-2026-08-01.sql
```

本次核对结果：60 条记录、60 个唯一 URL、总阅读数 8029。

如需从 LeanCloud 控制台重新导出，也可以在 `Data Storage > Import/Export > Data Export` 下载 JSON，再运行：

```bash
node scripts/leancloud-counter-migrate.js ~/Downloads/Counter.json \
  --out ~/.local/share/blog-publish/page-views/page-views-normalized.json \
  --sql ~/.local/share/blog-publish/page-views/page-views-d1.sql
```

## 部署国内主服务

同步无依赖的 Node 服务：

```bash
rsync -az services/page-views/ ubuntu@106.53.86.211:/home/ubuntu/blog-page-views/
scp services/page-views/nginx-location.conf ubuntu@106.53.86.211:/tmp/blog-page-views-nginx.conf
scp ~/.local/share/blog-publish/page-views/page-views-normalized-2026-08-01.json \
  ubuntu@106.53.86.211:/tmp/page-views-normalized.json
```

首次部署时导入数据并安装独立的 systemd 服务：

```bash
ssh ubuntu@106.53.86.211
mkdir -p ~/.local/share/blog-page-views
cd ~/blog-page-views
PAGE_VIEWS_DB_PATH=~/.local/share/blog-page-views/page-views.db \
  node server.js --import /tmp/page-views-normalized.json
sudo install -m 0644 blog-page-views.service /etc/systemd/system/blog-page-views.service
sudo systemctl daemon-reload
sudo systemctl enable --now blog-page-views.service
```

Nginx 在 HTTPS server 中包含 `services/page-views/nginx-location.conf`，对外路径为 `/blog-views/`，对内转发到 `127.0.0.1:8789`。修改前先备份现有配置，修改后必须执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 可选：部署 Cloudflare 备用链路

```bash
cd cloudflare/page-views
cp wrangler.example.toml wrangler.toml
npx wrangler login
npx wrangler d1 create coolzeng-page-views
```

把返回的 `database_id` 写入 `wrangler.toml`，然后执行：

```bash
npx wrangler d1 execute coolzeng-page-views --remote --file=./schema.sql
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

`wrangler.toml` 已加入 `.gitignore`，不要提交真实配置。

导入同一份数据：

```bash
PAGE_VIEWS_ADMIN_TOKEN=<ADMIN_TOKEN> \
node scripts/leancloud-counter-migrate.js \
  ~/.local/share/blog-publish/page-views/leancloud-counter-2026-08-01.json \
  --endpoint https://<worker-domain>/api/admin/import
```

也可以直接导入 D1 SQL：

```bash
cd cloudflare/page-views
npx wrangler d1 execute coolzeng-page-views --remote \
  --file=$HOME/.local/share/blog-publish/page-views/page-views-d1-2026-08-01.sql
```

## 博客前端配置

当前生产配置只包含已验证的自托管 endpoint：

```yaml
busuanzi: false
page_views:
  enable: true
  api_bases:
    - https://coolzeng.cn/blog-views
  site_total: true
  request_timeout_ms: 2500
```

Cloudflare 部署和数据导入完成后，再把 `https://<worker-domain>` 作为第二项加入 `api_bases`。

构建与上线：

```bash
cd blog_new
npm run clean
npm run build
npm run deploy
```

## 接口检查

```bash
curl 'https://coolzeng.cn/blog-views/health'
curl 'https://coolzeng.cn/blog-views/api/views?url=/posts/openclaw-architecture/'
curl 'https://coolzeng.cn/blog-views/api/views/site'
curl -X POST 'https://coolzeng.cn/blog-views/api/views/increment' \
  -H 'Origin: https://coolzeng.com' \
  -H 'content-type: application/json' \
  --data '{"url":"/posts/openclaw-architecture/","title":"OpenClaw 架构设计"}'
```
