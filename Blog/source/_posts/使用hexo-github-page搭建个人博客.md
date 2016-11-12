---
title: 使用hexo+github page搭建个人博客
date: 2016-11-12 14:36:16
tags:
---

我的这个博客就是使用hexo+github搭建起来的，这篇文章记录了相关步骤和一些需要注意的地方。

首先简单介绍下github page和hexo：

- Github Page: 使用github repo的静态网页工具，可以无缝地与github一起使用，每个github帐号都有400M的免费空间来存放博客文件，具体的使用说明可以参看[github page网站](https://pages.github.com/)
- hexo:一个node.js的框架，使用npm进行安装和配置，能够快速的搭建静态博客。主要特点是搭建快速、支持markdown编辑、一键部署、本地预览。
- 使用github page+hexo主要是考虑到能够快速搭建、维护方便、技术栈匹配。



下面来说具体的搭建步骤，这里使用**MAC的开发环境**：

- 配置github repo：
  - 新建一个username.github.io的仓库，注意一定要使用自己的**github用户名**
  - 设置ssh key：参见[github ssh教程](https://help.github.com/articles/generating-an-ssh-key/)
  - 这里需要说明的是：github page默认使用的是**master分支**，在master分支中的**index.html**文件会被解析并且作为网页的入口。


- 安装Hexo命令行工具hexo-cli
  - 参考[官方教程](https://hexo.io/docs/index.html)
  - 安装git、Node.js等工具
  - 安装hexo-cli命令行工具：npm install -g hexo-cli
    - hexo-cli是hexo的命令行工具，用于执行hexo init
  - Setup Hexo:
    - 命令行为：hexo init <folder>
    - 使用hexo的模板生成项目，下面几个文件比较重要：
      - package.json: Node js用于指定依赖包的配置文件，在不清楚的情况下，不要随意修改。
      - _config.yml: hexo的配置文件，可以设置网站title、主题、字体、制定域名等。
      - source: Blog的源文件目录，使用hexo new生成的md文件存放在这个目录中。
      - scaffolds：模板文件，hexo new使用它来生成新的模板md。
      - themes：主题目录，设置网站版式。
- 写Blog：
  - hexo new post_title：生成新的模板文件。
  - 注意：这里使用hexo命令和上面的hexo init不是同一个命令，这个hexo是在setup过程中下载的npm包，**需要在Blog这个目录中使用才有效。**
  - 生成的文件在source/_post目录中，使用markdown编辑器来写博客。
- 本机调试：
  - 在写blog的过程中，可以直接在本机进行预览：hexo serve
  - 默认使用4000端口，还可以[设置其他的端口](https://hexo.io/docs/server.html#Custom-IP)
- 生成Blog文件：
  - 生成编译后的blog：hexo generate
  - 生成后的文件存放在public目录中
  - 也可以使用下面的命令直接完成发布: hexo generate —deploy
- 发布blog：
  - 使用hexo deploy完成发布
  - 第一次发布之前，需要修改_config.yml文件，参见：[hexo deploy](https://hexo.io/docs/deployment.html#Git)
- 最后要说下Troubleshooting和需要注意的地方:
  - hexo new不起作用
    - 我们需要另外开一个branch来进行blog的写作（如source分支），然后使用hexo deploy到master分支上面。在不同的分支进行切换的时候，由于.gitignore文件不一样，导致我们可能在master分支上面删除了一些source分支上面重要的文件，如node_modules目录，则需要我们在切换到source分支的时候，重新下载npm包：npm i
  - hexo deploy失败
    - 需要安装hexo-deployer-git包，参考 [hexo deploy](https://hexo.io/docs/deployment.html#Git)
  - master分支的使用方法
    - master分支上面**不要放文件**，这个分支在使用hexo deploy之后自动更新，所以会覆盖我们自己的文件。
  - 使用source分支来进行写作
    - 上面提高了不能使用master分支，那么就需要我们使用别的分支来进行hexo的搭建和写作，我个人使用source分支，当然你也可以取一个自己喜欢的名字。