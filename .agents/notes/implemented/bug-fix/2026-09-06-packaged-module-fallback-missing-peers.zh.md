# Agent Note: 从打包模块后备机制中省略不可用的 peer manifest

Status: implemented

[English](2026-09-06-packaged-module-fallback-missing-peers.md) | 中文

## Problem

pkg 可执行文件可能在 `/snapshot/node_modules` 下暴露某个依赖候选路径，但并未把该可选 peer 的 `package.json` 字节纳入可执行文件。Profile 后备遍历把可见候选路径当成可读路径，启动因此以 `ENOENT` 失败。发布形态的 Python Runtime 制品在提供 profile 服务前就会退出。

## Decision

依赖遍历会先读取每个已解析候选的 manifest，再把该包记入后备版本。可选读取遇到 `ENOENT` 表示该 peer 不可用，遍历继续。安装根与显式 bundle anchor 仍为必需项，错误或不可读的 manifest 仍会让启动失败。

## Verification

- 聚焦的 app-boot profile 测试覆盖普通后备解析与错误包元数据的失败行为。
- 发布形态 Python Runtime smoke 会执行打包二进制，并确认已暴露但未嵌入的可选 peer 不再阻止启动。

## Alternatives considered

**捕获全部 manifest 错误。** 拒绝，因为错误元数据与权限故障必须继续可见。

**从遍历中移除 peer dependency。** 拒绝，因为已安装的 Service Definition peer 必须继续对外部插件可见。

## Consequences

打包 runtime 只会省略候选 manifest 字节缺失的依赖。可用 peer 继续按最近优先规则遍历，已安装但无效的 manifest 仍会阻止启动。
