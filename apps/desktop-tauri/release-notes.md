# YourBuddy 0.4.11

A new read-only repository diagnostic reports retained runtime/component storage and recorded references, with hardlink-aware byte counts. Quit YourBuddy before scanning an unchanged application-data directory. The report helps investigate disk usage; it does not delete files, establish live use, or calculate reclaimable space. See the desktop guide's Component inventory section for the command and reporting limits.

新增仓库侧只读诊断，可报告保留的运行时与组件存储、已记录的引用，并在字节统计中识别硬链接。扫描前请退出 YourBuddy，且不要改动应用数据目录。报告用于排查磁盘占用，不删除文件、不证明组件正在使用，也不计算可回收空间。命令与报告限制见桌面指南的组件清单章节。

For macOS Apple Silicon. Choose Bootstrap for a smaller installer or Offline with bundled runtime components; the app updater uses the complete Offline archive. Historical-cache cleanup, shared Store/incremental delivery and recovery of the reported 13 GB remain open in #57; broader recovery acceptance remains open in #39. Windows is not released. Main CI has an unresolved Linux persistence-schema test timeout; full-repository CI is not claimed green. The release workflow retains its own type, packaging and native acceptance checks. Installed automatic upgrade, physical disk recovery and Apple notarization are not claimed.

适用于 macOS Apple Silicon。Bootstrap 安装包更小，Offline 内置运行时组件；应用更新器使用完整 Offline 归档。历史缓存清理、共享 Store/增量交付及所报告 13 GB 的回收仍由 #57 跟进；更广泛的恢复验收仍由 #39 跟进。未发布 Windows 版本。master CI 存在尚未解决的 Linux persistence-schema 测试超时，不声称整仓 CI 全绿。发布流水线保留自身的类型、打包与原生验收检查。不声称已验证已安装应用的自动升级、实测磁盘回收或 Apple 公证。

Verification archive: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.11/docs/releases/yourbuddy-v0.4.11
Evidence download: https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.11.zip (docs/releases/yourbuddy-v0.4.11/ inside; native screenshots are retained by the release workflow).
