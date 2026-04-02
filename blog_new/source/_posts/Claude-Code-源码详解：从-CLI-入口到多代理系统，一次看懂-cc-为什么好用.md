---
title: Claude Code 源码详解：从 CLI 入口到多代理系统，一次看懂 cc 为什么好用
date: 2026-04-02 10:30:00
tags:
  - AI
  - Claude Code
  - Agent
  - 源码分析
  - 架构设计
  - AI 编程
categories: AI
abbrlink: claude-code-source-deep-dive
description: 结合 4 张结构图，详细拆解 Claude Code 从 CLI 入口、主查询循环、工具调度、上下文压缩、权限治理到多代理系统的源码设计，解释它为什么比很多 Agent 工具更顺手、更稳定。
---

# Claude Code 源码详解：从 CLI 入口到多代理系统，一次看懂 cc 为什么好用

前面我已经写过两篇关于 Claude Code 的文章：一篇偏传播，回答“为什么它比很多 Agent 工具更好用”；另一篇偏技术，回答“它为什么更像一个完整系统”。

但如果你真的想把 Claude Code 看明白，这两篇还不够。

因为 Claude Code 最容易被误解的一点是：很多人以为它只是一个“终端里的大模型”，顶多加了一些工具调用能力。可一旦你顺着源码往下看，就会发现它实际是一套分层很清楚的工程系统：

- 上层是 CLI、REPL、slash commands 和终端 UI
- 中间是 Agent Runtime，也就是 `QueryEngine + query.ts`
- 下层是工具系统、权限系统、上下文治理、MCP、plugins、skills、voice、remote、多代理

换句话说，Claude Code 不是把模型塞进终端，而是把“一个能长期工作的 Agent”拆成了很多独立但互相配合的子系统。

这篇文章我想做一件更具体的事：**带着你从源码结构出发，一层一层看清楚 Claude Code 为什么会比很多 Agent 工具更稳、更顺、更适合真实开发工作流。**

本文基于本地分析的 Claude Code v2.1.88 还原源码仓库整理。

<!-- more -->

## 先看全局：Claude Code 到底由哪些层组成？

先不要急着进 `query.ts`。如果一上来就钻进最大文件，你很容易在细节里迷路。

更好的方式是先建立一张“脑内地图”。

![Claude Code 源码结构总览](/images/claude-code-source-deep-dive/cc-architecture-overview.svg)

这张图表达的核心很简单：

### 第一层：交互入口层

这一层最接近用户，包括：

- `main.tsx`
- REPL
- SDK 入口
- slash commands
- 基于 Ink 的终端 UI

也就是说，你看到的“命令行产品外观”，主要发生在这里。

### 第二层：Agent Runtime 层

这是 Claude Code 的中枢。

真正决定“这次对话怎么跑”“工具什么时候执行”“消息怎么回写”“错误怎么恢复”的，不在 UI，而在：

- `QueryEngine.ts`
- `query.ts`

你可以把这层理解成 Claude Code 的调度核心。

### 第三层：能力执行层

这一层是各种 tools：

- Bash
- Read / Edit / Write
- WebSearch / WebFetch
- AgentTool
- MCP 相关工具
- Worktree / Plan / Task 等

这层的重点不是工具数量，而是工具的**运行时约束**和**调度秩序**。

### 第四层：系统服务层

这是很多人平时看不到、但真正决定“为什么它更好用”的部分，包括：

- compact
- permissions
- analytics
- MCP
- plugins
- skills
- voice
- remote
- team memory

Claude Code 之所以更像“完整系统”，就是因为它不是把功能写在一个大文件里，而是把这些系统服务独立了出来。

## 入口层：为什么 Claude Code 一启动就显得更顺？

很多 Agent 工具的体验问题，并不出在模型，而是出在启动。

你会感觉它们：

- 冷启动慢
- 一开始卡
- 初始化很重
- 第一个回合的延迟明显偏大

Claude Code 的 `main.tsx` 在这件事上明显做过优化。

源码里一开始就有几个很典型的动作：

- `startMdmRawRead()`
- `startKeychainPrefetch()`
- 预取远程配置
- 预取 GrowthBook
- 预取 MCP 相关信息

它的思路不是“先把模块全加载完再说”，而是尽量把系统配置、Keychain、OAuth、远程配置这些昂贵动作提早并行出去。

这很像成熟客户端的启动管线优化，而不是普通 CLI 脚本的思路。

这类设计的价值在于：用户看到的是“它反应快”，但源码层面真正做的是把等待时间藏进初始化流程里。

## 核心中枢：为什么 `QueryEngine` 是理解 Claude Code 的第一把钥匙？

如果你想理解 Claude Code 的架构，`QueryEngine.ts` 比 `query.ts` 更适合作为第一入口。

原因很简单：

`query.ts` 很大，细节很多。
而 `QueryEngine.ts` 更像总导演，负责把整个会话生命周期串起来。

它做的事情包括：

- 持有当前会话的 `messages`
- 管理 abort controller
- 管理 read file cache
- 处理 permission denials
- 统一包装 `canUseTool`
- 调用 `processUserInput`
- 获取 system prompt parts
- 进入 `query()` 主循环
- 将结果映射回 SDK / session storage / transcript

这意味着 Claude Code 的运行方式并不是“用户输入 -> 模型回答”。

它更接近：

1. 输入进入 runtime
2. runtime 做预处理
3. runtime 进入 query loop
4. loop 中间可能触发工具、权限、压缩、恢复
5. 最后把结果回写到会话状态

这类设计有一个非常重要的好处：

**UI 不需要承担真正的业务状态。**

这就是为什么 Claude Code 不只是一个 REPL，它还能同时支持 headless / SDK / 多代理 / 远程模式。

## 关键一层：主查询循环到底在做什么？

下面这张图是理解 Claude Code 的关键。

![Claude Code 主查询循环](/images/claude-code-source-deep-dive/cc-query-loop.svg)

很多人理解 Agent，会把它想成一次 API 调用。

但 Claude Code 的核心不是单次调用，而是一个循环：

### 1. 输入进入系统

用户输入可能是：

- 普通 prompt
- slash command
- SDK 传进来的结构化消息

### 2. 预处理

这里会做几件事：

- 解析命令
- 归一化消息
- 拼装 system prompt
- 注入 user context / system context

### 3. 进入 `query.ts`

这时 Claude Code 才真正进入主代理循环。

### 4. 模型流式输出

模型可能输出：

- 普通 assistant 文本
- tool_use
- thinking / redacted_thinking
- 错误信息

### 5. 触发工具执行

如果模型输出了 `tool_use`，运行时不会简单暴力地顺序执行，而是进入工具调度层。

### 6. 结果回写

工具结果会转成 `tool_result` 回写进消息流，继续喂给模型或更新 UI。

### 7. 后台守护逻辑持续工作

这里真正厉害的是：Claude Code 在循环背后还有很多守护逻辑一直在工作，比如：

- autoCompact
- token budget
- fallback model
- stop hooks
- tool use summary
- `max_output_tokens` 恢复逻辑

这就是为什么它更像一个运行时，而不是一个 prompt 驱动的小程序。

## 工具层：Claude Code 真正强的不是工具多，而是工具怎么跑

很多 Agent 产品都能列出一串工具：

- 读文件
- 改文件
- 跑命令
- 搜索
- 联网

但 Claude Code 比很多工具更高一个层次的地方在于：

它把工具调用当成一个**调度问题**，而不只是模型能力列表。

看下面这张图。

![Claude Code 的工具编排逻辑](/images/claude-code-source-deep-dive/cc-tool-orchestration.svg)

这里最关键的概念是 `isConcurrencySafe`。

Claude Code 在编排工具时，不是默认全部串行，也不是默认全部并发，而是会先判断：

这个工具调用是不是并发安全的？

### 并发安全工具

例如某些只读查询类工具：

- 文件读取
- 搜索
- 某些 MCP 查询

这类工具可以组成并发 batch，提高执行速度。

### 非并发安全工具

例如：

- Edit
- Write
- 有副作用的 Bash

这类工具则会串行处理，避免状态冲突。

### 更进一步：StreamingToolExecutor

Claude Code 还有一个非常值得看的类：`StreamingToolExecutor`。

它解决的不是“怎么执行一个工具”，而是：

- 工具在流式输出过程中到达时怎么执行
- 哪些工具可以立刻开跑
- 某个工具失败后要不要取消兄弟任务
- 用户中断后哪些工具可以取消，哪些必须阻塞
- streaming fallback 时，未完成的工具结果怎么丢弃

这就是一个典型的 runtime 思维：

不是“能不能调工具”，而是“工具调用期间系统是否还能保持一致性和可控性”。

## 上下文管理：为什么 Claude Code 长会话更稳？

很多 Agent 最大的问题不是不会做，而是不能持续做。

一旦会话变长，就会出现几个常见症状：

- 上下文变脏
- 重复说同样的话
- 忘掉前面结论
- 工具使用越来越混乱
- 最后 prompt 太长直接崩掉

Claude Code 在这件事上投入很深。

它不是“快超了就总结一下”这么简单，而是有一整套上下文治理机制：

- 计算有效上下文窗口
- 预留 compact summary 的输出 token
- warning threshold
- error threshold
- blocking limit
- auto compact threshold
- 连续失败熔断

而且它还会和其他上下文管理模式协调，比如 reactive compact、context collapse。

这说明 Claude Code 对“上下文”这件事的看法，已经不再是 prompt 工程问题，而是运行时资源管理问题。

这也是它和很多 Agent 工具最本质的分水岭之一。

## 权限系统：Claude Code 为什么不是“要么太危险、要么太烦”？

很多 Agent 工具在权限上会落入两个极端：

### 极端一：过于自由

模型几乎可以随便跑命令、随便写文件，结果就是危险。

### 极端二：过于保守

每一步都要确认，结果就是烦。

Claude Code 的做法更成熟，它把权限拆成了多层决策系统：

- allow / deny / ask 规则
- 工具级匹配
- MCP server 级匹配
- sandbox 判断
- working directory 约束
- hooks
- classifier
- interactive / coordinator / worker 不同处理器

也就是说，权限系统不是一个弹窗组件，而是整个 runtime 里的治理系统。

这样带来的好处是：

- 简单动作可以足够顺滑
- 危险动作可以及时拦住
- 多代理和 headless 模式下也能复用同一套规则

这是很多 Agent 看起来不够“产品级”的原因：不是模型差，而是缺少这套治理框架。

## 多代理与隔离：Claude Code 已经不只是单会话 Agent

如果你只把 Claude Code 理解成“当前这个聊天窗口里的助手”，会低估它很多。

源码里 `AgentTool` 已经透露出非常强的多代理能力，包括：

- `run_in_background`
- `subagent_type`
- `team_name`
- `mode`
- `isolation: worktree | remote`
- `cwd`

而内部结果类型也已经区分出：

- `completed`
- `async_launched`
- `teammate_spawned`
- `remote_launched`

这意味着 Claude Code 不是只会“再开一个会话”。

它已经在区分：

- 同步子代理
- 后台代理
- teammate / swarm 模式
- worktree 隔离代理
- remote CCR 代理

这对真实开发场景非常重要。

因为一旦要做稍大一点的任务，单代理往往不够用。你需要的是：

- 一个代理做主流程
- 一个代理去搜索
- 一个代理去检查测试
- 一个代理在隔离环境里改代码

Claude Code 已经开始为这种工作模式搭底层。

## Git worktree：为什么这是一个特别聪明的工程选择？

很多 AI coding 工具默认就在主工作区里改。

这在 demo 阶段没问题，但在真实项目里会有两个风险：

- 污染主工作区
- 多任务冲突

Claude Code 里专门有 `EnterWorktreeTool` / `ExitWorktreeTool`。

它做的不是提醒你“建议开个分支”，而是真的：

- 检查当前是不是已经在 worktree session
- 找 canonical git root
- 为 session 创建 worktree
- 切换 cwd
- 保存 worktree 状态
- 清理相关缓存

这意味着 Claude Code 已经把“隔离执行环境”视为一等能力，而不是附属建议。

这背后其实是非常实用的产品判断：

真正想让 Agent 干更多活，就必须给它更好的隔离手段。

## 隐藏能力：哪些源码信号最值得关注？

如果你只盯着当前已经明显暴露给用户的功能，会低估 Claude Code 的路线。

源码里有几个方向很值得单独记住：

### 1. 远程定时代理

`scheduleRemoteAgents` 说明 Claude Code 已经在支持远程定时触发的 Agent。

而且这不是本地 cron，而是云端隔离环境里的远程 Claude Code session。

这意味着它的目标不只是“交互式开发助手”，而是“持续运行的软件代理”。

### 2. 语音链路

`voiceStreamSTT.ts` 直接连的是语音流式识别链路。

它支持 push-to-talk，并且能走 conversation-engine、Deepgram Nova 3 等配置。

这说明语音不是表层 UI，而是已经下沉到 runtime 了。

### 3. Team Memory Sync

这不是简单的本地缓存，而是 repo 维度、组织共享、带 delta upload 和 secret scan 的团队记忆系统。

这意味着 Claude Code 在尝试把“项目记忆”升级成组织资产。

### 4. Undercover mode

这套机制在公共仓库里会自动压制 Anthropic 内部信息泄漏，比如模型代号、内部项目名、归属标记。

这看起来像小 feature，但其实说明 Claude Code 已经深度适配真实企业内部工作流了。

## 最后回到一个问题：Claude Code 为什么会比很多 Agent 工具更顺手？

最后用一张图收束。

![Claude Code 为什么更稳：三套系统同时工作](/images/claude-code-source-deep-dive/cc-context-permission-agent.svg)

你可以把 Claude Code 的“顺手感”理解成三套系统同时工作带来的结果：

### 一套负责让它别越聊越乱

也就是上下文治理。

### 一套负责让它别越干越危险

也就是权限治理。

### 一套负责让它可以并行工作但不互相踩

也就是多代理与隔离执行。

再往外一层，还有 plugins、skills、MCP、remote agents 这些能力，负责让系统继续长大。

所以 Claude Code 的真正价值，不在于“模型会不会写代码”，而在于它已经开始解决一个更大的问题：

**如何让一个会写代码的模型，长期、稳定、可控、可扩展地工作。**

这就是为什么我越来越觉得，Claude Code 不只是一个 AI coding tool。

它更像一个 Agent Runtime 的雏形。

也是因为这个原因，它比很多 Agent 工具更好用，不是偶然。
