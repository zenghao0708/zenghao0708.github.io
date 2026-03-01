# AGENTS

## 项目定位
- 本仓库用于个人博客内容维护与发布。
- `blog_new/` 是 Hexo 子项目（文章源、主题、站点构建与部署）。
- `publish/` + `scripts/` 是社交平台发布工具链（飞书/微信公众号/X 等）。

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
- 环境变量加载优先级：
  1. `PUBLISH_ENV_FILE`
  2. `~/.config/blog-publish.env`
  3. 仓库根目录 `.env`
- 不要在仓库提交真实密钥；只维护 `publish/.env.example`。

## 微信公众号发布约定
- 一键脚本：`scripts/post-wechat.js`。
- 封面脚本：`scripts/wechat-cover-glm.js`、`scripts/wechat-cover-apply.ts`。
- 当前策略可配置：
  - 自动封面：`WECHAT_AUTO_COVER_GLM`
  - 引擎：`WECHAT_COVER_ENGINE=gemini-cli|glm`
  - 评分：`WECHAT_COVER_SCORER=codex-cli|auto|heuristic|none`
  - gemini 超时回退 GLM：`WECHAT_COVER_GEMINI_FALLBACK_GLM=true`
- 如用户要求手动生成封面，优先关闭自动封面（`WECHAT_AUTO_COVER_GLM=false`）。

## 提交规范
- 用户偏好中文 commit message，默认使用中文提交信息。
- 分批提交时，按“功能块”拆分 commit，避免将无关改动混在一起。
- 不回退或覆盖用户已存在但与当前任务无关的改动。
