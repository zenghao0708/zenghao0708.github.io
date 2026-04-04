# 微信公众号发布规则

## 默认入口

- 项目入口脚本：`scripts/post-wechat.js`
- 统一发布入口：`node publish/publish-all.js --platform wechat --publish`

## 主题与排版

- 默认主题固定为 `mdnice-lanqing`。
- 不要默认回退到 `grace`；此前已验证它会让技术文章排版效果明显变差。
- 如未显式指定 theme，环境变量和脚本默认值都应保持 `WECHAT_ARTICLE_THEME=mdnice-lanqing`。

## 封面规则

- 自动封面由 `scripts/wechat-cover-glm.js` 生成，再由 `scripts/wechat-cover-apply.ts` 应用到草稿。
- 手动封面优先关闭自动流程：`WECHAT_AUTO_COVER_GLM=false`。
- 推荐保留：
  - `WECHAT_COVER_ENGINE=gemini-cli|glm`
  - `WECHAT_COVER_SCORER=codex-cli|auto|heuristic|none`
  - `WECHAT_COVER_GEMINI_FALLBACK_GLM=true`
- 自动裁切目标保持 `900x383`，默认偏好比例 `2.35`。

## 运行约束

- 必须使用已登录公众号后台的 Chrome profile。
- 发布后要保留审计产物：
  - `publish/output/wechat/audit/*-appmsgid-*.json|png`
  - `publish/output/wechat/audit/*-cover-appmsgid-*.json|png`

## 复用规则

- 遇到排版异常，先核对 theme，再看 payload 和审计截图，不要直接怀疑正文 Markdown。
- 遇到封面异常，优先看引擎超时、评分回退、裁切比例，而不是直接更换整条发布链路。
