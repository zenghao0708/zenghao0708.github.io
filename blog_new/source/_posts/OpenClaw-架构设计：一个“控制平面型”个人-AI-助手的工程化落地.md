---
title: OpenClaw 架构设计：一个“控制平面型”个人 AI 助手的工程化落地
date: 2026-03-01 10:47:43
tags:
  - AI
  - OpenClaw
  - Agent
categories: AI
abbrlink: openclaw-architecture
description: 基于官方 OpenClaw 源码与本机运行态目录，拆解 Gateway 控制平面、WS/HTTP surfaces、多渠道接入、skills 平台、插件与记忆系统，并给出 ~/.openclaw 的落地映射与排障 checklist。
---


## 前言

OpenClaw 的定位更接近“个人 AI 助手系统”，而不是一个单纯的聊天机器人：它运行在你自己的设备上，通过你已经在用的渠道（WhatsApp/Telegram/Slack/Discord/Signal/iMessage/Google Chat/Microsoft Teams/WebChat…）回答你；同时它还能提供语音、节点能力（iOS/Android/macOS）、浏览器控制与一个可视化的 Live Canvas。

在官方文档里有一句我很认同的表述：**Gateway 只是控制平面（control plane）**，真正的产品是“助手本身”。因此这篇文章不讲安装流程，而是关注工程化落地里最关键的三件事：

- 系统怎么拆层：控制平面、通道、技能、插件、记忆、运维面
- 默认安全边界是什么：如何把“真实消息面”当作不可信输入来处理
- 落地到本机后怎么维护：哪些目录是“真源”，哪些是“可重建索引/缓存”

本文基于两份本地资料整理：

- 官方 OpenClaw 源码：https://github.com/openclaw/openclaw (2026.2.26)
- 本机运行态目录：`~/.openclaw/`（只描述职责与路径，不展示任何密钥/令牌/账号内容）

<!-- more -->

## 阅读路线

- 想快速建立全局认知：先看“一句话架构”→“关键链路”→“安全边界”
- 想理解工程取舍：看“核心模块拆解”→“功能亮点”
- 想直接落地到本机与排障：跳到“目录映射”→“排障 Checklist”

## 一句话架构

一句话总结：OpenClaw 用一个长驻的 Gateway 统一承载“通道连接 + 会话/事件 + 控制面协议（WS）+ 对外 HTTP surfaces”，其他一切（Web 控制台、节点、工具链、插件/skills）都围绕它展开。

从“消息面 → 控制平面”的视角画一张图：

```text
Channels (WhatsApp/Telegram/Slack/Discord/Signal/…)
                |
                v
     +---------------------------+
     |          Gateway          |  单一真源：sessions / presence / config / cron / hooks / tools
     |      (control plane)      |
     |   WS + HTTP 同端口复用     |  ws://127.0.0.1:18789  +  http://127.0.0.1:18789/...
     +-------------+-------------+
                   |
                   +-- Agent runtime (Pi RPC, event streaming)
                   +-- Control UI / WebChat (Gateway 直接提供)
                   +-- Nodes (iOS/Android/macOS，通过 WS 配对)
                   +-- Browser/Canvas/tools (通过控制面与 HTTP surfaces)
```

```text
名词速查：
- Gateway：长驻进程，持有通道连接与运行态状态（单一真源）
- 控制平面（control plane）：面向 UI/节点/运维的统一协议层（WS 为主）
- Surfaces：Gateway 暴露的 HTTP/WS 能力集合（UI、API、hooks、插件路由等）
- Skills：可安装/可同步的能力包（含 prompts/tools/workflows 等）
```

对照源码/文档的入口（建议顺着读）：

- 设计口径（单端口复用与控制平面）：`docs/gateway/index.md`
- Gateway 启动编排：`src/gateway/server.impl.ts`（`startGatewayServer`）
- 运行态创建（HTTP server + WS upgrade）：`src/gateway/server-runtime-state.ts`
- WS 连接与握手：`src/gateway/server/ws-connection.ts`
- HTTP surfaces 汇总：`src/gateway/server-http.ts`

## 安全边界（默认策略）

因为 OpenClaw 接入的是“真实消息面”，所以系统默认把 DM 当作 **不可信输入** 并设了比较硬的安全门槛。

### DM 默认 pairing（先配对、后处理）

在默认配置下，陌生人给你的 bot 发 DM，不会直接进入主流程，而是收到一个 **pairing code**，需要你显式批准之后才会处理后续消息。

相关入口（用于核对默认值与决策逻辑）：

- `src/security/dm-policy-shared.ts`（dmPolicy 默认 pairing）
- `src/web/inbound/access-control.ts`（pairing 回复与落库/allowlist 逻辑）
- `docs/channels/pairing.md`（pairing 的概念与文件约定）

### Control UI / 设备连接也需要配对（远程更严格）

Control UI 在本机回环访问时体验最好；一旦你把 Gateway 暴露到局域网/tailnet/SSH，**设备级配对与鉴权** 就会成为第一道防线（即便你在同一个网络里）。

文档入口：

- `docs/web/control-ui.md`（设备配对与远程访问模型）

## 关键链路：从消息到回复

把主链路抽象成 9 步（把“安全门槛”也算进来）：

1. 通道收到入站消息（DM/群组/提及等）
2. 进入 Gateway 前先做访问控制判定（例如 DM pairing、allowlist、群组策略）
3. Gateway 基于 sessionKey 绑定会话（direct chat 走 main；群组隔离是常见默认）
4. Gateway 触发 Agent 执行（Pi RPC），并订阅事件流
5. Agent 持续产出事件（assistant/tool/lifecycle）
6. Gateway 将事件整形为面向 UI/节点的派生视图（例如流式 chunk、verbose 策略）
7. 通过 WS 控制面广播到 Control UI，并按订阅推送给节点
8. 必要时通过 HTTP surfaces 暴露能力（hooks、工具调用、插件路由、可选的 OpenAI/Responses API）
9. 由通道侧完成回推（或由 Gateway/通道模块协作完成发送）

源码入口（偏“读代码找主干”）：

- WS 方法与事件列表：`src/gateway/server-methods-list.ts`
- WS 连接与握手：`src/gateway/server/ws-connection.ts`
- HTTP surfaces 聚合：`src/gateway/server-http.ts`

## 核心模块拆解

### CLI 入口层（启动前置与“向导优先”）

官方推荐路径是 `openclaw onboard`。它通过向导驱动完成配置、通道、skills 与守护进程初始化。

CLI 的职责本质是：

- 提供一个稳定的“运维/配置/诊断面”
- 统一命令集：`doctor/onboard/update/logs/...`（覆盖安装、升级、迁移、风险提示）

代码入口：

- `src/entry.ts`：CLI 进程启动与前置处理
- `src/cli/*`：各子命令组织

### Gateway（控制平面：WS + HTTP 同端口复用）

Gateway 的关键不是“能开一个 WS”，而是把控制平面做成产品化组件：单端口复用、可热重载、可观测、可扩展、默认安全。

在启动编排里能看到典型顺序：

- 读取配置快照、迁移 legacy schema、必要时落盘
- 加载插件注册表，并把 channel 插件扩展进 Gateway methods
- 创建运行态（HTTP server + WS upgrade handler）
- 启动 channels、discovery、维护定时器、config reload 等后台能力

代码入口：

- `src/gateway/server.impl.ts`（`startGatewayServer`）
- `src/gateway/server-runtime-state.ts`（HTTP/WS runtime state）
- `src/gateway/server-http.ts`（HTTP routes 聚合）

### WS 控制面（方法调用、事件广播、慢消费者策略）

WS 是控制平面的核心通道：Control UI、节点、远程工具链都靠它完成方法调用与事件订阅。

建议读代码时关注 3 点：

- connect.challenge：握手挑战与鉴权入口
- methods 列表：基础方法 + channel 插件扩展
- 广播策略：是否允许 `dropIfSlow`（避免慢消费者拖垮主流程）

代码入口：

- `src/gateway/server/ws-connection.ts`
- `src/gateway/server-methods-list.ts`

### Channels（通道：插件化注册表 + 统一治理）

官方版本把 channels 做成“插件注册表”，Gateway 并不把每个通道写死在 core 中，而是通过插件体系加载并统一治理其生命周期与能力暴露（包括扩展 gateway methods）。

代码入口：

- `src/channels/plugins/index.ts`（`listChannelPlugins`，由 plugin loader 注册）

文档入口：

- `docs/channels/`（各通道的接入与策略说明）

### Skills（能力包：bundled / managed / workspace）

skills 是 OpenClaw 的“可扩展能力面”，通常包含 prompts、工具描述、工作流与一些脚本资源。官方仓库本身也带了一组基础 skills（`/skills/*/SKILL.md`）。

这里分享一个小技巧：`~/.openclaw/workspace/skills` 软连接到 `~/.agents/skills`(可以替换为你的 skills 目录)，这样OpenClaw 默认会从该路径加载你的自定义 skills。

代码入口（用于理解“skills 怎么被聚合、怎么触发刷新”）：

- `src/agents/skills.ts`
- `src/gateway/server.impl.ts`（skills change listener 会延迟刷新远端 node bins）

### Plugins（扩展面：强约束 + 供应链防线）

插件体系不仅是“扩展点”，还是一套供应链安全策略：

- 插件必须带 `openclaw.plugin.json` 且需要 schema 校验
- 插件安装默认限制 npm registry spec，并使用 `--ignore-scripts`

文档入口：

- `docs/cli/plugins.md`

代码入口：

- `src/plugins/loader.ts`

### Memory（记忆：真源 vs 索引）

记忆系统偏“工程化”：以文件为真源，索引层（例如 SQLite/FTS/向量）用于加速检索与混合召回。索引可重建，真源不可丢。

代码入口：

- `src/memory/manager.ts`

文档入口：

- `docs/cli/memory.md`

### Config / Reload / Logging（运维面）

三个关键词：**迁移、热更、可观测**。

- config：启动即迁移/校验，避免“跑着跑着才发现不兼容”
- reload：支持 hybrid 模式（能热更就热更，否则触发重启）
- logs：结构化 JSON line + 滚动策略；并支持通过控制平面远程 tail

文档入口：

- `docs/gateway/index.md`（reload modes）
- `docs/cli/logs.md`（logs via RPC）

代码入口：

- `src/config/config.ts`
- `src/gateway/server.impl.ts`（config migration + config reloader）
- `src/logging/logger.ts`

## 功能亮点（我认为最值得抄作业的部分）

| 能力 | 为什么重要 |
| --- | --- |
| 控制平面型 Gateway | 单一真源统一 sessions/presence/config/tools，降低系统复杂度 |
| WS + HTTP 同端口复用 | 对外面更清晰：UI/API/hooks/插件路由集中在一个网关进程里 |
| 默认 DM pairing | 把真实消息面当作不可信输入，默认不处理陌生 DM，降低被滥用风险 |
| 通道插件化注册表 | 接入更多 channels 不必把核心改成“通道大杂烩”，扩展成本更低 |
| skills 平台 | 把能力包与工作区资产解耦，支持 bundled/managed/workspace 组合 |
| 插件强约束 + 安装限制 | 把供应链防线当作一等公民，避免插件安装即执行脚本带来的风险 |
| 记忆真源与索引分离 | 可追溯、可治理、可迁移；索引坏了可重建，不绑死某个 provider |
| logs via RPC | 运维不再依赖 SSH 进机器找日志，控制平面自身提供排障入口 |

## 落地到本机：`~/.openclaw/` 目录映射

下面这份目录树做了脱敏：只讲职责，不展示任何令牌/密钥/账号信息。

```text
~/.openclaw/
├─ openclaw.json
├─ openclaw.json.bak*
├─ config.json
├─ agents/main/sessions/
├─ workspace/
│  ├─ AGENTS.md
│  ├─ USER.md / SOUL.md / TOOLS.md
│  ├─ memory/
│  ├─ skills -> ~/.agents/skills
│  └─ docs/ scripts/ temp/
├─ memory/main.sqlite
├─ devices/
├─ cron/
└─ browser/chrome-extension/
```

目录说明（按“是否可重建”优先级）：

| 路径 | 作用 | 备注 |
| --- | --- | --- |
| `openclaw.json` | 主配置 | 可能包含敏感信息（token/keys/账号等） |
| `openclaw.json.bak*` | 配置备份 | 迁移/修复时常见 |
| `config.json` | 运行态配置快照/兼容层 | 视版本而定 |
| `agents/main/sessions/` | 会话转录（JSONL） | 用于追踪/回放/排障 |
| `workspace/AGENTS.md` | 工作区说明与约定 | 工作区即契约 |
| `workspace/USER.md` `SOUL.md` `TOOLS.md` | 引导文件 | 人格/用户/工具设定 |
| `workspace/memory/` | 记忆/日志文件（Markdown） | 真源，建议优先备份 |
| `workspace/skills -> ~/.agents/skills` | 自定义 skills 入口 | 软连接 |
| `workspace/docs\|scripts\|temp` | 文档/脚本/临时产物 | 可按需清理 |
| `memory/main.sqlite` | 记忆索引库 | 不是源数据，可重建 |
| `devices/` | 节点配对信息 | 丢失需重新配对 |
| `cron/` | 定时任务定义与运行记录 | 建议备份 |
| `browser/chrome-extension/` | 浏览器扩展资产 | 用于 tab relay 自动化 |

## 排障 Checklist

先盯住三个入口，再逐步收敛问题范围：

1. 配置：优先确认 DM 策略（pairing/open）、allowlist、Gateway 的鉴权/暴露面是否符合预期
2. 日志：按子系统定位（gateway/channels/memory/plugins），先追“启动链路”再看“异常链路”
3. 会话与记忆：用 `agents/main/sessions/*.jsonl` + `workspace/memory/*.md` 还原输入输出与上下文真相

如果问题出现在“外部访问/远程 UI”，优先按这个顺序排：

1. 控制面是否暴露在回环以外（局域网/tailnet/SSH）以及是否启用了必要的鉴权
2. 设备级配对是否完成（Control UI/节点连接经常卡在 pairing required）
3. 是否触发了 DM pairing（陌生 DM 不会进入主流程，这是默认行为）

## 参考资料（官方仓库/文档/源码入口）

- 官方仓库：`https://github.com/openclaw/openclaw`
- Gateway 控制平面与单端口复用：`docs/gateway/index.md`
- Control UI：`docs/web/control-ui.md`
- Pairing（channels/DM）：`docs/channels/pairing.md`
- Gateway 启动编排：`src/gateway/server.impl.ts`
- WS 连接：`src/gateway/server/ws-connection.ts`
- HTTP surfaces：`src/gateway/server-http.ts`
- Methods 列表：`src/gateway/server-methods-list.ts`
- Plugins：`docs/cli/plugins.md`、`src/plugins/loader.ts`
- Memory：`docs/cli/memory.md`、`src/memory/manager.ts`
- Logging：`docs/cli/logs.md`、`src/logging/logger.ts`
