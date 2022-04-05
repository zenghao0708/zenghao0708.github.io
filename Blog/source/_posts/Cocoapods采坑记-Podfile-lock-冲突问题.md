---
title: Cocoapods采坑记 - Podfile.lock 冲突问题
categories: 开发
tags:
  - iOS
  - cocoapods
abbrlink: '33721673'
date: 2018-01-10 22:00:43
---

## **故事的开端是这样的：**

我们的项目中使用了[FBRetainCycleDetector](https://github.com/facebook/FBRetainCycleDetector)这个第三方库来检查内存泄露，在升级到某一个版本后，出现部分同事的 podfile.lock中FBRetainCycleDetector的checksum 值不一致，每次都需要运行 pod install 来更新 podfile.lock,然后git push 到仓库。其他的同事又出现 podfile.lock 冲突，需要运行 pod install 更新，然后push到 git 仓库。

<!-- more -->

喜剧上演多次后，我们采取少数服从多数的原则，让出现冲突的同事git push 的时候手动去掉 podfile.lock。

podfile.lock冲突{% asset_img podfile.lock冲突.png %}

## **Podfile.lock 不一致的原因：**

**Podfile.lock和Manifest.lock：**

- 项目中集成 cocoapods 的时候，运行 pod install 后，项目根目录中会生成Podfile.lock，而Pods目录中会有Manifest.lock。
- Xcode 编译项目的时候，会执行 Build Phases 中的[CP] Check Pods Manifest.lock 脚本，这个脚本会比对Podfile.lock和Manifest.lock，**如果两个文件不相同就会报错**。

xcode编译脚本{% asset_img xcode编译脚本.png %}

pod check失败{% asset_img "pod check失败.png" %}

**Podfile.lock是什么：**

- Podfile.lock 文件主要包含三个块：PODS、DEPENDENCIES、SPEC CHECKSUMS，用来记录每个pod的版本号、依赖的其他库和每个库对应的podspec.json文件的 checksum(SHA-1算法)。通过这些信息可以确保多人协作的时候，大家使用的是相同版本的第三方库。

在我们的项目中遇到的是 podfile.lock 中 checksum 部分的冲突，其实就是由于FBRetainCycleDetector.podspec.json文件的checksum不一致。

通过对比了有冲突的同事 mac 中生产的FBRetainCycleDetector.podspec.json文件，发现主要是repuires_arc 字段中的文件列表顺序不同。

------

在找到问题产生的原因后，就着手解决问题：

一开始怀疑是MAC的 locale 不同导致文件的排序不一致，因为之前使用翻译脚本来做文件排序的时候，也出现过类似的问题。

```shell
system("LANG=zh_CN.utf-8 sort $tmpFileOut | uniq >> $fileNameOut”);
```

但是在设置了 locale环境变量之后，问题还是没有解决。

前两天，在FBRetainCycleDetector的 issues 列表中，发现也有人遇到了[相同的问题](https://github.com/facebook/FBRetainCycleDetector/issues/52)，更加可喜的是，这个小伙子提了一个 [PR](https://github.com/facebook/FBRetainCycleDetector/pull/53/files) 修复了这个问题，其实只有一行代码：

PR 代码{% asset_img "PR 代码.png" %}

## **问题是如何解决的：**

在运行 pod install 后，生成FBRetainCycleDetector.podspec.json文件中， repuires_arc字段是需要设置-fno-objc-arc的文件列表，但是不知道某种原因，出现文件路径排序在不同电脑上不同，从而导致最后FBRetainCycleDetector.podspec.json的CHECKSUMS(SHA-1) 值不一致。

**使用 sort 方法后，解决了文件排序问题。Cheers!** 

参考资料：

- <http://guides.cocoapods.org/making/specs-and-specs-repo.html>
- <http://guides.cocoapods.org/syntax/podspec.html>
- [cocopods在更新过程中产生Podfile.lock 和 Manifest.lock: No such file or directory](https://www.jianshu.com/p/9285be04310c)