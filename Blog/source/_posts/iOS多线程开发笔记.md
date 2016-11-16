---
title: iOS多线程开发笔记
date: 2016-11-15 21:51:37
tags: 
 - iOS
 - 多线程
---

[TOC]

## GCD、NSOperation和多线程编程推荐阅读

**五星：**

1. [iOS 并发编程之 Operation Queues](http://blog.leichunfeng.com/blog/2015/07/29/ios-concurrency-programming-operation-queues/)
2. [GCD 深入理解：第一部分](https://github.com/nixzhu/dev-blog/blob/master/2014-04-19-grand-central-dispatch-in-depth-part-1.md#gcd-%E6%B7%B1%E5%85%A5%E7%90%86%E8%A7%A3%E7%AC%AC%E4%B8%80%E9%83%A8%E5%88%86)
3. [iOS并发编程对比总结,NSThread,NSOperation,GCD - iOS](http://blog.csdn.net/zyq522376829/article/details/52373154) 

**四星：**

1. [NSOperation in NShipster](http://nshipster.cn/nsoperation/) 
2. [深入浅出 Cocoa 多线程编程之 block 与 dispatch quene](http://www.cppblog.com/kesalin/archive/2011/08/26/154411.aspx)
3. [GCD使用经验与技巧浅谈](http://tutuge.me/2015/04/03/something-about-gcd/)

## 多线程编程概念

### 基本概念、术语：

1. 进程（Precess）：进程是操作系统管理和分配资源的最小单位，每个进程都有自己的内存空间、系统资源，至少有一个主线程和多个辅助线程。在iOS中，每个App运行的时候，都有对应的进程。
2. 线程（Thread）：线程则是操作系统具体的执行单元，代码的执行是在线程来完成的。在iOS中，线程的底层实现是基于POSIX thread API的，也就是我们常说的pthread。
3. 任务（Task）：任务是我们抽象出来的需要执行的工作，一般指代一段代码。
4. 同步 vs 异步
   1. 同步是指函数的调用会阻塞当前的线程，必须等待函数返回才能继续执行接下来的代码。
   2. 异步函数的调用则不会阻塞当前线程，函数调用之后立刻返回，一般通过回调函数来处理函数的执行结果。
   3. 异步函数能够有效的完成一些耗时的任务，而不必影响代码的执行流，能够提高代码的处理效率。
5. 串行 vs 并发
   1. 串行指的是在同一个时间只能有一个任务在执行。
   2. 并发指的是在同一个时间可以有多个任务一起执行。
   3. 并发一般用于多核编程，通过高效的利用多核的优势，把不同的任务分配到各个执行单元来提高效率。
6. Dispatch Queue vs Operation Queue
   1. GCD和NSOperation/NSOperationQueue是iOS上面来处理多线程开发的工具，对应的概念分别是Dispatch Queue和Operation Queue。

### iOS并发编程模型

1. 在其他的操作系统中，我们往往需要手动创建线程、管理线程的生命周期，在不需要的时候负责销毁线程和线程使用的资源，更加痛苦的是需要使用线程锁、信号量、代码临界区等手段完成线程的同步工作，这些操作往往容易出错而且繁杂。
2. iOS通过抽象出队列的概念，让开发者更加关注于任务的安排和调度，而从线程的管理工作中解脱出来。在很多时候，iOS把一些繁杂且容易出错的工作（ARC代替MRC）抽离到底层中，能够让开发者把注意力更多地放到真正的任务上，这也是iOS能够吸引广大开发者的原因之一吧。

## NSThread vs GCD vs NSOperation，它们到底是什么？ 

### 三种解决方案

1. NSThread：一个封装pthread API的线程对象，需要进行线程创建、销毁和处理线程同步，是最接近系统底层的解决方案。
2. GCD：苹果基于C语言开发的，一个用于多核编程的解决方案，是一个轻量级的、以FIFO的顺序来执行并发任务的库。
3. NSOperation：建立在GCD的基础上，面向对象的解决方案，比GCD更加灵活，也更加强大。

#### 它们具体是什么？

1. NSThread: Cocoa对于pthread API的封装，提供了一套面向对象的接口，需要开发者自行管理线程的生命周期、处理线程同步。大多是的时候，我们是不需要直接使用这些底层的对象，而是使用GCD或者NSOperation等更加高级的接口。
2. 关于Operation对象
   1. NSOperation对象本身是一个抽象类，不能直接使用。要么使用系统预定义的两个子类NSInvocationOperation和NSBlockOperation或者定义它的子类。
   2. NSInvocationOperation:可以使用**object**和**selector**来创建一个NSInvocationOperation，非常的方便和灵活。当代码中已经有相关的处理逻辑方法时，建议直接使用NSInvocationOperation来进行替代。
   3. NSBlockOperation：可以使用NSBlockOperation来并发的执行一个或者多个block，只有当所有的block都执行完毕，NSBlockOperation才算执行完成，有点像dispatch_group的概念。
   4. 所有的Operation都有下面的特性：
      1. 支持在 operation 之间建立依赖关系，只有当一个 operation 所依赖的所有 operation 都执行完成时，这个 operation 才能开始执行；
      2. 支持一个可选的 completion block ，这个 block 将会在 operation 的主任务执行完成时被调用，在任务被取消的时候也会执行；
      3. 支持通过 KVO 来观察 operation 执行状态的变化，Operation正是通过KVO通知来实现依赖运行，所以我们需要在自定义的子类中的处理好KVO的属性；
      4. 支持设置执行的优先级，从而影响 operation 之间的相对执行顺序；
      5. 支持取消操作，可以允许我们停止正在执行的 operation 。
3. GCD队列：
   1. 以FIFO顺序执行任务的队列调度系统，先入队列的任务一定先执行。
   2. 两种类型的队列：
      1. 串行队列（Serial Queue）:同一时间内只能有一个任务正在被执行。
      2. 并发队列（Concurrent Queue）:同一时间内可以有多个任务同时被执行。
      3. iOS默认提供5个队列：
         1. 主队列（Main Queue）：应用程序主线程应用的队列，用于更新UI，属于串行队列。
         2. 四个全局队列：
            1. 按照队列优先级排序，分别是：High、Default、Low、Background。
            2. 这四个全局队列是由系统提供的，在所有的App中共享，当然也包含了Apple的应用。
         3. 并发队列中任务的执行顺序：
            1. 由于队列的并发数是有系统根据当前的资源动态管理的，我们不知道也不能够设置队列中任务执行的时机和所需时长。
            2. 只有当位于队列前面的任务执行完毕、出队列后，才会执行后面的任务，但是当前并发执行的任务数量我们不得而知。
   3. 自定义队列：
      1. 我们可以自定义串行或者并发队列来完成任务的执行和调度。



### 各自的优势和劣势

1. 优势：
   1. NSThread：
      1. 能够执行实时任务。其他两者都是由系统管理的队列，不能保证实时性。
   2. GCD：
      1. 可以非常简洁的完成简单异步任务的调用，如在主线程更新UI，延迟执行。
      2. 只需要把任务分发到队列之后，不需要管理任务的调度情况。
   3. NSOperation：
      1. 给任务添加依赖
      2. 取消或者暂停一个正在执行的任务
      3. 有一个可选的completionBlock
      4. 可以通过KVO来查看任务的执行情况
      5. 可以给任务设置优先级，从而影响任务的执行顺序
2. 短板：
   1. NSThread：需要进行线程的创建、销毁，以及处理线程同步的问题，过于繁杂，而且容易出错。
   2. GCD:
      1. 对于任务的管理不够：如不能取消任务、设置依赖和优先级等。
   3. NSOperation:
      1. 相比于GCD，会增加系统的额外开销。

## 多线程代码中，需要注意哪些问题？

1. 有了GCD来调度block，我们为什么还需要NSBlockOperation?
   1. 现有代码已经在使用OperationQueue，而我们不想使用Dispatch Queue的时候，NSBlockOperation提供了一个面向对象的封装。
   2. 当我们需要dispatch queue不能提供的功能时，如KVO观察Operation状态变化、设置operation之间依赖等。
2. NSInvocationOperation的灵活性是什么意思？
   1. 我们可以通过上下文来改变selector和object对象。
3. 如何定义一个非并发的operation？
   1. 对于非并发的operation，我们只需要实现main方法和能够正常响应取消事件。
   2. 其他复杂的工作如KVO通知、依赖设置等工作NSOperation类的start方法已经帮我们提供了默认实现。
   3. 简单实现：
      1. 提供一个自定义的初始化方法
      2. 重写main方法
4. 如何实现一个并发的operation？
   1. 一般我们不需要实现并发的operation，当operation和operation queue一起使用的时候，Operation Queue会为非并发的operation创建单独的线程。
   2. 默认情况下，operation是同步执行的，也就是我们直接使用start方法的时候，它是在调用者的线程中执行的。
   3. Operation的isConcurrent属性表明一个operation是否支持并发。
   4. 配置并发的Operation：只有当我们需要手动执行operation，并且希望支持并发执行，需要重写下面的方法。
      1. start：必须，配置任务执行的线程和其他资源，但是一定**不能调用父类的实现**。
      2. main：可选，一般用来执行具体的任务，而start方法更多是用来配置初始环境，当然也可以用来执行具体的任务。
      3. isExecuting和isFinished：必须，并发的Operation需要自己来配置环境，同时还需要向外界来传递状态的变化，而isExecuting和isFinished这两个状态的变化需要使用KVO来通知外部。
      4. isConcurrent：必须，用来标识一个Operation是否支持并发。
5. 如何完成自定义operation的cancel操作？
   1. 在下面这几个关键点的检查isCancelled属性
      1. 在真正开始执行operaiton之前
      2. 至少在一次循环之中需要检查一次，如果单次循环耗时较长，则需要更加频繁的检查
      3. 在任何相对比较容易终止Operation的地方
   2. 需要注意的是虽然Operation支持取消操作，但是并不是立刻就可以被终止的，而是在下一个isCancelled的检查点。
   3. 在我们自定义Operation子类的时候，即使operation是被cancel了，我们仍然需要设置isFinished方法为true，因为在设置operation依赖的时候，它们的operation就是通过KVO来观察isFinished方法来判断时候可以执行的，如果在cancel的时候，没有设置isFinished方法，那么其他的operation将永远不会执行。
6. 如何定制Operation对象的执行行为：
   1. 在Operation添加到Operation Queue之前，我们可以配置Operation的一些行为。
   2. 配置依赖关系
      1. 依赖关系是在Operation之间的，与是否在同一个Operation Queue没有关系，也就是说，我们在位于不同的Operation Queue中的Operation之间设置依赖。
      2. 注意不要产生依赖循环。
      3. 在把operation添加到Operation Queue之前就需要配置好依赖，在添加后设置的依赖可能无效。
   3. 修改operation在队列中的优先级
      1. Operation在队列中的执行顺序取决于isReady状态和队列优先级。
      2. isReady受它所依赖的operation状态的影响，只有当依赖的所有operation都变为isFinished的时候，isReady状态才为true。
      3. queuePriority只能作用与相同队列中的operation，并且队列优先级只有当isReady为true的时候，才会决定operation的执行顺序。
      4. isReady为FALSE的时候，isReady为true的低队列优先级的operation也会先执行。
7. 一个串行的 operation queue 与一个串行的 dispatch queue是一样的么？
   1. 两者都是在同一时间内只能有一个任务被执行，但是在任务的执行顺序上是不同的：
      1. dispatch queue 的执行顺序一直是 FIFO 的
      2. operation queue中的operation执行的顺序取决于isReady和queuePriority状态。
8. 如何用GCD实现一个线程安全的单例？
   1. ObjC
   2. Swift