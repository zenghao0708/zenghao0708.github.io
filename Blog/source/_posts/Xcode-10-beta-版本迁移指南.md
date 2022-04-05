---
title: Xcode 10 beta 版本迁移指南
categories: 开发
tags:
  - iOS
abbrlink: 630942d2
date: 2018-06-21 20:15:29
---

今天的主角就是开发者接触最多的 Xcode 10 beta，详细内容可以参考 [WWDC 18 Session](https://developer.apple.com/videos/play/wwdc2018/408/) ，同时可以看下 Xcode 10 的 [release note](https://developerbetas.com/wp-content/uploads/2018/06/Xcode_10_Beta_Release_Notes.pdf), 官方文档永远是学习新内容的第一手资料。



Xcode 10 beta 在 WWDC 18后就对[开发者开放下载](https://developer.apple.com/xcode/)了，WWDC 18的新内容不多，Apple 今年把主要精力放在 Bugfix和性能优化上面，还这几年欠下来的技术债，关于 iOS 11的诟病一直不绝入耳，不得不说，Apple 今年的决策还是比较明智的。

<!-- more -->

我们项目现在是 OC 和 Swift 混编，Xcode 版本是9.4.1，swift 4，平时用公司的 iMac Late 2013编译感觉有点吃力，用自己的 MBP 14则编译速度足够去喝杯咖啡，享受人生。



我尝试把自己的主力机（iPhone 7）升级到 iOS 12后，内心抑制不住冲动把14年的 iPhone 6也升级下 iOS 12试试，重新体会到了之前 iOS 的那种流畅，真的是老泪纵横。平时 iPhone 6只能沦为测试手机，跑跑单元测试啥的。



升级了 iOS 12后，Xcode 9已经不能进行调试了，本着生命不息，折腾不止的精神，顺带体验了一下 Xcode 10的各种新功能，总结了一下升级 Xcode 10过程中踩的坑。



- Xcode 10 beta 版本迁移指南：

  - > **指定 swift版本**：4.1，Xcode 10使用的是 swift 4.2版本，而 Xcode 9.4则使用 Swift 4.1,基本改动不大，为了兼容 Xcode 9，这里统一使用 Swift 4.1。

    - podfile设置如下:

      - ```
        config.build_settings['SWIFT_VERSION'] = '4.1'
        ```

        ​

    - xcode 项目设置：

      - **SWIFT_VERSION**为 swift 4

    - xcode command tool设置: 使用 Xcode 10

      - sudo xcode-select --switch /Applications/Xcode-beta.app

      - xcodebuild -version可以查看

        - ```
          - Xcode 10.0
          - Build version 10L176w
          ```

          ​

  - > 更新部分 pod 库：

    - RACObjcBridge/RACObjc升级到3.1.0，之前是3.0.0版本，swift 版本导致需要升级。
    - 删除 Tencent SDK pod spec 中的s.resource_bundle字段，参见 xcode 10 beta release note。多个相同的输入文件导致冲突，这个也是 xcode 10新增的功能，为了加快编译速度，对编译依赖检测得很严格。
    - 使用 Carthage 的话，则需要指定手动指定 Swift 版本：
      - carthage update --platform iOS --toolchain com.apple.dt.toolchain.Swift_4_1 --no-use-binaries REPO_NAME

  - > 更新 swift lint: disable identifier_name

    - 参见[False positive for rule identifier_name in Xcode 10 beta](https://github.com/realm/SwiftLint/issues/2231)

  - > 其他错误：

    - [Command CompileC failed with a nonzero exit code](https://github.com/mapbox/mapbox-gl-native/issues/12084)

整个升级过程中，需要注意的几点：

- 及时清理 DerivedData目录，由于整个编译过程中会产生众多的中间文件，非常容易导致编译依赖检测出错。
- 更新 carthage framework和使用 pod install 重新编译第三方库。
- New Build System: Xcode 9.4引入了 preview 版本，Xcode 10则是默认开启，开启后，编译速度确认有所提升，但是也会导致一些比较奇怪的编译问题，上面只是记录了笔者遇到的几个问题。
- 完成升级后，Xcode 9.4和 Xcode 10 beta 可以共存，笔者使用 Xcode 10 beta，其他开发同事继续使用 Xcode 9。