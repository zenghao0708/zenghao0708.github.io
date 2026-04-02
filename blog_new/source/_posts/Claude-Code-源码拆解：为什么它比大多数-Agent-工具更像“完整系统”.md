---
title: Claude Code 架构拆解：一个更像“完整系统”的 AI Coding Agent
date: 2026-04-01 19:35:00
tags:
  - AI
  - Claude Code
  - Agent
  - 架构设计
  - 源码分析
  - AI 编程
  - 开发工具
categories: AI
abbrlink: claude-code-source-architecture
description: 从 QueryEngine、工具调度、上下文压缩、权限治理、插件与 Skills、多代理和远程化几个维度，拆解 Claude Code 为什么更像一个完整的 AI Coding Agent 系统。
---

# Claude Code 架构拆解：一个更像“完整系统”的 AI Coding Agent

看完 Claude Code 的源码还原版本后，我对它的判断很明确：

它的优势并不主要来自“模型能力”，而来自非常系统化的 runtime 设计。
如果把很多 Agent 工具理解为“LLM + tools + shell”的组合，那 Claude Code 已经明显进入了下一阶段：它在做的是 agent runtime、agent OS 和 productized orchestration。

下面从几个技术层面拆开说。

<!-- more -->

## 1. 它不是 CLI 壳子，而是引擎和交互层分离

Claude Code 很重要的一个设计，是把会话执行生命周期抽到了 `QueryEngine` 中。

这意味着：

- 会话状态不是散落在 UI 组件里
- headless/SDK 和 REPL 可以复用同一套核心逻辑
- 消息、权限拒绝、工具调用、usage、session persistence 都有统一承载层

这类抽象非常关键，因为很多 Agent 工具后期难以扩展，根本原因就是一开始把交互层和执行层写死了。

Claude Code 的设计更像：

- `main.tsx` 负责启动、装配、初始化
- `QueryEngine` 负责 session lifecycle
- `query.ts` 负责主代理循环
- `Tool` / `tools.ts` 负责能力注册与运行时装配
- `commands.ts` 负责 slash command 层
- `services/*` 负责具体业务能力

这种结构在可维护性上明显更高。

## 2. 启动优化做得很“产品工程”

`main.tsx` 一开始就做了两件很有代表性的事：

- 提前触发系统配置读取
- 提前触发 keychain / oauth 读取

而且这些动作不是顺序执行，而是与后续模块导入并行。
同时还会预取 GrowthBook、远程托管配置、MCP 官方 registry 等数据。

这反映出一个成熟产品团队的典型思路：
启动不是“把代码跑起来”就行，而是要把昂贵 IO 尽量藏进启动管线里。

很多 Agent 工具的冷启动慢，不是因为模型慢，而是初始化阶段没有被当成性能工程来做。

## 3. 主查询循环不是简单的“模型调用”

`query.ts` 是核心中的核心。

它处理的事情包括：

- system prompt 拼装
- user/system context 注入
- 工具流式执行
- token budget 管理
- fallback model
- auto compact
- tool use summary
- stop hooks
- 流式错误恢复

这说明 Claude Code 的“一个回合”并不是单次 LLM request，而是一个状态机驱动的 agent loop。

更关键的是，源码里能看到它不是仅靠 prompt 约束，而是有明确的运行时保护：
例如对 `max_output_tokens` 错误的 withholding 逻辑，不会过早把中间错误暴露给 SDK 消费方，避免上层误判 session 已经结束。

这种设计很有工程味。
它说明 Claude Code 团队已经在处理“上层调用方如何感知 agent 状态”这种平台问题。

## 4. 工具调度是它最强的工程亮点之一

很多 Agent 工具对 tool use 的处理都比较粗：

- 模型吐一个 tool call
- runtime 执行
- 结果塞回上下文
- 再继续

Claude Code 明显不是这个水平。

它有两套值得关注的机制：

### 第一层：批次级编排

`toolOrchestration.ts` 会先把工具调用分批：

- 并发安全的一组连续工具可以打成一个 batch
- 非并发安全工具单独串行

这背后的前提是每个工具都能声明 `isConcurrencySafe`。

这不是简单的性能优化，而是把“工具语义”提升成调度决策的一部分。

### 第二层：流式执行器

`StreamingToolExecutor` 更进一步，处理的是工具在 streaming response 中边到达边执行的问题。

它做了几件很成熟的事：

- 跟踪 queued / executing / completed / yielded 状态
- 支持 sibling abort controller
- 某个工具失败时取消并行兄弟任务
- streaming fallback 时丢弃未完成工具结果
- 根据 interruptBehavior 决定用户打断后取消还是阻塞

这套逻辑说明 Claude Code 已经不只是“tool calling”，而是在做 agent action scheduler。

## 5. 它把上下文溢出当成系统故障，不是普通异常

Claude Code 的上下文治理非常重。

`autoCompact.ts` 里可以看到：

- 有有效上下文窗口计算
- 为 compact summary 预留输出 token
- 有 warning threshold / error threshold / blocking limit
- 有自动 compact 阈值
- 有连续失败熔断，避免不可恢复 session 无限重试
- 与 reactive compact / context collapse 模式有协调关系

这个细节非常重要。

很多 Agent 工具的策略是：
“超了就总结一下。”

Claude Code 的策略更像：
“上下文是受控资源，要像内存管理一样治理。”

这正是成熟 runtime 和 demo agent 的差别。

## 6. 权限系统是多层治理，不是弹窗逻辑

Claude Code 的权限链路至少包含这些层：

- allow / deny / ask 规则
- tool 粒度匹配
- MCP server 级匹配
- sandbox override
- working dir 限制
- hooks 决策
- classifier 决策
- interactive / coordinator / swarm worker 不同处理器

`useCanUseTool.tsx` 还负责把这一整套机制串起来，并根据运行模式决定是否弹出 UI、是否等待自动化检查、是否走 worker 权限处理。

这意味着 Claude Code 的权限系统不是 UI 层拼出来的，而是 runtime 中的一等公民。

这也是为什么它可以同时支持：

- 交互式会话
- 子代理
- swarm / coordinator
- SDK / headless

而不把权限搞崩。

## 7. 它的能力扩展体系是“分层装配”的

Claude Code 的扩展不是一个统一 plugin entrypoint，而是多层次能力叠加：

- `commands`
- `tools`
- `skills`
- `plugins`
- `MCP resources / MCP tools`

更细一点看：

- skills 可以从本地目录、managed path、plugin、bundled、MCP 加载
- builtin plugin 可以携带 skills、hooks、MCP servers
- MCP skill 被明确视为远端不可信能力，不能 inline 执行

这套分层有两个好处：

- 产品可以按用户心智暴露不同入口
- 安全策略可以按能力类型分别治理

这比“所有东西都是插件”更复杂，但也更稳。

## 8. 多代理架构已经相当靠前

`AgentTool` 是 Claude Code 非常值得看的部分。

从 schema 就能看到它已经支持：

- `run_in_background`
- `subagent_type`
- `team_name`
- `mode`
- `isolation: worktree | remote`
- `cwd` override

而且内部结果类型里已经区分：

- `completed`
- `async_launched`
- `teammate_spawned`
- `remote_launched`

说明它不是“再开一个模型会话”这么简单，而是已经有多种 agent execution backend：

- 同进程 / 同步子代理
- 后台本地代理
- teammate / swarm 模式
- remote CCR agent
- worktree 隔离 agent

这也是 Claude Code 相比一般 coding agent 最本质的领先点之一：
它已经从单代理执行器，演化成多代理任务平台。

## 9. Git worktree 隔离是很聪明的产品设计

`EnterWorktreeTool` 不是嘴上建议你“开个分支再改”，而是真的：

- 检查当前 session 是否已在 worktree
- 找 canonical git root
- 创建 session 级 worktree
- 切换 cwd
- 保存 worktree state
- 清缓存并刷新 prompt sections

这带来的价值很大：

- 降低主工作区污染
- 降低并行任务冲突
- 提高多 agent 同时工作时的可控性

很多 Agent 工具的问题不是不能写代码，而是它们总在用户主工作区里裸奔。
Claude Code 在这里明显更重视隔离性。

## 10. “隐藏功能”说明它的目标远超本地编码助手

源码里几个很有代表性的方向：

### 远程定时代理

`scheduleRemoteAgents` 明确写的是 remote Claude Code agents，不是 local cron。
每个 trigger 会在 Anthropic 云端隔离环境里启动完整远程 session。

这已经不是 CLI helper，而是在做 cloud agent runtime。

### 语音链路

`voiceStreamSTT.ts` 直接接 WebSocket STT 服务，支持 push-to-talk，并且能路由到 conversation-engine + Deepgram Nova 3。

说明语音并不是 UI 幻觉，而是有实际 runtime 支持。

### Team Memory Sync

团队记忆不是本地 cache，而是 repo-scoped、authenticated org members 共享的同步系统，还带 secret scan 和 delta upload。

这说明 Claude Code 在尝试把“项目记忆”做成组织级能力。

### Undercover mode

在公共仓库里自动收敛提交 / PR 中的 Anthropic 内部信息，避免泄漏内部代号、版本和 attribution。

这是一个非常产品化的安全设计，说明它已经深入组织内部真实工作流。

### Kill switch / remote managed settings

源码中大量 feature gate、GrowthBook、remote managed settings、per-sink analytics killswitch，都表明这个产品可以被远程治理、灰度、回滚。

这是一种标准的“可运营客户端”形态，不是单纯本地工具。

## 最后的判断

如果只看表层能力，Claude Code 看起来像一个功能很多的 coding agent。

但如果看架构，你会发现它真正接近的是：

- 一个 agent runtime
- 一个可治理的 tool execution platform
- 一个面向长会话的上下文管理系统
- 一个多代理协作框架
- 一个支持远程执行和组织级能力同步的产品底座

所以，Claude Code 比很多 Agent 工具更好用，不是因为它只在“模型回答”上做得更强，而是因为它把 Agent 在真实世界里最容易出问题的几件事，都做成了系统能力：

- 调度
- 压缩
- 权限
- 隔离
- 扩展
- 远程化
- 运营治理

一句话总结：

Claude Code 的本质，不是“更强的 AI 编程助手”，而是“更完整的 Agent 操作系统雏形”。
