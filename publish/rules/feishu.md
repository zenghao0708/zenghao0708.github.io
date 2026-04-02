# 飞书发布规则

## 默认入口

- 项目入口脚本：`scripts/post-feishu.js`
- 统一发布入口：`node publish/publish-all.js --platform feishu --publish`

## 约束

- 以 Markdown 原文为准，优先传原始文章路径。
- `create` 与 `append` 必须显式区分：
  - `create` 可选 folder token
  - `append` 必须提供 doc id

## 复用规则

- 不要把飞书目录 token、真实文档 id 或密钥写进仓库。
- 如果只是验证链路，优先 dry-run，看 payload 和 uploader 计划是否正确。
