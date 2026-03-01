---
name: publish-xhs
description: 发布文章到小红书。用于把 Markdown 内容转换为小红书图文文案与图片清单，并通过命令模板执行发布流程。当用户提到小红书发布、笔记同步、批量发布 XHS 时使用。
---

# publish-xhs

1. 接收统一发布入口生成的 payload 文件。
2. 生成标题、正文和图片列表。
3. 调用发布命令（来自 `PUBLISH_XHS_CMD`）。
4. 返回笔记链接或草稿 ID。

## Command Template

- 环境变量：`PUBLISH_XHS_CMD`
- 占位符：`{file}` `{source}` `{title}` `{slug}` `{platform}`

示例：

```bash
PUBLISH_XHS_CMD='node scripts/post-xhs.js --input {file}'
```
