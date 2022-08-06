---
title: 关于HTTP/3 的那些事
date: 2022-08-06 11:02:00
abbrlink: http3-overview
categories: 
- 开发
tags: 
- 网络编程
---



## 前言

之前的[文章](https://coolzeng.com/posts/http2-overview/)已经给大家介绍过 HTTP/2，今天我们来聊聊 HTTP/3。本文主要从如下几个角度来讲讲 HTTP/3的那些事：

- HTTP/3的由来
- HTTP/3相比 HTTP/2有哪些新特性
- HTTP/3的使用现状



<!-- more -->



## HTTP/2有什么问题？

2015年5月定稿的HTTP/2解决了HTTP 1.x中存在的一大堆缺点，其中主要包含：

- **解决了HTTP的队头拥塞**（head of line blocking）问题，客户端必须等待一个请求完成才能发送下一个请求的日子过去了。
- **使用多路复用**（multiplexing），因而它可以通过同一个TCP连接发送多个逻辑数据流。复用使得很多事情变得更快更好，它带来更好的拥塞控制、更充分的带宽利用、更长久的TCP连接。



但是HTTP/2也有自己的问题：**TCP上的队头阻塞（head of line blocking）**。如果一个序列号较低的数据段还没有接收到，即使其他序列号较高的段已经接收到，TCP的接收机滑动窗口也不会继续处理。这将导致TCP流瞬间挂起，在更糟糕的情况下，即使所有的段中有一个没有收到，也会导致关闭连接。



## HTTP/3是什么？

> HTTP3.0 = HTTP2.0 + QUIC（包含TLS）+ UDP

HTTP/3其实是**HTTP-over-QUIC**，而QUIC（Quick UDP Internet Connections）是Google 2012年实现并部署、2013年公开发布，2021 年 6 月IETF公布的[RFC9000](https://datatracker.ietf.org/doc/html/rfc9000)正式确定了标准化版本。



相比于 HTTP/2，HTTP/3主要是将**传输层的TCP改为UDP协议**，然后在应用层用QUIC协议来实现TCP的可靠性，解决TCP少量丢包导致队头阻塞（head-of-line blocking）问题&继承HTTP2.0的多路复用优点。


{% imsize %}
src: /images/http3-overview/HTTP2vsHTTP3.png
alt: HTTP2 vs HTTP3
title:  HTTP2 vs HTTP3
profile: thumbnail
link: true
linkProfile: huge
{% endimsize %}


**HTTP/2 vs HTTP/3**

<!-- ![HTTP3-Layout](HTTP3-layout.png) -->
{% asset_img HTTP3-layout.png 500  '"HTTP3-Layout" "HTTP3-Layout"' %}



## HTTP/3有哪些关键特性？

HTTP/3 的几个关键点主要包含：

- 通过提高链接利用效率减少 RTT，提高数据交互速度。
- 在第一条的基础上，囊括安全需求。
- 解决当前实际网络环境中的适配问题，需要做好协议的兼容性设计。



{% asset_img HTTP3-overview.png 500 '"HTTP3-overview" "HTTP3-overview"'%}



**减少** **RTT**

RTT是Round Trip Time的缩写，通俗地说，就是通信一来一回的时间。下面分别是 HTTP/2和 HTTP/3 建立第一次数据通信需要的 RTT 对比。



**HTTP/2：****TCP** **1.5次** **RTT** **+** **TLS** **1.5 次** **RTT** **+ HTTP 1 次** **RTT**


{% asset_img HTTP2-RTT.png 500 '"HTTP2-RTT" "HTTP2-RTT"'%}



**HTTP/3：****QUIC** **1.5 次** **RTT** **+ HTTP 1 次** **RTT**


{% asset_img HTTP3-RTT.png 500 '"HTTP3-RTT" "HTTP3-RTT"'%}


QUIC协议本身的一些关键特性如下：

| **优势**                   | **详细解释**                                                 |
| -------------------------- | ------------------------------------------------------------ |
| 显著的减少了连接建立的时间 | 使用QUIC协议也是需要三次握手的，跟TCP三次握手不一样的是它集成了TLS1.3版本的握手过程，需要1RTT。 就HTTP2.0来说，支持TLS1.3的话，也需要1RTT（TCP三次握手）+1RTT（TLS1.3）=2RTT，况且现在还是TLS1.2版本在广泛使用，现状就是 1RTT（TCP三次握手）+2RTT（TLS1.2）=3RTT |
| 没有队头阻塞的多路复用     | 这个上面有举例，就不详细说了。 对HTTP2.0，主要是因为所有的资源是通过同一个TCP连接返回的，TCP要保证接收到所有的数据包，因此，一旦有数据包丢失，丢失的数据包会阻塞后续的数据包传送给应用层，直至重新接收到这个数据包。 对QUIC，它使用UDP进行数据传输，UDP在拿到数据后给到QUIC，由QUIC组装，如果一个资源完整了，就交给QUIC的上层处理，不完整，也就是有一个资源的数据包丢失，那QUIC会要求重传这个丢失的包，因此只会影响到这个资源，不会影响到其他资源的数据包被应用层处理 |
| 连接迁移                   | WiFi切换到4G，4G切换WiFi都不需要重新建立连接，原因在于QUIC用一个connection ID来标志连接，而TCP是用client ip+client port+server ip+server port来标志的，因此当切换网络时，client ip变化了，导致TCP连接失效 |
| 天然集成TLS1.3更安全       | TLS 1.3相比于 1.2 有了更快的连接速度和更高的安全性： 引入了新的密钥协商机制（PSK），支持 0-RTT 数据传输，在建立连接时节省了往返时间； 废弃了 3DES、RC4、AES-CBC 等加密组件，废弃了 SHA1、MD5 等哈希算法； |



以下是QUIC和HTTP/3各个部分的最新官方IETF草案列表:

- HTTP/3: [Hypertext Transfer Protocol (HTTP) over QUIC](https://tools.ietf.org/html/draft-ietf-quic-http)
- 不变性：[Version-Independent Properties of QUIC](https://tools.ietf.org/html/draft-ietf-quic-invariants)
- 传输层: [QUIC: A UDP-Based Multiplexed and Secure Transport](https://tools.ietf.org/html/draft-ietf-quic-transport)
- 自动恢复: [QUIC Loss Detection and Congestion Control](https://tools.ietf.org/html/draft-ietf-quic-recovery)
- TLS: [Using Transport Layer Security (TLS) to Secure QUIC](https://tools.ietf.org/html/draft-ietf-quic-tls)
- QPACK: [QPACK: Header Compression for HTTP over QUIC](https://tools.ietf.org/html/draft-ietf-quic-qpack)



## 与HTTP/2的比较

HTTP/3面向QUIC设计，QUIC是一个自己处理数据流的传输层协议。HTTP/2面向TCP设计，因此数据流在HTTP层处理。



**相似之处**

这两个协议为客户端提供了几乎相同的功能集。

- 两者都提供数据流
- 两者都提供服务器推送
- 两者都有头部压缩
- QPACK与HPACK的设计非常类似
- 两者都通过单一连接上的数据流提供复用
- 两者都提供数据流的优先度设置



**不同之处**

两个协议的主要不同点在于细节，不同之处主要由**HTTP/3使用的****QUIC****带来：**

- 0-RTT握手： QUIC 协议中，对于先前已连接过一个服务器的客户端可能缓存来自该连接的某些参数，并在之后与该服务器建立一个无需等待握手完成就可以立即传输信息的0-RTT连接，从而减少建立新连接所必需的 时间。
- 得益于QUIC，HTTP/3的握手速度比TCP+TLS快得多。 
- HTTP/3不存在明文的不安全版本。尽管在互联网上很少见，HTTP/2还是可以不配合 HTTPS来实现和使用。 



## HTTP/3 使用现状如何?

截止到 2021 年 8 月份，据W3Tech统计目前[全球有将近21%的网址支持 HTTP/3](https://w3techs.com/technologies/details/ce-http3)访问，相比之下目前 HTTP/2约有 46%的占比。



关于HTTP/3的一些常见批评主要包含：

**UDP****永远不会通**

很多企业、运营商和组织对53端口（DNS）以外的UDP流量进行拦截或者限流，因为这些流 量近来常被滥用于攻击。特别是一些现有的UDP协议和实现易受放大攻击（ampliﬁcation attack）威胁，攻击者可以控制无辜的主机向受害者投放发送大量的流量。



QUIC内置了对放大攻击的缓解处理。它要求初始数据包不小于1200字节，并且协议中限制，服务器在未收到客户端回复的情况下，不能发送超过请求大小三倍的响应内容。



**QUIC****太吃CPU、内核处理****UDP****慢**

TCP和TLS长期以来的成熟发展、改进，以及得到硬件协助，造成UDP看上去比较慢。我们有理由期望这会随着时间得到改善。问题在于，这额外的CPU占用会对部署者带来多大的影响。



**只有Google在弄**

QUIC 最早确实是 Google提出、实施的，后续交由 IETE 进行了标准化。但是这个批评其实站不住脚，Google通过大规模的部署证明，通过UDP部署这种协议可以正常运行且表现良好，这为IETF带来了初始的规范。后面Mozilla、Fastly、Cloudﬂare、Akamai、微软、 Facebook、苹果等等很多公司的员工也参与进来，共同推进互联网的传输层协议。



**gQUIC 和 iQUIC的差异问题**

2021 年 6 月正式定稿了QUIC协议，我们有理由相信后续HTTP/3相关升级工作也会得到稳步推进。



## 结语

至此HTTP系列文章已经全部完结，从 HTTP 1.x到 HTTP/3 协议的升级过程中，我们能够看到面对复杂和不稳定的网络环境，Google 及全球各大 IT 公司的童鞋们联合在一起贡献自己的力量，为不断提高网络应用程序的性能而努力~



## 文档资料：

- [QUIC - 维基百科](https://zh.wikipedia.org/wiki/QUIC)
- [HTTP/3 - explained【简体中文】](https://http3-explained.haxx.se/zh)
- [TLS1.3 VS TLS1.2，让你明白TLS1.3的强大](https://zhuanlan.zhihu.com/p/44980381)
- [如何看待 HTTP/3 - 知乎](https://www.zhihu.com/question/302412059)
- [HTTP/3: the past, the present, and the future](https://blog.cloudflare.com/http3-the-past-present-and-future/)
