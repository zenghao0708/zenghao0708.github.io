---
title: 关于HTTP/2 的那些事
tags:
  - 网络编程
abbrlink: http2-overview
date: 2022-04-08 22:07:27
categories:
- 开发
---

## 前言

作为客户端研发童鞋，HTTP 协议想必大家都算比较熟悉了，下面几个简单问题应该可以轻松回答：HTTP 的响应码有哪些？HTTP 301/302分别是做什么的？Cookie 和 Session 是做什么的？哪些请求是“幂等”？...

但是对于 HTTP/2 往往了解比较少，本文主要基于 HTTP/2协议来回答几个问题：

1. HTTP/1.x有哪些主要问题？
2. 为什么不用 HTTP/2.0的命名？
3. HTTP/2是什么？
4. HTTP/2的兼容性怎么样？
5. HTTP/2有哪些关键特性？
6. HTTP/2使用现状如何?

<!-- more -->

已经清楚答案的童鞋请出门左拐(￣.￣)(￣.￣)

## HTTP/1.x有哪些主要问题？

- **header 冗余**

HTTP/1.x 头字段通常是重复且冗长的，而且每次网络请求都需要带上一些重复的信息（e.g cookie、UserAgent等），导致不必要的网络流量以及导致初始TCP拥塞窗口被快速的填满。当在新的 TCP 连接上发出多个请求时，这可能导致过多的延迟。



- **队头阻塞（head-of-line blocking）**

HTTP/1.0 在给定的 TCP 连接上一次只允许一个请求未完成。HTTP/1.1 添加了请求流水线操作(request pipelining)，但这只是部分地解决了请求并发性，并且仍然受到**队首阻塞**的影响。因此，需要发出许多请求的 HTTP/1.0 和 HTTP/1.1 客户端使用多个连接到服务器以实现并发，从而减少延迟。

## 为什么不用 HTTP/2.0的命名？

HTTP/2 是由 [IETF](http://www.ietf.org/) 的 [HTTP 工作组](https://httpwg.github.io/)开发的，该工作组维护 HTTP 协议。它由许多 HTTP 实现、用户、网络运营商和 HTTP 专家组成。

他们认为以前的“1.0”“1.1”造成了很多的混乱和误解，让人在实际的使用中难以区分差异，所以就决定 HTTP 协议不再使用小版本号（minor version），只使用大版本号（major version），从今往后 HTTP 协议不会出现 HTTP/2.0、2.1，只会有“HTTP/2”“HTTP/3”……

这样就可以明确无误地辨别出协议版本的“跃进程度”，让协议在一段较长的时期内保持稳定，每当发布新版本的 HTTP 协议都会有本质的不同，绝不会有“零敲碎打”的小改良。

## HTTP/2是什么？

早年 Google 的童鞋为了优化 HTTP/1.1 协议，在实验室捣鼓了 SPDY协议，后面与HTTP 工作组一起合作参与了 HTTP/2的协议制定，下面是关于 HTTP/2的一些关键时间点：

- 2012 年 3 月: 征集 HTTP/2 建议

- 2012 年 11 月: 第一个 HTTP/2 草案（基于 SPDY）

- 2014 年 8 月: HTTP/2 草案 17 和 HPACK 草案 12 发布

- 2014 年 8 月: 工作组最后一次征集 HTTP/2 建议

- 2015 年 2 月: IESG 批准 HTTP/2 和 HPACK 草案

- 2015 年 5 月: RFC 7540 (HTTP/2) 和 RFC 7541 (HPACK) 发布

这里主要介绍HTTP/2的几个重点内容：scheme& 端口号、建连过程和协议格式。

- scheme&端口号

HTTP/2 使用 HTTP/1.1 使用的相同 "http" 和 "https" URI scheme，HTTP/2 共享相同的默认端口号: "http" URI 为 80，"https" URI 为 443。

- 建连过程

HTTP/2 的初始请求是通过 HTTP/1.1的请求来进行升级的，这样如果服务器不支持 HTTP/2就可以继续使用 HTTP/1.1来进行通信（这个和 WebSocket 建连过程类似）

```HTTP
GET / HTTP/1.1

Host: server.example.com

Connection: Upgrade, HTTP2-Settings

Upgrade: h2c

HTTP2-Settings: <base64url encoding of HTTP/2 SETTINGS payload>
```

如何服务器不支持 HTTP/2，则返回 HTTP/1.1的响应:

```HTTP
HTTP/1.1 200 OK
Content-Length: 243
Content-Type: text/html
...
```
如何服务器支持 HTTP/2，则通过 101(交换协议)响应接受升级:

```HTTP
HTTP/1.1 101 Switching Protocols

Connection: Upgrade

Upgrade: h2c


[ HTTP/2 connection ...
```

- 协议格式

在 HTTP/1.1 中，头信息是文本编码(ASCII编码)，数据包体可以是二进制也可以是文本。
和 HTTP/1.x最大的区别：HTTP/2 是一个彻彻底底的**二进制协议，头信息和数据包体都是二进制的，统称为“帧”**。使用二进制作为协议实现方式的好处，更加灵活。
在 HTTP/1.1 中的一个消息是由 Start Line + header + body 组成的，而 HTTP/2 中一个消息是由 **HEADER frame** + 若干个 **DATA frame** 组成的，如下图：
{% asset_img HTTP2-overview.png %}

关于 HTTP/2 不同类型帧（总共 10 种）的内容太多了，这里就不赘述了感兴趣的童鞋可以参见[《HTTP/2 中的帧定义》](https://github.com/halfrost/Halfrost-Field/blob/master/contents/Protocol/HTTP%3A2-HTTP-Frames-Definitions.md#http2-中的帧定义)

## HTTP/2的兼容性怎么样？

HTTP/2 最大限度的兼容 HTTP/1.1 原有行为：

1. 在应用层上修改，基于并充分挖掘 TCP 协议性能。
2. 客户端向服务端发送 request 请求的模型没有变化。
3. scheme 没有发生变化，没有 http2://
4. 使用 HTTP/1.X 的客户端和服务器可以无缝的通过代理方式转接到 HTTP/2 上。
5. 不识别 HTTP/2 的代理服务器可以将请求降级到 HTTP/1.X。

## HTTP/2有哪些关键特性？

- 头部压缩信息：一些重复信息（如 Cookie/UserAgent/Accept/Server等 ）在 HTTP/1.x中每次都需要传输到服务器。为了减小网络开销、提高传输效率，主要通过2个手段进行优化：

  - 头信息专门的“**HPACK**”算法压缩后再发送

- 客户端和服务器同时维护一张头信息表，所有字段都会存入这个表，生成一个索引号，以后就不发送同样字段了，只发送索引号，这样就提高速度了

- 基于二进制流的“帧”：在 HTTP/2 中定义了 10 种不同类型的帧

  - 消息是由 HEADER frame + 若干个 DATA frame 组成

- 多路复用：解决了原来的序列和阻塞机制

  - **乱序请求**：HTTP/2 把每个 request 和 response 的数据包称为一个数据流(stream)，每个数据流都有自己全局唯一的编号。每个数据包在传输过程中都需要标记它属于哪个数据流 ID，客户端发出的数据流，ID 一律为奇数，服务器发出的，ID 为偶数。

- **优先级排序**：可以对请求进行优先级排序，使更多重要请求更快地完成，从而进一步提高性能。

- **请求可取消**：数据流在发送中的任意时刻，客户端和服务器都可以发送信号(RST_STREAM 帧)，取消这个数据流。HTTP/1.1 中想要取消数据流的唯一方法，就是关闭 TCP 连接。而 HTTP/2 可以取消某一次请求，同时保证 TCP 连接还打开着，可以被其他请求使用。

- **服务端主动推送**：允许服务器推测性地将数据发送到需要这些数据的客户端，通过牺牲一些网络流量来抵消潜在的延迟。服务器通过合成请求来完成此操作，并将其作为 PUSH_PROMISE 帧发送。然后，服务器能够在单独的流上发送对合成请求的响应。



## HTTP/2 使用现状如何?

在浏览器中，Edge，Safari，Firefox 和 Chrome 的最新版本都支持 HTTP/2。其他基于 Blink 的浏览器也将支持 HTTP/2（例如 Opera 和 Yandex Browser）。有关更多详细信息，请参见[这里](http://caniuse.com/#feat=http2)。

还有几种可用的服务器（包括 [Akamai](https://http2.akamai.com/)，[Google](https://google.com/) 和 [Twitter](https://twitter.com/) 的主要站点提供的 beta 支持），以及许多可以部署和测试的开源实现。


## HTTP/3是什么?

请听下回分解Y(^o^)Y

## 结语

HTTP 协议作是大家日常开发接触最多的网络协议，其不同版本的改进和背后的设计思路值得仔细品读~~

## 文档资料
- [《HTTP/2基础教程》中文版](https://item.jd.com/25496261693.html)
- [HTTP/2 简介](https://developers.google.com/web/fundamentals/performance/http2?hl=zh-cn) - [Web Fundamentals](https://developers.google.com/web/fundamentals?hl=zh-cn) 
- [《HTTP 协议》](https://blog.poetries.top/http-protocol/notes/advance/26-HTTP2特性概览.html) 
- [[译\] HTTP/2 常见问题解答 - 掘金](https://juejin.cn/post/6844903774339727374)
- [《HTTP/2 中的帧定义》](https://github.com/halfrost/Halfrost-Field/blob/master/contents/Protocol/HTTP%3A2-HTTP-Frames-Definitions.md#http2-中的帧定义)
