---
title: Swift 与 OC 混编小技巧
date: 2017-01-07 22:43:35
tags:
---

Swift 与 OC交织在一起缠绵的爱情故事，在接下来的几年里将伴随着 iOS 开发人员，下面我们起来看看他们的恩怨纠葛。

<!-- more -->

**Swift 和ObjC混编：**

- **[Apple的文档](https://developer.apple.com/library/content/documentation/Swift/Conceptual/BuildingCocoaApps/index.html#//apple_ref/doc/uid/TP40014216-CH2-ID0)**

- **Swift中调用OC：**

  - 在 Swift 中调用 OC 的代码时，需要使用到 bridging header 文件来把 OC 的类暴露给 swift

  - 手动添加 bridging header 的步骤，直接把 finder 中的代码文件夹拖拽到 xcode 中:

    [图1-1]{% asset_img 1-1.jpg %}

    如上图，需要选中“**Create groups**”，这样就可以在 xcode代码浏览目录中添加一个 group

    图1-2 {% asset_img 1-2.jpg %}

    但是，这样的操作不会让 Xcode 自动为我们创建 bridging header 文件，需要手动在 Xcode 中**添加 header 文件**，这里要注意命名规范，必须是“ModuleName-Bridging-Header.h”，然后设置**编译选项**

    图1-3{% asset_img 1-3.jpg %}

    图1-4{% asset_img 1-4.jpg %}

  - **自动添加bridging header 的步骤**

    - 其实 xcode 可以自动添加桥接头文件，只是需要我们在刚开始的时候，**拖拽一个 OC 的源文件**(包含.h 和.m 文件)，而不是拖拽整个源代码的目录到 xcode 中

      图2-1{% asset_img 2-1.jpg %}

      图2-2{% asset_img 2-2.jpg %}

    - 下面是拖拽 OC 源代码后的项目浏览结构，xcode自动创建一个 ModuleName-Bridging-Header.h 的头文件，并且设置好了编译选项：

      图2-3{% asset_img 2-3.jpg %}

      图2-4{% asset_img 2-4.jpg %}

- OC中调用Swift：**

  - OC来调用 Swift 的时候，需要依赖一个 Swift **默认提供**的“ModuleName-swift.h”文件，这个文件是隐藏的，**不需要也不能够由开发者来提供**，但是可以使用\#include包含到 OC 代码中，这个 OC头文件中可以看到 swift 类、结构体、常量的定义。

    图3-1{% asset_img 3-1.jpg %}

    图3-2{% asset_img 3-2.jpg %}

  - 需要注意的是，只有**继承自 NSObject 的swift类才能被 OC 调用**，在 swift.h 文件中是看不到纯 swift类的定义。

- **Swift使用OC中的宏**

  - 可以参考[这个提问](http://stackoverflow.com/questions/24325477/how-to-use-a-objective-c-define-from-swift)
  - 有哪些问题：
    - Swift 只能使用OC 中常量的宏定义，如
      - \#define MAX_WIDTH  100
      - \#define Name_KeyPath @“Name_KeyPath”
    - 而不同使用函数调用的宏，如
      - \#define SCREEN_WIDTH  [[[UIScreen mainScreen] bounds] width]
      - \#define DBQuerySuccess YES
  - 解决方法：
    - 在 OC 文件中创建一个Constant类，使用类方法(screenWidth)来包装现有的宏定义

- **@objc 关键字的作用**

  - 当 swift 中要使用 OC 的一些特性的时候，如 runtime，@objc 关键字用来 提供这个功能。

- 源代码

  - 具体的使用，可以参见 Github上的[代码](https://github.com/zenghao0708/SwiftOCMixing)