# Agent Note：Windows Coverage 资源确定性

状态：已实现

[English](2026-09-08-windows-coverage-resource-determinism.md) | 中文

## 问题

YourBuddy 变更本身通过后，Windows Coverage Lane 暴露了两个互相独立的测试假设。Inspector 端口选择用例占用一个由操作系统分配的端口，并假设下一个整数端口可以绑定。Windows 可能保留相邻端口并返回 `EACCES`，因此即使后续仍有可用 Loopback 端口，Worker 也会停止。归档 Projection Cache Fixture 追加重写事件后，在五秒内轮询 JSON 文件；但公共 Cache Write 已经提供准确的持久化 Promise。Coverage 负载可能超过这个局部轮询期限，使最后一次观察仍读到旧的 `null` 标题。

这两个问题分别属于平台拥有的资源条件和负载敏感同步，不能以重跑同一 Workflow 作为已修复证据。CI Run 34147385017 被保留为负例：15,437 个测试通过，两个用例分别因 `EACCES` 和轮询到旧值而失败。

后续一个仅文档变更的 Pull Request 暴露了 Gate Runner 的另一处缺陷。Windows 进程表采样器假设 PID/PPID 投影一定是无环集合；重复关系或瞬时环可能反复追加同一子列表，最终由可变参数数组追加触发 `RangeError: Maximum call stack size exceeded`，使 Coverage Lane 在测试子进程之外失败。CI Run 34158590912 被保留为该问题的负例。

## 决策

当调用方提供非零起始端口时，Inspector 顺序端口选择会把 `EADDRINUSE` 和 `EACCES` 都视为当前候选不可用，并继续向上查找，直到成功绑定或耗尽端口范围。端口 `0` 仍只向操作系统申请一次分配；其他 Listen Failure 仍会失败。Package 文档分别说明端口占用与操作系统保留的候选。

归档 Projection Fixture 仍会创建真实 Session，并追加标题与 `turn/end` 事件；随后等待 `SessionProjectionCache.write(session)`，再读取一次重写文件。该用例使用 Cache Owner 的持久化信号，不再依赖调度时间。Cache Package 的专用策略 Suite 继续负责验证自动创建、`turn/end`、阈值、间隔与 Dispose 触发器。

Gate Runner 将进程表行视为一次观察，而不是保证正确的树。遍历从已访问的根 PID 开始，其余每个 PID 最多入队一次；子节点逐项追加，不再把无界列表展开到 JavaScript 调用栈。有效无环输入仍保持广度优先顺序。

## 验证

Inspector 回归保留真实占用端口的 Worker 路径，并为 `EADDRINUSE`、`EACCES`、无关网络错误与非 Error 值增加直接分类用例。聚焦的 Inspector 与 Projection Cache Suite 必须在本地通过。进程树回归覆盖重复行、回到根 PID 的环和 100,000 个直属子进程。由于 macOS 无法复现 Windows 排除端口行为或托管环境的进程表观察，新的 Commit 还必须让完整 Windows Coverage Lane 通过。

## 考虑过的替代方案

**重跑失败 Workflow。** 一次重跑成功不会消除任何一个假设，也无法解释为什么同一个 Commit 会随 Windows 端口保留状态或 Coverage 负载而变化。

**相信操作系统进程表一定是严格树。** 采样竞争与 Provider 投影不归 Runner 所有。对观察到的 PID 去重成本很低，并保留 Teardown 唯一需要的事实：哪些唯一进程可能属于该 Gate。

**增加 Projection 轮询超时。** 更大的期限仍然把时间当作完成条件，尽管公共 Cache Write 已经报告持久化完成。

**在 Windows 跳过 Inspector 用例。** 端口选择是跨平台产品行为。Windows 提供保留候选的必要负例，因此应继续留在阻断 Lane 中。

**在测试中查找并预检相邻空闲端口。** 先检查可用性、随后再绑定会与其他 Host Process 竞争，且无法为 Worker 保留候选。

## 影响

Inspector 可以跨过 Windows 排除端口范围，同时不会隐藏无关 Listen Failure。归档 Cache 迁移 Fixture 等待归属方的持久化，而不是等待时间流逝。进程采样不会再因重复、循环或超宽观察而让编排进程崩溃。发布记录必须保留失败 CI，并将最初的 Codex 清理修复与这些独立的仓库测试和 Runner 失败区分开。
