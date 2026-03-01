# Social Publish

统一入口：把 Hexo 文章发布到不同社交平台。

## Quick Start

1. 复制 `publish/.env.example` 到 `~/.config/blog-publish.env`（推荐）或仓库根目录 `.env`。
2. 为每个平台配置 `PUBLISH_<PLATFORM>_CMD`。
3. 先跑 dry-run 再执行 publish。
4. 本仓库已内置 `scripts/post-feishu.js` 和 `scripts/post-x.js`，可直接配到 `.env` 里使用。

默认加载顺序：

1. `PUBLISH_ENV_FILE`（如果显式设置）
2. `~/.config/blog-publish.env`
3. 仓库根目录 `.env`

如果你想临时切换配置路径，再显式指定：

```bash
PUBLISH_ENV_FILE=~/.config/blog-publish.env npm run publish:social -- --file "blog_new/source/_posts/xxx.md" --platform feishu,x --publish
```

```bash
# 单篇，默认 dry-run
npm run publish:social -- --file "blog_new/source/_posts/xxx.md" --platform feishu,x

# 所有文章，默认 dry-run
npm run publish:social:all -- --platform feishu,wechat,xhs,x

# 实际发布
npm run publish:social -- --file "blog_new/source/_posts/xxx.md" --platform feishu --publish
```

## Command Template

命令支持占位符：`{file}` `{source}` `{title}` `{slug}` `{platform}`。

建议每个平台实现一个独立脚本。当前仓库已提供可用示例：

```bash
PUBLISH_FEISHU_CMD='node scripts/post-feishu.js --input {file} --source {source} --mode create --execute --submit'
PUBLISH_WECHAT_CMD='node scripts/post-wechat.js --input {file} --source {source} --mode article --execute --submit'
PUBLISH_X_CMD='node scripts/post-x.js --input {file} --source {source} --mode article --execute --submit'
```

X 发布说明：

- `mode=article` 且真实发布时，默认会自动再发 1 条简短 tweet 做引流（可通过 `X_ARTICLE_AUTO_PROMO=false` 关闭）。
- `X_CHROME_PROFILE` 留空时默认使用 `~/.local/share/x-browser-profile`。
- 可用 `X_ARTICLE_PROMO_TEMPLATE` 或 `X_ARTICLE_PROMO_TEXT` 自定义引流 tweet 文案。

微信公众号发布说明：

- 默认走 `article` 模式，调用 `wechat-article.ts` 并保存为草稿。
- `WECHAT_CHROME_PROFILE` 留空时默认使用 `~/.local/share/wechat-browser-profile`。
- `WECHAT_ARTICLE_THEME` 支持 `default|grace|simple|mdnice-simple|mdnice-lanqing`（后两者为 markdown-nice 风格参数）。
- 可切换 `WECHAT_PUBLISH_MODE=image-text` 走图文模式（会调用 `wechat-browser.ts`）。
- 支持发布审计：`WECHAT_AUDIT_DIR`（截图+JSON 报告目录）和 `WECHAT_AUDIT_PREFIX`（文件名前缀）。
- 文章模式默认优先“富文本粘贴”保持 markdown 排版，失败才降级到 `paste event/insertHTML`。
- 支持封面自动化（`WECHAT_AUTO_COVER_GLM=true`）：
  - 可选引擎：`WECHAT_COVER_ENGINE=gemini-cli|glm`（默认 `gemini-cli`）。
  - 支持多候选：`WECHAT_COVER_VARIANTS=3`（生成 3 张后自动评分选 1 张）。
  - 自动评分：`WECHAT_COVER_SCORER=codex-cli|auto|heuristic|none`（默认 `codex-cli`）。
  - 超时控制：`WECHAT_COVER_GEMINI_TIMEOUT_MS`（单次 gemini 生成）和 `WECHAT_COVER_SCORE_TIMEOUT_MS`（单次 codex 评分）。
  - 容错回退：`WECHAT_COVER_GEMINI_FALLBACK_GLM=true` 时，gemini 超时/失败会自动回退 GLM，避免整次发布中断。
  - 默认自动做“去水印后处理”（裁掉右下角区域后再输出公众号封面比例）。
  - 自动注入到临时 markdown 并发布草稿。
  - 自动走“从正文选择封面 -> 下一步 -> 确认 -> 保存草稿”。
  - 默认优先匹配 `2.35` 比例候选图，可用 `WECHAT_COVER_PREFER_RATIO` 调整。
  - 可用 `WECHAT_COVER_IMAGE` 指定本地封面，跳过 GLM 生成。
  - 去水印参数：`WECHAT_COVER_REMOVE_WATERMARK`、`WECHAT_COVER_WATERMARK_TRIM_RIGHT_RATIO`、`WECHAT_COVER_WATERMARK_TRIM_BOTTOM_RATIO`（或 `*_PX`）。
- 已固化为 skill：`publish/skills/publish-wechat/SKILL.md`
  - 一键发布（单篇）：`npm run publish:wechat -- --file "blog_new/source/_posts/xxx.md"`
  - 一键发布 + 自动封面：`npm run publish:wechat:auto-cover -- --file "blog_new/source/_posts/xxx.md"`
  - 发布后检查：`publish/output/wechat/audit/*-appmsgid-*.json|png` 与 `*-cover-appmsgid-*.json|png`

注意：
- `WECHAT_ARTICLE_THEME` 仅在统一入口 `publish/publish-all.js`（或 `npm run publish:*`）下自动加载生效。
- 直接运行 `node scripts/post-wechat.js` 时，如需主题生效请显式传 `--theme` 或先注入对应环境变量。

本地单独调试：

```bash
# 只打印执行计划，不真正发布
node scripts/post-feishu.js --input publish/output/feishu/<slug>.payload.json --source blog_new/source/_posts/<slug>.md
node scripts/post-x.js --input publish/output/x/<slug>.payload.json --source blog_new/source/_posts/<slug>.md
```

## Output

- 预览文件：`publish/output/<platform>/*.preview.md`
- 发布日志：`publish/state/publish-log.jsonl`
- 发布状态：`publish/state/state.json`
