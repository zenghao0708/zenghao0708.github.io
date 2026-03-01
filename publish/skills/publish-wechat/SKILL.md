---
name: publish-wechat
description: 发布文章到微信公众号（含自动封面）。用于将 Markdown 文章与图片转换为公众号草稿，并可选用 GLM 生成封面、自动“从正文选择封面”并保存审计截图/JSON。当用户提到公众号发布、微信图文同步、自动封面时使用。
---

# publish-wechat

## Workflow

1. 接收统一发布入口生成的 payload（`publish/output/wechat/*.payload.json`）。
2. 调用 `scripts/post-wechat.js` 发布文章草稿（`mode=article`）。
3. 如开启自动封面，使用 `scripts/wechat-cover-glm.js` 生成封面图。
4. 封面可使用多引擎（`glm|gemini-cli`）、多候选生成（`WECHAT_COVER_VARIANTS`）。
5. 自动评分选优（默认 `codex-cli` 评分，失败回退启发式评分）。
6. 封面生成后自动执行“去水印后处理”（裁切右下角区域，可配置）。
7. 将封面临时注入 markdown，发布草稿。
8. 自动执行“从正文选择封面 -> 下一步 -> 确认 -> 保存草稿”。
9. 产出审计截图与 JSON 报告（草稿正文指标 + 封面应用结果）。

## Command Template

- 环境变量：`PUBLISH_WECHAT_CMD`
- 占位符：`{file}` `{source}` `{title}` `{slug}` `{platform}`

默认命令（推荐，自动封面由环境变量控制）：

```bash
PUBLISH_WECHAT_CMD='node scripts/post-wechat.js --input {file} --source {source} --mode article --execute --submit'
```

自动封面（推荐）：

```bash
WECHAT_AUTO_COVER_GLM=true
```

## Required Env

- `WECHAT_CHROME_PROFILE`: 已登录公众号后台的 Chrome profile 目录。
- `BAOYU_POST_TO_WECHAT_SKILL_DIR`: `baoyu-post-to-wechat` skill 路径。
- `WECHAT_AUTO_COVER_GLM=true`: 启用自动封面链路。
- `WECHAT_GLM_API_KEY`（或 `ZHIPU_API_KEY` / `GLM_API_KEY`）: GLM 画图 key。

## Cover Defaults

- 引擎：`WECHAT_COVER_ENGINE=gemini-cli`（可改 `glm`）
- 候选数：`WECHAT_COVER_VARIANTS=1`（建议 `3-5`）
- 评分器：`WECHAT_COVER_SCORER=codex-cli`
  - `codex-cli`：失败时自动回退 `heuristic`
  - 也可用 `auto`（优先 codex-cli，失败回退 heuristic）
- 超时：`WECHAT_COVER_GEMINI_TIMEOUT_MS`（默认 600000）与 `WECHAT_COVER_SCORE_TIMEOUT_MS`（默认 120000）
- 回退：`WECHAT_COVER_GEMINI_FALLBACK_GLM=true`（gemini 失败时自动用 GLM 兜底，避免发布中断）
  - 可强制 `codex-cli|heuristic|none`
- 生成尺寸：`1888x800`（约 `2.36:1`）。
- 默认去水印：`WECHAT_COVER_REMOVE_WATERMARK=true`
  - 右侧裁切比例：`WECHAT_COVER_WATERMARK_TRIM_RIGHT_RATIO=0.08`
  - 底部裁切比例：`WECHAT_COVER_WATERMARK_TRIM_BOTTOM_RATIO=0.10`
  - 可改为固定像素：`WECHAT_COVER_WATERMARK_TRIM_RIGHT_PX` / `WECHAT_COVER_WATERMARK_TRIM_BOTTOM_PX`
- 自动裁剪：`900x383`（可关闭 `WECHAT_COVER_CROP_900383=false`）。
- 选图偏好比例：`WECHAT_COVER_PREFER_RATIO=2.35`。

## Validate Outputs

- 草稿审计：`publish/output/wechat/audit/*-appmsgid-*.json|png`
- 封面审计：`publish/output/wechat/audit/*-cover-appmsgid-*.json|png`
- 关键字段：
  - `appmsgid`
  - `draftUrl`（token 已脱敏）
  - `textLength/paragraphCount/codeBlockCount...`
  - `selectedIndex/totalCandidates`
