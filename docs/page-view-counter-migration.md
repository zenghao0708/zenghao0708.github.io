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
- LeanCloud 原始基线：60 条记录、总阅读数 8029
- 不蒜子恢复：18 篇当前文章、总阅读数 1284
- canonical 合并结果：18 篇当前文章全部命中，另保留 3 条已下线文章记录；合并完成基线为 21 条、总阅读数 9321
- 旧 URL 清理：合并并删除 45 个历史别名，其中 1 个为标题拼写不同的人工映射
- 国内验证：深圳电信直连可以读取并自增，CORS 正确返回 `https://coolzeng.com`
- 海外验证：美国代理可以读取并自增；Globalping 的美国、德国、新加坡、日本探针读取均返回 HTTP 200，CORS 预检均返回 HTTP 204
- Cloudflare 备用服务：代码已准备，账号尚未授权，因此当前未部署、未写入博客配置

## 为什么第一次切换后显示 1

迁移前存在两套前后连续的计数器：

- 2024-01-14 之前的 Next 主题使用 LeanCloud。
- 2024-01-14 起的 Archer 主题使用不蒜子。

首次迁移只导入了 LeanCloud，因此近两年新增文章在新数据库里没有 canonical URL，第一次打开就会创建为 1。最终迁移按照下面的公式合并：

```text
最终阅读数 = 相同文章全部 LeanCloud 旧路径之和
           + 不蒜子 page_pv
           + 切换到新服务后的新增阅读数
```

不蒜子查询本身会增加一次 `page_pv`，恢复时已经按每篇文章的实际审计请求次数扣除，避免迁移操作污染历史值。

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
~/.local/share/blog-publish/page-views/busuanzi-recovered-2026-08-02.json
~/.local/share/blog-publish/page-views/page-views-canonical-merge-2026-08-02.json
~/.local/share/blog-publish/page-views/page-views-before-busuanzi-merge-2026-08-02T03-06-37-112Z.db
~/.local/share/blog-publish/page-views/page-views-canonical-merge-result-2026-08-02.json
```

原始 LeanCloud 核对结果：60 条记录、60 个唯一 URL、总阅读数 8029。合并后 18 篇线上文章均有唯一 canonical 记录，不再依赖旧 permalink。

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
