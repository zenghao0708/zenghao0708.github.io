---
title: git常用手册
tags: git
categories: 开发
abbrlink: git_manual
date: 2016-11-11 16:26:14
---

Git 是每个开发童鞋必须掌握的工具，本文记录博主日常开发使用 git时，遇到的问题和常用的解决方法：

<!-- more -->

1. No submodule mapping found in .gitmodules for path 'Frameworks/XXX'
    1. 参考：http://stackoverflow.com/questions/1260748/how-do-i-remove-a-git-submodule
    2. $**git submodule**
    3. $**git rm 'Frameworks/XXX'**
2. 检查非法的branch名字
    1. A branch name can not:
- Have a path component that begins with "."
- Have a double dot ".."
- Have an ASCII control character, "~", "^", ":" or SP, anywhere
- End with a "/" - End with ".lock"
- Contain a "\" (backslash
3. 拉取其他分支代码到当前分支：Git pull rebase
    1. 当我们需要从别的分支上面拉取代码，并且希望被拉取的commit能够很好地rebase到当前分支,我们就需要用到pull rebase
    2. 示例：从develop拉取代码到当前分支：
        * 确保本地分支代码和develop都已经push到origin
        * git pull --rebase origin develop
            * 把develop分支代码拉取到当前分支，此时会发现当前分支和develop分支代码并没有rebase,还是在两条不同的线上
            * 拉取完成后会发现如下的一些提示：
                * On branch feature/music
                * Your branch and 'origin/feature/xxx' have diverged,
                * and have 9 and 6 different commits each, respectively.
                * (use "git pull" to merge the remote branch into yours)
                * nothing to commit, working directory clean
        * git push -f
            * 把本地分支和develop分支强行push到origin
            * git push 会导致错误，因为使用pull rebase操作会生成两个不同的分支（Your branch and 'origin/feature/music' have diverged）
4. Git分支管理策略
     1.推荐阅读 《[Git分支管理策略 - 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2012/07/git.html)》
5. git workflow:
        1. 只需要保留master和develop分支。
        2. 日常开发时，从develop上面开一个feature分支，完成开发后，按需merge到develop分支中，merge成功后，可以删除feature分支。
        3. 发布前，使用release分支
        4. 产品上线后，使用从master分支fork出hotfix分支，完成bug修复后，merge到master和develop分支。
6. Github pull request
    1. 《Mort | Pull Request的正确打开方式（如何在GitHub上贡献开源项目）》 -- 原文404，可以参考转载
7. Github Repo Migration:
    1. Github fork repo
    2. Github import repo
8. Git 修改commit message:
    1. git commit --amend -m "New commit message"
9. 查找commit message:
    1. git log --oneline | grep PATTERN
10. 多个github账号的管理：
   1. https://gist.github.com/jexchan/2351996
   2. 本人常年使用公司和个人的Github帐号，在正确配置github帐号后，可以用命令行进行帐号切换。
11. 清除git缓存：
    1. 有的时候会出现.gitignore文件不起作用的情况，需要清理git缓存：
    2. $ git rm --cached -r FOLDER_NAME
    3. $ git add .
    4. $ git commit -m “COMMIT_MSG"