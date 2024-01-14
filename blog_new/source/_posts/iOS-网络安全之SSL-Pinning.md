---
title: iOS 网络安全之SSL Pinning
tags:
  - iOS
categories: 开发
abbrlink: ios-ssl-pinning
date: 2016-12-27 11:33:56
---

## **前言：**

Apple要求所有的 App 在2017年1月必须强制使用 ATS(Application Transport Security)，即 App 必须使用 HTTPS，而不能使用 HTTP 网络协议。这是Apple 在 app 安全领域做出的一个重大的举动，HTTP 由于使用明文进行传输，存在很大的安全隐患，网络请求容易被拦截和篡改。HTTPS 在安全性上相较于 HTTP 有很大的提升，依然存在一些问题：如 [MITT](http://www.secbox.cn/hacker/7846.html)(Man-In-The-Middle)中间人攻击和2014年 SSL 的[心脏出血漏洞](http://www.ithome.com/html/soft/80224.htm)。网络安全的问题看似离我们很远，其实就发生在我们身边，对我们的日常生活也会有很大的影响，特别是在移动互联网的浪潮下，人手一台手机的情况下，大家普遍使用支付宝和微信支付来进行支付，能够联网的智能家居产品越来越多的走入到普通家庭中，网络安全是一个需要引起重视的问题。而在网络传输过程中起到安全保障作用的，就是我们今天要讲的 SSL/TLS，当然主要是集中在 iOS 客户端。

<!-- more -->

## **0x00 - 什么是 SSL/TLS**

SSL(Secure Sockets Layer 安全套接层)及其继任者传输层安全（Transport Layer Security，TLS）是为网络通信提供安全及数据完整性的一种安全协议。TLS与SSL在传输层对网络连接进行加密。SSL为Netscape所研发，用以保障在Internet上数据传输的安全，利用数据加密(Encryption)的技术，可确保数据在网络上的传输过程中不会被截取及窃听。SSL协议位于TCP/IP协议与各种应用层协议之间，为数据通讯提供安全支持。 **— 摘自《互动百科》**

从上面的定义可以看出 SSL 是一个加密层，主要用于信息加密、验证。

SSL 主要提供下面三个服务：

1. **认证用户和服务器**，确保数据发送到正确的客户机和服务器；
2. **加密数据**以防止数据中途被窃听；
3. 维护**数据的完整性**，确保数据在传输过程中不被改变。

## **0x01 - 什么是 HTTPS**

HTTPS（Hypertext Transfer Protocol Secure 安全超文本传输协议） 是由 Netscape 开发并内置于其浏览器中，用于对数据进行压缩和解压操作，并返回网络上传送回的结果，HTTPS 实际上运用了 Netscape 的完全套接字层（SSL）作为 HTTP 应用层的子层。

## **0x02 - SSL Pinning 是什么**

当前主流的各大网站 Google、Facebook 等都使用 HTTPS 来保障数据的安全性和私密性，但是在 HTTPS 协议也存在一定的问题，其中广为人知是 MIIT（中间人工具），攻击者在客户端和服务器中进行伪装和欺骗，从而获取敏感信息。

SSL Pinning 是一个业界预防 MIIT 攻击的解决方案，其主要思想是在客户端绑定（Pin）服务器SSL 证书的核心信息，这个解决方案代价小，易于实施，因此被普遍使用。

## **0x03 - 在 iOS 中如何使用 SSL Pinning**

iOS 中的 SSL Pinning 主要有三种形式：

1. 直接使用 NSURLSession
2. 配合AFNetworking 使用
3. 配合 Alamofire 使用

NSURLSession 是 iOS 系统提供的类，AFNetworking 和 Alamofire 识别是 ObjC和 Swift 编写的第三方库，具体实施步骤，可以参考[这篇 blog](https://infinum.co/the-capsized-eight/how-to-make-your-ios-apps-more-secure-with-ssl-pinning)。

## **参考文章：**

- [SSL - 互动百科](http://www.baike.com/wiki/ssl&prd=button_doc_entry)
- [SSL - 百度百科](http://baike.baidu.com/item/ssl)
- [How to make your iOS apps more secure with SSL pinning](https://infinum.co/the-capsized-eight/how-to-make-your-ios-apps-more-secure-with-ssl-pinning)
- [iOS环境下的中间人攻击风险浅析](http://www.secbox.cn/hacker/7846.html)