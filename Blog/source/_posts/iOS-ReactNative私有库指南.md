---
title: iOS ReactNative私有库指南
date: 2018-10-20 22:11:52
categories:
- 开发
- ReactNative
tags: 
- iOS
- ReactNative
---

# 创建RN私有库

为了加速RN的下载和方便集成，我把RN(0.56.0)做成私有pod放到了gitlab的私有源中，参考《[使用Cocoapods创建私有podspec](http://blog.wtlucky.com/blog/2015/02/26/create-private-podspec/)》、《[私有Pods集成react-native库](https://imfong.com/post/Private-Pods-Add-react-native#yoga)》。

<!-- more -->

开始之前，需要搞清楚两个概念：

cocoapods 是通过spec repos + pod source code repo 来进行代码版本管理，cocoapods 的[master spec repo](https://github.com/CocoaPods/Specs)来管理所有的第三方库 spec，每个 spec 中都包含了对于 pod 的 source code pod。

**私有源仓库：**类似于 cocoapods 官方来管理 specs 的仓库，用来管理私有库的 spec，下文中使用`YOUR_SPECS_REPO`来指代。同时，这个 repo 也有自己的 git 地址，下文使用`YOUR_SPECS_GIT`

**私有 pod 代码仓库**：存放私有库 source code 的 repo。



下面是具体的操作步骤：

## 创建私有ReactNative repo

- 把 github 上的源码 clone 下来，然后 push 到自己的私有库 git 中
- **仓库代码是github源码**
- 修复0.56.0中WebSocket问题

## 创建&修改 podspec.json

- **切换到对应的tag commit: 如v0.56.0，下面的yoga和React需要保存version一致。**
  - 然后按照《[私有Pods集成react-native库](https://imfong.com/post/Private-Pods-Add-react-native)》中生成和修改了yoga.podspec.json、React.podspec.json，需要修改yoga.podspec.json的source_files和public_header_files

```bash
pod ipc spec React.podspec >> React.podspec.json
cd ReactCommon/yoga
pod ipc spec yoga.podspec >> yoga.podspec.json
```

- 修改yoga.podspec.json
```ruby
"git": "YOUR_RN_GIT"
"source_files": "ReactCommon/yoga/**/*.{cpp,h}",
"public_header_files": "ReactCommon/yoga/**/{Yoga,YGEnums,YGMacros}.h"
```

## lint & push podspec.json

- 需要注意的是，修改后的podspec.json文件，需要进行lint校验、上传到私有源，下面是yoga的方法
```bash
pod spec lint yoga.podspec.json --no-clean --verbose --allow-warnings
pod repo push YOUR_SPECS_REPO yoga.podspec.json --allow-warnings
```

- 通过上面的方法可以吧RN和yoga添加到私有源中，但是我们pod install的时候，还是会报错

  {% asset_img Folly-error.png %}

  - Folly在RN中被CxxBridge、jschelpers等subspecs依赖，Folly.podspec文件本身在RN源码目录third-party-podspecs中，需要把Folly.podspec也上传到私有源中，否则pod install会出现错误

  - 由于Folly在cocoapods公共源中已经没有维护，但是有志愿者维护了一个folly-ios的pod，需要我们添加到私有源中，添加方法和上面类似
``` bash
pod repo push YOUR_SPECS_REPO Folly.podspec --allow-warnings
```
- 类似的，我们也需要把React.podspec.json文件提交到私有源中：
```bash
pod spec lint React.podspec.json --no-clean --fail-fast --verbose --allow-warnings --sources=YOUR_SPECS_GIT,https://github.com/CocoaPods/Specs.git
pod repo push YOUR_SPECS_REPO React.podspec.json --verbose --allow-warnings --sources=YOUR_SPECS_GIT,https://github.com/CocoaPods/Specs.git
```
最终，我们总共需要添加了三个私有repo：**RN/Folly/yoga**

## 创建离线js bundle包

使用下面命令生成js bundle:

```bash
react-native bundle --dev true --entry-file index.ios.js --bundle-output ios/main.jsbundle --platform ios
```

通过--dev参数(true/false)控制生成debug/release包

# 如何维护RN版本

同步Github上的ReactNative源码，在sourceTree中，添加remote:
{% asset_img sourcetree.png %}

切换到当前的分支(0.57-stable)，可以从github上面拉取最新代码（使用rebase）
更新podspec.json

```bash
pod ipc spec React.podspec >> React.podspec.json
cd ReactCommon/yoga
pod ipc spec yoga.podspec >> yoga.podspec.json
```

**创建RN私有库**的中已经提供了需要修改的地方。

**lint & push podspec.json**，或者直接在私有源中进行修改。

## RN代码有bug怎么办？

从RN 0.56.0到RN 0.57.3，都没有解决websocket crash问题。

解决方法：

1. 查看github issue，寻找问题解决方法。已web socket为例，已经用人[提了PR](https://github.com/facebook/react-native/pull/19489)

2. 把PR中的源代码下载到本地，然后本地进行验证。验证通过后，则commit && push到当前tag 所在的分支

3. 由于更新了RN源码，我们需要修改私有库中tag对应的commit：
   1. 删除之前的tag（0.57.3），在最新的commit中来添加新tag（0.57.3)
   2. 在React.podspec.json中，使用branch替代tag

```
"source": {
    "git": "YOUR_RN_GIT",
    "branch": "0.57-stable"
  },
```

# 专治疑难杂症

## **RN 0.56.0 问题：**

- [**com.squareup.SocketRocket.NetworkThread(18): EXC_BAD_ACCESS**](https://github.com/facebook/react-native/issues/21086)

  - 解决的PR:<https://github.com/facebook/react-native/pull/19489>

- [**WebSocket `registerEvents` is undefined when running master**](https://github.com/facebook/react-native/issues/20567)

  - 解决方法：<https://stackoverflow.com/a/52486616>

## **RN 0.57.3 问题：**

- **Unable to resolve module `schedule/tracking`**

  {% asset_img schedule-error.png %}

# **参考资料：**

- [swift cocoapods Could not build Objective-C module 'React'](https://github.com/facebook/react-native/issues/19892)

- [含泪导入React-native 0.54到Swift原生项目](https://www.jianshu.com/p/611b49ccf351)

- [React Native 0.50.0 集成遇到的问题](https://www.jianshu.com/p/57ed76e90605)

- 《[使用Cocoapods创建私有podspec](http://blog.wtlucky.com/blog/2015/02/26/create-private-podspec/)》

- 《[私有Pods集成react-native库](https://imfong.com/post/Private-Pods-Add-react-native#yoga)》

- [What's the difference between 'pod spec lint' and 'pod lib lint'?](https://stackoverflow.com/questions/32304421/whats-the-difference-between-pod-spec-lint-and-pod-lib-lint)