---
title: Xcode问题锦集
tags:
  - iOS
categories: 开发
abbrlink: 98b18fa0
date: 2017-08-12 20:59:56
---

Xcode 是 iOS开发人员的利器，偶尔也会变为“猪队友”，下面是本人在开发中积累的一些遇到的问题和解决方案。

<!-- more -->

1. **代码提示不起作用**：
   This fix from apple dev forums works for me. I have had autocomplete issues with Xcode 6.1/Yosemite.
   1. Quit Xcode.
   2. Restart the computer (this is to clear any in-memory caches).
   3. Delete the contents of the DerivedData folder (~/Library/Developer/Xcode/DerivedData), precisely run, 
      a) **cd ~/Library/Developer/Xcode/DerivedData/** 
      b) **rm -rf ***
   4. (Try this if Steps 1-3 dont really work as it rebuilds the cache later on restart which takes time) Delete the contents of folder ~/Library/Caches/com.apple.dt.Xcode, i.e., 
      a) **cd ~/Library/Caches/com.apple.dt.Xcode** 
      b) **rm -rf ***
   5. Now launch Xcode once more…
2. **Logic Testing Unavailable**：
   Logic Testing on iOS devices is not supported. You can run logic tests on the Simulator.
   [http://stackoverflow.com/questions/8454935/logic-testing-on-ios-devices-is-not-supported](http://stackoverflow.com/questions/8454935/logic-testing-on-ios-devices-is-not-supported)
   [Log](http://stackoverflow.com/questions/8454935/logic-testing-on-ios-devices-is-not-supported)
   ic test need a framework which has not installed with iOS device. Set a Host Application for Unit Test can resolve this issue: App will run first and Uint Test run.
3. **$(inherited) in xcode**:
   1. inherited值的是xcode设置项的继承关系。
   2. 每个项目都有PROJECT的设置与TARGETS设置，TARGETS一般情况下就是继承自PROJECT
4. **“Xcode 6.3: Can not verify build to install on device"**
   1. $(inherited) can be used to inherit build settings from the project level to the target level. When you define library or header search paths at the project level you can use $(inherited) in the target build settings to use these search paths in the search paths of the project targets.
5. **Verify Xcode:**
   1. spctl --assess --verbose /Applications/Xcode.app
6. **Xcode显示模拟器时，使用的是UUID，而不是系统型号**
   1. [http://stackoverflow.com/questions/26533025/xcode-using-guid-instead-of-ios-version-number-in-simulator-selection](http://stackoverflow.com/questions/26533025/xcode-using-guid-instead-of-ios-version-number-in-simulator-selection)
   2. 在Xcode->Devices里，选中重复的模拟器，右键菜单“删除”，即可。
7. **iPhone Simulator没有网络**
   1. [http://stackoverflow.com/questions/13542706/iphone-simulator-cannot-connect-to-internet](http://stackoverflow.com/questions/13542706/iphone-simulator-cannot-connect-to-internet)
   2. iOS Simulator (menu, top left) > Reset Content and Settings... fixed it for me. Note this will delete all the apps and associated data you have on the simulator.
8. **ineligible device**
   1. 当前iOS版本比xcode版本高，就会出现这种情况，如iOS 9.1 就不能在Xcode 7上面进行调试，而只能在xcode 7.1进行调试。
9. **更新xcode版本后，出现插件不兼容的问题**
   1. [fix-xcode-upgrade-plugin-invalid](http://joeshang.github.io/2015/04/10/fix-xcode-upgrade-plugin-invalid/)
   2. find ~/Library/Application\ Support/Developer/Shared/Xcode/Plug-ins -name Info.plist -maxdepth 3 | xargs -I{} defaults write {} DVTPlugInCompatibilityUUIDs -array-add `defaults read /Applications/Xcode.app/Contents/Info.plist DVTPlugInCompatibilityUUID`
10. **检查代码中的FIXME、TODO、ERROR**
   1. [http://krakendev.io/blog/generating-warnings-in-xcode](http://krakendev.io/blog/generating-warnings-in-xcode)
11. **Xcode 7.3(Swift 2.2) Release配置出现Crash：**
    1. 在Debug和Staging配置环境下的build没有问题，但是Release编译出来的build会出现crash: unrecognised selector sent to instance
    2. 尝试方法
       1. 《[iOS开发调试技巧](http://www.jianshu.com/p/06fcd298ef4c)》
    3. 解决方法：
       1. 在Swift Compiler -> Code Generation选择,使用**Fast [-O]，而不能使用Fast, Whole Module Optimization**
12. **查看所有的Simulator：**
    1. xcrun simctl list devices
13. **Xcode 注释功能不起作用：**
    1. 重启 Xcode,重启 MAC
    2. 运行：sudo usr/libexec/xpccachectl
    3. 重命名 Xcode，然后打开，恢复后，重新改名为 Xcode
14. **使用 Code Snippet**
    1. [Xcode开发技巧之code snippets(代码片段)](http://blog.csdn.net/wzzvictory/article/details/12163939)
    2. <#type#>占位符
    3. Xcode中的代码片段默认放在下面的目录中：~/Library/Developer/Xcode/UserData/CodeSnippets