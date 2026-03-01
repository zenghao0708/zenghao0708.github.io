# Context Brief

- 开发分支：`source`；站点发布目标：`master`（通过 `blog_new` 的 `hexo deploy`）。
- 社媒发布入口：`publish/publish-all.js`；微信发布脚本：`scripts/post-wechat.js`。
- 用户偏好：commit message 使用中文。
- 当前决策：微信公众号封面改为手动生成优先，自动封面可关闭（`WECHAT_AUTO_COVER_GLM=false`）。
- 审计目录：`publish/output/wechat/audit/`；封面目录：`publish/output/wechat/cover/`。
- 环境变量加载优先级：`PUBLISH_ENV_FILE` -> `~/.config/blog-publish.env` -> `.env`。
