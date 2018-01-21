---
title: 最靠谱的『科学上网』方式 - VPS 搭建SSR 服务端教程
date: 2018-01-21 15:32:08
categories: 开发
tags:
- 笔记
permalink: VPS+SSR-Server
---

由于大家都知道的原因，咱们不能看youtube和老外一样刷 Facebook和 Twitter，谷歌也早于2010年退出中国地区，对于技术人员来说，谷歌是甩百度几条街的。

网上其实有不少科学上网的教程，一般推荐使用VPN 代理，然而这两年网络审查越发严格，时常有各种协议被封。现在很多人购买付费的 SS/SSR 服务来实现网络自由访问，不过这些服务的服务也会时常被封 IP，本文主要讲的是目前为止最实用、最稳定的一样方式：使用 VPS 自建 SSR 服务器。

<!-- more -->

------

需要的工具：

- **计算机基本操作能力**
- **Linode 账号/ Digital Ocean 账号**
- **一张可以支付美金的双币信用卡**

## 开通 VPS 账户

Linode 或者DigitalOcean都是美国的 VPS 服务商，可以用来作为 SSR的服务器，自由连接到全球网络，当然也有不少人使用它们来搭建网络或者个人博客，本文主要解决的网络访问的问题。

如何开通 Linode 账户可以参考下面的文章：<https://www.jianshu.com/p/0951a4afd640>

需要说明一下：

- 一般使用5美元/月的节点就可以了，推荐使用日本或者新加坡的节点。
- **不要使用国内邮件开通**，没有 gmail 邮箱的话，可以[申请一个 hotmail 邮箱](https://jingyan.baidu.com/article/75ab0bcbecd341d6874db264.html)
- VPS 的**操作系统推荐使用 Ubuntu**
- Windows 下建议使用 **Putty 来做 ssh 工具**，使用官网下载，实在不行，使用百度助手下载，**不要找那些破解资源，天知道里面是不是有病毒和木马**
- MAC 自带了 ssh命令
- 很是使用[百度经验](https://jingyan.baidu.com)还是比较靠谱的，基本的计算机操作不会的话，在这里可以找到答案的。一般的使用『如何使用XXX』来搜索。

------

## 搭建 SSR 服务器

这里有一个一键安装 SSR 服务器的脚本：<https://teddysun.com/486.html> ，里面包含了一些基本操作和常见问题

- root 账户就是在 Linode 创建的账户
- 使用SSR 的一键安装脚本：<https://shadowsocks.be/9.html>
- iOS 手机的用户，可以下载 [Detour](https://itunes.apple.com/cn/app/id1260141606?mt=8)这个 app，使用的教程：<https://github.com/iamldj/Detour>
- 使用443端口，默认端口8989容易导致姿势不对，翻不过去
- 使用 obfs 来提高可靠性



现在的各种一键安装脚本真的是懒人福音，都一个梯子总归是好的。

**最后祝好！**