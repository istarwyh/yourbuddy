# YourBuddy 0.4.2

Fixes a Better Sidebar startup crash introduced in 0.4.1. The no-Session workbench now calls the bundled `clsx` function correctly instead of a nonexistent named export, and a release-snapshot regression test protects the exact Bundle shipped by the desktop package.

修复 0.4.1 引入的 Better Sidebar 启动崩溃。无 Session 工作台现在会正确调用 Bundle 内的 `clsx` 函数，而非不存在的具名导出；新增 Release 快照回归测试会直接保护桌面包实际发布的 Bundle。

Verification archive: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.2/docs/releases/yourbuddy-v0.4.2
