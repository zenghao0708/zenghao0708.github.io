# publish/tools

这里保留的是兼容旧命令路径的 wrapper。

当前真实入口已经迁到仓库根目录 `scripts/`：

- `scripts/post-xhs.js`
- `scripts/xhs-prepare-assets.js`
- `scripts/xhs-export-to-icloud.js`

之所以保留 wrapper，是为了避免历史环境变量、旧日志里的命令模板或手工命令立即失效。

历史实验脚本已迁到：

- `scripts/archive/xhs/`
- `scripts/archive/blog/`
