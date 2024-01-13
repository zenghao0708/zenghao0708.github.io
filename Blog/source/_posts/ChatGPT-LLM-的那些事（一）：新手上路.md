---
title: ChatGPT & LLM 的那些事（一）：新手上路
categories: AI
tags: 'LLM, GPT'
abbrlink: c53e7c18
date: 2024-01-13 10:16:28
---



## 开场白

在当今的技术世界中，了解人工智能的最新进展对于一名移动端开发工程师至关重要。OpenAI的ChatGPT是这一领域的最新成果，它不仅代表了大模型时代的前沿，而且还体现了AI技术在日常生活中应用的无限可能性。

**最快到达十亿用户数的应用 -- ChatGPT**

> 之前是 Tiktok 用了 9 个月~

10亿用户数排名{% asset_img 10亿用户数排名.png %}

## OpenAI和ChatGPT的发展历程

1. ### OpenAI的愿景与成立

OpenAI成立于2015年，其愿景是推动人工智能技术的友好发展，以使全人类受益。它最初是作为非盈利组织成立的，但后来转型为“有限盈利”公司，旨在平衡盈利与研究目标之间的关系。

1. ### GPT系列的演进

- **GPT-1**: OpenAI首个显著的成果是GPT-1，它标志着利用大规模数据集进行深度学习的开始。这个模型虽小，但已显示出巨大潜力。
- **GPT-2**: 随后，GPT-2的发布展示了在文本生成方面的显著进步，其更大的模型和更复杂的训练数据使其成为当时最强大的语言模型之一。
- **GPT-3**: GPT-3的发布是一个历史性时刻，其**1750亿参数**量使其成为当时世界上最大的语言模型。它的出现不仅是技术上的飞跃，也为AI的未来应用开辟了新的道路。
- **ChatGPT**: 结合了GPT-3的能力和进一步的优化，ChatGPT专注于**生成更自然、连贯的对话式文本**。它的出现标志着AI在自然语言处理领域的一个重要里程碑。
- **GPT-4**: 最新一代的GPT-4在2023年推出，它不仅在模型大小上有所增长，而且在**理解复杂文本、****多模态****能力（处理文本和图像）以及更精准的信息处理方面都显示了显著进步**。GPT-4的推出进一步拓宽了AI在各种复杂任务中的应用前景，标志着AI技术向更高层次的演进。

GPT演化历程{% asset_img GPT演化历程.png %}



## 关键技术要点

1. ###  一些基础术语

#### Prompt（提示）

- 含义: Prompt是指向AI模型提供的输入文本，它起到**引导模型生成特定回答或内容**的作用。
- 示例: 在ChatGPT中，输入“写一篇关于人工智能未来的文章”是一个prompt。
- 原理: Prompt工作机制基于模型的**预训练知识**。它解读输入文本，结合学习到的语言模式和知识，生成相关回答。
- 拓展一下: 最初的AI模型依赖于特定的命令或关键词触发。随着NLP技术的进步，现代模型如GPT系列能理解更自然的语言和复杂的prompt。

用好Prompt可以让AGI 更好的帮助我们解决问题，值得花点时间深入研究下。

#### LLM（Large Language Models，大型语言模型）

- 含义: LLM指的是在**大量文本数据上训练的模型，能够处理、理解和生成人类语言**。
- 示例: GPT-3和GPT-4是典型的LLM。
- 原理: LLM通过学习大规模文本数据集，掌握语言的深层结构和复杂性。这使得它们能够**生成连贯、相关且多样的文****本**。
- 拓展一下: LLM的发展始于较小的模型，如GPT-1，随着时间的推移，模型变得越来越大，学习能力也不断增强，直至能处理极其复杂的语言任务。

LLM 是一个新事物，但也是站在已有的技术上面进行创新。而且很有可能是超出创始人预期的「上帝的礼物」。

LLM&GPT关系{% asset_img LLM&GPT关系.png %}

#### G, P, T是什么？（Generate, Predict, and Transform，生成、预测、转换）

- 含义: 这些术语描述了大型语言模型的三个基本功能：生成（Generate）文本，预测（Predict）下一个词，转换（Transform）输入数据。
- 示例: 在文本生成任务中，模型生成（Generate）连续的文本，预测（Predict）基于上下文的下一个最可能的词，转换（Transform）用户输入为有意义的输出。
- 原理: 这些功能基于**Transformer架构，该架构能够有效处理序列数据，并在不同的上下文中生成、预测和转换文本**。
- 拓展一下: 这些概念随着深度学习和NLP技术的发展而进化，尤其是随着Transformer模型的引入和完善。

GPT是一个重要的里程碑，有更好的交互形式、从而可以让大众使用进而快速传播。以此来看，鼠标、触摸屏是PC和互联网时代典型的交互形态。

#### 预训练（Pre-training）和Fine-Tuning

- 含义: 预训练是指在大规模数据集上进行的**初步模型训练，而Fine-Tuning是针对特定任务的二次训练**。
- 示例: GPT-3首先在大量文本上进行预训练，然后可以通过Fine-Tuning来执行特定的任务，比如法律咨询或医学诊断。
- 原理: 预训练使模型学会语言的基本结构和模式，Fine-Tuning则调整模型以更好地适应特定应用场景的需求。
- 拓展一下: 预训练和Fine-Tuning的概念随着深度学习的发展而出现，尤其是在大型模型如GPT系列的研究和开发过程中变得至关重要。

预训练让LLM有了更强大的能力，Fine-Tuning让LLM更好用。

#### Token（令牌）

- 含义: 在NLP中，Token是**文本分割的基本单位，通常是词或子词片段**。
- 示例: 在处理句子“Hello, world!”时，它可以被分割为Tokens：“Hello”, “,”, “world”, “!”。
- 原理: Token化是文本处理的基本步骤，使得模型能够以更细粒度理解和生成文本。
- 拓展一下: 随着NLP技术的进步，Token化方法也在不断优化，以更好地适应不同语言和文本的复杂性。

GPT-3拥有1400万字符串组成的词汇表，主要有下面三个局限性：区分大小写；数字分块不一致；有时候会附带空格

在https://platform.openai.com/tokenizer 中可以看到 "**Hello, World**"和「**你好，世界**」的 token 数量。各种 LLM 的交互上下文限制、API Cost都是token 来计数的。

**Hello, World**

tokens-gpt-helloworld1{% asset_img tokens-gpt-helloworld1.png %}
token-raw-hello{% asset_img token-raw-hello.png %}


**你好，世界**

tokens-gpt-你好{% asset_img tokens-gpt-你好.png %}
tokens-gpt-你好{% asset_img tokens-gpt-你好.png %}

###  编写高效Prompt的规则

推荐两个学习源：

- 吴恩达的 Prompt Engingerring 教程：https://github.com/GitHubDaily/ChatGPT-Prompt-Engineering-for-Developers-in-Chinese
- Learning Prompt 课程 By Jimmy Wong： https://learningprompt.wiki/zh-Hans/

大型语言模型如GPT系列在生成回答时依赖于输入的质量和准确性。清晰和具体的prompt可以提高模型生成文本的相关性和质量。

1. **明确性**: 提供明确、具体的指令或问题。明确的prompt帮助模型更准确地理解预期的输出。
2. **详细性**: 包含足够的背景信息和细节。这有助于模型生成更相关和准确的回答。
3. **上下文相关**: 保持prompt与所需任务或问题的相关性。相关的上下文信息可以指导模型生成更合适的内容。
4. **避免歧义**: 尽量使用无歧义的语言，避免引起模型的误解。
5. **适当的长度**: 不宜过长或过短。过长可能导致模型混淆，过短可能导致信息不足。

1. ###  Demos

#### emoji 工厂

要求：GPT Plus账号 + DELL·E3

Prompt：

给你几个表情关键字：

“开心”：代表现在很高兴、开心、愉悦、心情舒畅

“愤怒”：代表现在有点懊恼，有一种想要找个地方发泄不满情绪。 

我会给你一段文字描述，你给我匹配相关的表情关键字，然后画出emoji表情。 

下面是示例：文字描述「我今天中奖了，想要大吃一顿满足下」， 表情关键字：开心

效果如下：

gpt4-表情{% asset_img gpt4-表情.png %}

#### iOS 技术专家

要求：chatGPT

Prompt:

你作为一名经验丰富的iOS开发者，帮我解决一些iOS和Swift相关的技术问题。希望给出相关知识点、实践案例，最好搭配上相关代码。

我作为一名iOS开发新手，经常会遇到循环引用导致的内存泄露问题，有什么好的建议或者最佳实践呢？

demo-iOS专家-rxswift-1{% asset_img demo-iOS专家-rxswift-1.png %}
demo-iOS专家-rxswift-2{% asset_img demo-iOS专家-rxswift-2.png %}

#### 让GPT 来写Prompt（比如写一个技术调研文档😊）

要求：chatGPT(gpt4 效果更佳)

Prompt：

Web search results:

[1] "Oops, there was an error.  Please try again.If it persists, please email ops@duckduckgo.com"

URL: https://lite.duckduckgo.com/50x.html?e=3

Current date: 2023/4/9

Instructions: Using the provided web search results, write a comprehensive reply to the given query. Make sure to cite results using [[number](URL)] notation after the reference. If the provided search results refer to multiple subjects with the same name, write separate answers for each subject.

Query: I want you to become my Expert Prompt Creator. Your goal is to help me craft the best possible prompt for my needs. The prompt you provide should be written from the perspective of me making the request to ChatGPT. Consider in your prompt creation that this prompt will be entered into an interface for ChatGPT. The process is as follows: 

1. You will generate the following sections: 

Prompt:

我需要写一个技术调研文档，这个文档是关于“移动端类似Notion产品的技术方案设计”，现在有三个思路：Native实现、Webview实现、类似RN/Weex的混合开发。技术方案需要考虑到如下几个方面：竞品是如何实现的？三种实现方式的优缺点是什么？采用不同方案短期的成本和长期的收益什么？

Critique:

需要有可以量化的指标（比如开发人天数），有足够的说服力（写清楚优缺点）。

Questions:

{ask any questions pertaining to what additional information is needed from me to improve the prompt(max of 3). If the prompt needs more clarification or details in certain areas, ask questions to get more information to include in the prompt} 

2. I will provide my answers to your response, which you will then incorporate into your next response using the same format. We will continue this iterative process with me providing additional information to you and updating the prompt until the prompt is perfected.

Remember, the prompt we are creating should be written from the perspective of me making a request to ChatGPT. Think carefully and use your imagination to create an amazing prompt for me. 

Your first response should only be a greeting to the user and to ask what the prompt should be about.

Reply in 中文

效果：


目测chatGPT的效果比GPT 4好一些，能够比较完整的输出整个文档内容

**chatGPT 版本**   

完整对话：https://shareg.pt/sGNglFQ 

demo-generate-prompt-1{% asset_img demo-generate-prompt-1.png %}
demo-generate-prompt-2{% asset_img demo-generate-prompt-2.png %}

**GPT4 +Bing 版本**

完整对话：

#### Mr.-Ranedeer-AI-Tutor

一个非常强大的课程生成器，支持中文、难度选择。

github地址：https://github.com/JushBJJ/Mr.-Ranedeer-AI-Tutor

要求：GPT Plus账号

中文指南：https://zhuanlan.zhihu.com/p/642238713

效果:

demo-mr.ranedeer{% asset_img demo-mr.ranedeer.png %}

1. ###  My GPTs

一个字：牛；两个字：牛逼； 三个字：很牛逼

不用任何编程能力，使用自然语言来完成各种任务，写网站、实现视频下载能力····

#### emoji工厂- My GPT 版本

继续使用上面的「emoji  工厂」来创建自己 GPT 应用。

demo-gpt-store-表情生成器-1{% asset_img demo-gpt-store-表情生成器-1.png %}
demo-gpt-store-表情生成器-2{% asset_img demo-gpt-store-表情生成器-2.png %}


#### B站视频下载器 - My GPT 版本

全程使用中文来定义你的需求，GPT还会帮你生成Logo。

GPTs 不能直接下载视频，但是可以推荐一些相关的工具

体验地址【需要GPT Plus?】：https://chat.openai.com/g/g-ozticvPaK-bzhan-shen-qi

demo-gpt-store-B站下载器-1{% asset_img demo-gpt-store-B站下载器-1.png %}
demo-gpt-store-B站下载器-2{% asset_img demo-gpt-store-B站下载器-2.png %}

## 如何开通 Plus 账号

### chatGPT Plus 账号、OpenAI API 账号的关系

**ChatGPT 是基于 OpenAI 的 GPT-4 模型开发的一款聊天式人工智能**。它可以理解和生成自然语言，与用户进行多轮对话。ChatGPT 旨在为用户提供智能、有趣的对话体验，可用于回答问题、进行讨论等。它仍然存在一些局限性，如模型输出可能不准确或不可靠，无法实时更新知识库，以及容易产生偏见。

**ChatGPT Plus 是针对 ChatGPT 的一项增值服务，通过订阅此服务，用户可以获得更多功能和优先支持**。这个服务主要面向那些希望在使用 ChatGPT 时获得更高质量、更个性化体验的用户。ChatGPT Plus 更适合企业级应用、专业人士和教育领域等场景。

**OpenAI API 是一种开放的应用程序编程接口**，通过这个接口，开发者可以将 OpenAI 开发的人工智能技术应用到各种软件中。通过调用这个 API，开发者可以实现对话生成、摘要、翻译等自然语言处理任务。OpenAI API 被广泛应用于聊天机器人、内容生成、文本摘要和语言翻译等场景。

- 轻度使用 ChatGPT **免费版**足够。
- **ChatGPT Plus** 适合不熟悉代码，不喜欢折腾，对稳定性有强需求的用户。ChatGPT-4 更新后，性价比高了很多，推荐。
- 喜欢折腾的朋友，ChatGPT plus 也满足不了你，直接上 **OpenAI API** 吧。

分享两个小工具：

- **虚拟信用卡**：https://2chuhai.com/recommend/openai-chatgpt-pay/ ，实测很方便、支持很多美区应用；开通信用卡送3个虚拟手机号
- **科学上网**：https://s.stotik.com/dashboard/invite，已经稳定使用3 年、支持 YouTube 4k 视频； 推荐半年或者一年套餐

1. ###  找一个靠谱的梯子

推荐使用**stotik**，专业客服解决问题，稳定运行多年、多平台适配，价格合适

vpn-1{% asset_img vpn-1.png %}
vpn-2{% asset_img vpn-2.png %}

1. ###  开通虚拟信用卡

推荐使用**WildCard**（推荐码链接：https://bewildcard.com/i/HAO102） 来开通美国信用卡，然后绑定到 chatGPT 和 OpenAI 后台支付渠道。

收费：两年开卡费用大概100 RMB，充值手续费3.5%。 遇到问题有客服帮助解决，本人能够一次性绑定好信用卡。

wildcard-1{% asset_img wildcard-1.png %}
wildcard-2{% asset_img wildcard-2.png %}
wildcard-3{% asset_img wildcard-3.png %}

## 大模型时代的移动端开发者应该做什么？

正如某个大佬所说「chatGPT 就是移动时代的 iPhone4」，他们都有的特点：产品本身足够优秀、充满想象力和魔力、开启下一个十年。作为经历了互联网和移动互联网时代的十年行业老兵，下面是我我的真心想法：

1. **体验行业里面最好的产品**（强烈安利 GPT plus 账号，能够体验 GPT 4 和各种丰富的插件）,学习并使用 Prompt 的技巧和经验，提升生产力或者实现自己的创意。
2. **解决一个你自己遇到的问题，**亲自跑 OpenAI 的 API，了解一些基本的概念。
   1. 把『小宇宙』上面的播客下周到本地，然后上传到飞书妙记，然后使用 MyAI 总结文档内容
3. **Be Patient and  Keep Going**（持续跟踪3 ~5个行牛大牛，学习他们的技术文章、分享和观点，沉淀自己的技术能力、发挥想象力）

写会议纪要、建日程、汇总群聊信息、建任务、润色文案、写文档等等痛点问题，用之前的技术，很难解决。现在，大模型技术可以轻而易举地搞定这些事。**钉子早就有，现在，合适的锤子终于来了**。

### **推荐两个公众号**：

- **张无常**：真名张海庚，字节跳动产品经理。
  - **LLM****主题**: https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzIwODA3MDUwOQ==&action=getalbum&album_id=2962216275081166849&scene=173&from_msgid=2652773232&from_itemidx=1&count=3&nolastread=1#wechat_redirect
  - [Hey! 这有一座重庆大厦](https://bytedance.larkoffice.com/docs/doccnY3LlUFThQaZRc73PXSFAbg) 
  - [如何成为初代 AGI 产品经理？](https://mp.weixin.qq.com/s/tdWzDCL5EqQyIn9KfL_kBQ)
  公众号-张无常{% asset_img 公众号-张无常.png %}


- **王建硕**：百姓网创始人，知名 Blog 主。很有意思的一个技术人，可以帮助打开思路。
  - **ChatGPT 开创的时代**：https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MjM5NzI0Mjg0MA==&action=getalbum&album_id=2801018476114149380&scene=173&from_msgid=2652376733&from_itemidx=1&count=3&nolastread=1#wechat_redirect

公众号-王建硕{% asset_img 公众号-王建硕.png %}


### 学习资料：

- [AIGC交流群工具沉淀 by 乔向阳](https://bytedance.larkoffice.com/base/AIMAbnJxQaNgSGsBAtwcdAkLnvf?table=tblmZTd8VuUOOONh&view=vew0Eo17BB) : ⭐️⭐️⭐️⭐️⭐️，很全面的工具、X 账号、产品合集，找到你感兴趣的Topic 深入体验、交流，感觉吃透这里面的内容，遇到 AGI 的话题应该能做到「侃侃而谈」
- [如何成为初代 AGI 产品经理？](https://bytedance.larkoffice.com/docx/LgTSdzOREosKYRxjtATcF81kngx)  ： ⭐️⭐️⭐️⭐️，海庚从产品经理角度来解读 LLM 时代的现状和机会，产品经理是最接近用户的群体，多看看产品经理的思路有助于自己更好的解决问题。
- [GPT / GPT-2 / GPT-3 / InstructGPT 进化之路](https://zhuanlan.zhihu.com/p/609716668)
- [一个产品经理的大模型观察、反思与预测  -- 张无常](https://mp.weixin.qq.com/s/CRZlXIOkLEfTUaklfq9yCQ)
- [💳虚拟信用卡推荐Wildcard升级🤖OpenAI/ChatGPT Plus付款教程,非DePay&Dupay💥⭐ 爱出海导航💖](https://2chuhai.com/recommend/openai-chatgpt-pay/)
