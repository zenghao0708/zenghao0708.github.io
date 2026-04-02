# 小红书发布规则

## 默认入口

- 项目入口脚本：`scripts/post-xhs.js`
- 素材准备脚本：`scripts/xhs-prepare-assets.js`
- 统一发布入口：`node publish/publish-all.js --platform xhs --publish --force`

## 素材生成规则

- 不再手工维护发布图文素材，统一从博客 Markdown 自动分析生成。
- 默认生成 4 张竖版图片，尺寸固定 `1080x1440`，适配 `3:4`。
- 标题控制在 `20` 字左右。
- 标签控制在 `3-5` 个。
- 素材目录必须按“时间 / 主题 / 文章”归档到：
  - `~/Library/Mobile Documents/com~apple~CloudDocs/AI 文档/小红书/<year>/<year-month>/<theme>/<yyyymmdd_slug>/`

## 自动发布规则

- 先生成素材，再发布；不要直接拿无图 payload 去发图文笔记。
- 首页入口必须点击 `发布图文笔记`，不能误进视频发布入口。
- 上传后等待标题输入框出现，再填写标题和正文。
- 发布成功判定不能只依赖旧弹窗：
  - URL 变化
  - 离开 `target=image`
  - 页面出现 `发布成功/审核中/创作中心/笔记管理`
  - 发布按钮与标题输入框同时消失

## 失败沉淀

- 自动发布失败时必须保存审计产物到 `publish/output/xhs/audit/`。
- 常见坑位：
  - 没有图片：`图文笔记至少需要 1 张图片`
  - 错误入口：进了视频页
  - 成功判定过窄：页面已跳转但脚本还在等旧 selector

## 复用规则

- 如果自动发布失败，不阻塞素材生成和 iCloud 归档。
- 保留 `payload.json` 和 `发布内容.txt`，保证手机端可直接补发。
