# Session Context (2026-03-01)

## Scope Completed
- Built social publish framework under `publish/` and wrapper scripts under `scripts/`.
- Added WeChat one-click publish pipeline with:
  - markdown publish
  - draft audit artifacts (png + json)
  - cover generation pipeline
  - cover apply automation to draft
- Added WeChat cover multi-engine support (`gemini-cli` / `glm`) and scorer support (`codex-cli` / heuristic).

## Deployment + Git Flow
- Content/dev branch: `source`
- Site deploy target: `master` via `blog_new` Hexo deploy
- Confirmed deploy command chain:
  1. `cd blog_new`
  2. `npm run clean`
  3. `npm run build`
  4. `npm run deploy`

## Recent Commits (source)
- `027583f` feat(publish): add social publish framework and platform adapters
- `ad8264a` feat(wechat): add one-click publish and automated cover workflow
- `ab2204f` 文档：更新 OpenClaw 架构设计文章内容

## User Preferences
- Commit messages should be in Chinese.
- If Gemini cover generation fails/timeouts, user prefers manual cover generation prompt instead of forced fallback output quality degradation.
- For now, WeChat automation work can stop; manual cover generation is acceptable.

## Current Runtime Decision
- User-local config has auto cover generation disabled:
  - `WECHAT_AUTO_COVER_GLM=false` in `~/.config/blog-publish.env`
- Keep WeChat publish flow usable without auto cover.

## Known Operational Notes
- Direct `node scripts/post-wechat.js` does not auto-load `~/.config/blog-publish.env` by itself.
- `publish/publish-all.js` does load env from `PUBLISH_ENV_FILE` -> `~/.config/blog-publish.env` -> `.env`.
- Theme/application issues are often env-loading path issues rather than renderer defects.

## Artifacts
- WeChat audit files are stored in `publish/output/wechat/audit/`.
- Cover outputs are stored in `publish/output/wechat/cover/`.
