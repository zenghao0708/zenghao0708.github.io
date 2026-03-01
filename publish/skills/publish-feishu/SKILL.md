---
name: publish-feishu
description: 发布文章到飞书知识库。用于将 Markdown 原文与图片清单转换为飞书可发布内容，并通过命令模板执行发布流程。当用户提到飞书知识库发布、飞书文档发布、批量同步到飞书时使用。
---

# publish-feishu

1. 接收统一发布入口生成的 payload 文件。
2. 校验 title、markdown、images 字段完整性。
3. 调用飞书发布命令（来自 `PUBLISH_FEISHU_CMD`）。
4. 返回发布结果 URL 或文档 ID。

## Command Template

- 环境变量：`PUBLISH_FEISHU_CMD`
- 占位符：`{file}` `{source}` `{title}` `{slug}` `{platform}`

推荐命令：

```bash
PUBLISH_FEISHU_CMD='node scripts/post-feishu.js --input {file} --source {source} --mode create --execute --submit'
```
