# X 发布规则

## 默认入口

- 项目入口脚本：`scripts/post-x.js`
- 统一发布入口：`node publish/publish-all.js --platform x --publish`

## 发布模式

- 默认使用 `article` 模式发布长文。
- `tweet` 模式仅用于短帖或 thread。

## 约束

- 必须使用已登录 X 的 Chrome profile。
- 推荐使用独立自动化 profile，如 `~/.local/share/x-browser-profile-automation`，不要复用日常手工浏览器 profile。
- 长文发布优先使用原始 Markdown 源文件；如果没有，再回退到 payload 内的 markdown/thread。
- 自动引流 tweet 只在明确需要时开启；默认建议关闭 `X_ARTICLE_AUTO_PROMO=false`，避免多发一条噪音推广帖。
- `scripts/post-x.js` 在真实执行前会尝试清理同一 profile 下残留的 Chrome/CDP 进程；如果要保留窗口供人工接管，需显式关闭该清理逻辑：`X_KILL_STALE_BROWSER=false`。

## 内容约束

- 文章链接依赖博客 permalink；如文章需要稳定 URL，应先确认 `abbrlink` 已配置。
- 如附图，只使用存在的本地图片，最多 4 张。

## 复用规则

- 如果发布失败，优先检查：
  - Chrome profile 是否可用
  - 是否有残留 Chrome 仍占用同一 `--user-data-dir`
  - 调试端口/浏览器连接是否正常
  - 源 Markdown 是否存在
  - 是否误开了不需要的 auto promo
