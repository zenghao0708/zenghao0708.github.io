---
name: publish-x
description: 发布文章到 X(Twitter)。用于将 Markdown 文章拆解成 thread 文案与配图输入，并通过命令模板执行发布流程。当用户提到发推、发 thread、同步博客到 X 时使用。
---

# publish-x

1. 接收统一发布入口生成的 payload 文件。
2. 校验文案、图片、来源文件。
3. 调用发布命令（来自 `PUBLISH_X_CMD`）。
4. 当 `mode=article` 且真实发布时，可自动补发一条简短引流 tweet（受 `X_ARTICLE_AUTO_PROMO` 控制）。
5. 返回 tweet 链接或文章发布结果。

## Command Template

- 环境变量：`PUBLISH_X_CMD`
- 占位符：`{file}` `{source}` `{title}` `{slug}` `{platform}`

推荐命令：

```bash
PUBLISH_X_CMD='node scripts/post-x.js --input {file} --source {source} --mode article --execute --submit'
```
