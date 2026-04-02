# 发布工具链地图

这份文档用于快速回答三个问题：

1. 这个仓库里哪些脚本是真正在线路上跑的
2. 哪些规则已经沉淀，应该先查文档而不是重复排障
3. 哪些目录只是历史资产或兼容层

## 1. 项目主入口

- 统一入口：`publish/publish-all.js`
- 平台脚本：
  - `scripts/post-feishu.js`
  - `scripts/post-wechat.js`
  - `scripts/post-x.js`
  - `scripts/post-xhs.js`
- 小红书素材准备：
  - `scripts/xhs-prepare-assets.js`
  - `scripts/xhs-export-to-icloud.js`

## 2. 平台规则

- 飞书：`publish/rules/feishu.md`
- 微信公众号：`publish/rules/wechat.md`
- X：`publish/rules/x.md`
- 小红书：`publish/rules/xhs.md`

优先做法：

- 先看规则，再查脚本，再看审计产物
- 不要直接在平台脚本里重复试错

## 3. 技能与仓库关系

- Codex 全局 skills 在 `~/.codex/skills/`
- 仓库里的 `publish/skills/` 是回指全局 skill 的符号链接，用于快速发现和对照
- 如果改了仓库发布规则，需要同步更新对应 skill 的 `SKILL.md`

## 4. 兼容层

- `publish/tools/` 仅保留旧命令路径 wrapper
- 目的：兼容历史环境变量、旧日志里的命令模板和手工命令
- 新功能不要继续加在这里

## 5. 历史资产

- `scripts/archive/`：历史试验脚本、旧发布方案
- `docs/assets/cover-image/`：可复用封面提示词和素材上下文

这些目录可以复用，但不属于当前主发布链路。

## 6. 常见定位顺序

1. 看 `AGENTS.md` 确认入口和约定
2. 看 `publish/rules/*.md` 确认平台规则
3. 看 `publish/README.md` 和对应 `scripts/*.js`
4. 看 `publish/output/<platform>/` 的 preview / payload / audit
5. 必要时再回查 `scripts/archive/`
