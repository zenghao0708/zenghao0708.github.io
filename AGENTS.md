# AGENTS

## 项目定位
- 本仓库用于个人博客内容维护与发布。
- `blog_new/` 是 Hexo 子项目（文章源、主题、站点构建与部署）。
- `publish/` + `scripts/` 是社交平台发布工具链（飞书/微信公众号/X 等）。
- 快速索引文档：`docs/publish-tooling-map.md`。当需要快速定位脚本、规则、历史资产时先看这里。

## 分支与上线规则
- 日常开发在 `source` 分支进行。
- 网站线上发布通过 `blog_new` 执行 `hexo deploy`，会推送到远端 `master`（站点分支）。
- 用户要求“重新发布上线”时，默认执行：
  1. `cd blog_new`
  2. `npm run clean`
  3. `npm run build`
  4. `npm run deploy`

## 社交发布规则
- 统一入口：`node publish/publish-all.js`（npm 脚本：`publish:social`）。
- 平台项目入口脚本统一放在 `scripts/`：
  - 飞书：`scripts/post-feishu.js`
  - 微信公众号：`scripts/post-wechat.js`
  - X：`scripts/post-x.js`
  - 小红书：`scripts/post-xhs.js`
- 小红书素材准备脚本：`scripts/xhs-prepare-assets.js`
- 环境变量加载优先级：
  1. `PUBLISH_ENV_FILE`
  2. `~/.config/blog-publish.env`
  3. 仓库根目录 `.env`
- 不要在仓库提交真实密钥；只维护 `publish/.env.example`。
- 平台规则沉淀在 `publish/rules/`，遇到发布问题先查规则，再改脚本：
  - `publish/rules/feishu.md`
  - `publish/rules/blog-images.md`
  - `publish/rules/wechat.md`
  - `publish/rules/x.md`
  - `publish/rules/xhs.md`

## 博客配图约定
- 博客配图规则先看 `publish/rules/blog-images.md`。
- 技术结构图母版优先保留 `SVG`，发布优先导出 `PNG`。
- 通用导出脚本：`scripts/export-blog-svg.js`。
- 需要高精度、手绘风技术图时，优先保留生成脚本，不要只提交最终位图。

## 文章质量约定
- 文章评分规则先看 `publish/rules/article-quality.md`。
- 快速检查脚本：`node scripts/article-quality-score.js <markdown-file>`。
- 全站巡检脚本：`node scripts/article-quality-audit.js --min-score 9`。
- 社交发布入口 `node publish/publish-all.js` 默认会执行质量门禁。
- 公开发布文章默认目标分数：`>= 9.0`。

## 微信公众号发布约定
- 一键脚本：`scripts/post-wechat.js`。
- 封面脚本：`scripts/wechat-cover-glm.js`、`scripts/wechat-cover-apply.ts`。
- 默认正文主题固定为 `WECHAT_ARTICLE_THEME=mdnice-lanqing`，不要默认切回 `grace`。
- 当前策略可配置：
  - 自动封面：`WECHAT_AUTO_COVER_GLM`
  - 引擎：`WECHAT_COVER_ENGINE=gemini-cli|glm`
  - 评分：`WECHAT_COVER_SCORER=codex-cli|auto|heuristic|none`
  - gemini 超时回退 GLM：`WECHAT_COVER_GEMINI_FALLBACK_GLM=true`
- 如用户要求手动生成封面，优先关闭自动封面（`WECHAT_AUTO_COVER_GLM=false`）。

## 小红书发布约定
- 一键脚本：`scripts/post-xhs.js`。
- 素材先由 `scripts/xhs-prepare-assets.js` 从 Markdown 自动生成，再执行自动发布。
- 小红书图文默认使用 `1080x1440` 的 `3:4` 竖版图片。
- 生成好的素材需要归档到 `~/Library/Mobile Documents/com~apple~CloudDocs/AI 文档/小红书/`，按“时间 / 主题 / 文章”分层存放。
- 自动发布失败时必须保留 `publish/output/xhs/audit/` 下的审计截图与 HTML，方便下次直接复用定位结果。

## X 发布约定
- 一键脚本：`scripts/post-x.js`。
- 长文默认使用 `article` 模式。
- 若没有明确要求，不要默认开启 `X_ARTICLE_AUTO_PROMO=true` 的引流 tweet；优先以用户当前配置为准。

## 提交规范
- 用户偏好中文 commit message，默认使用中文提交信息。
- 分批提交时，按“功能块”拆分 commit，避免将无关改动混在一起。
- 不回退或覆盖用户已存在但与当前任务无关的改动。
