# Agent Note: 移除 YourBuddy 插件构建的重复审批

Status: implemented

[English](2026-09-16-yourbuddy-plugin-build-approval.md) | 中文

## Problem

用户确认安装或执行复制得到的 `dsh plugin add` 命令后，YourBuddy 会把可选插件安装进隔离的 Web Profile。新依赖包含生命周期脚本而 Profile 没有对应构建许可时，pnpm 11 会中止首次安装。失败命令已经写入依赖，因此用户还必须执行 `pnpm approve-builds` 并重复原命令，DSH 才能把 Bundle 加入 Profile。

## Decision

仓库 workspace 与 YourBuddy 隔离的 `web` Profile 持有 `dangerouslyAllowAllBuilds: true`。安装仓库声明的依赖或显式安装插件已经授权其生命周期脚本，因此 pnpm 不会再要求二次审批。通用 DSH Profile 保留各自独立的构建策略。

原生启动会在 Host 启动前创建缺失的 Web Profile workspace 设置。对于已有 Profile，它保留其他全部 pnpm 设置以及显式 `allowBuilds` 条目，同时增加或启用产品持有的配置项。启动过程修改配置项且 Profile Manifest 已存在时，即使所有依赖目录都能够解析，Profile Repair 也会执行一次安装；这会完成先前 pnpm 错误留下的生命周期脚本，并让标准 DSH 调和过程把已安装 Bundle 加入 Profile。

## Alternatives considered

**保留手动执行 `pnpm approve-builds` 的恢复步骤。** 不采用，因为它重复用户已经做出的插件安装决定，暴露 Package Manager 实现细节，并把产品的一条命令变成失败恢复流程。

**只允许当前已知的依赖脚本。** 不采用，因为可选插件目录本来就是开放的；插件增加另一项生命周期脚本依赖时，静态产品白名单会重新造成相同的首次安装失败。

**修改通用 DSH Profile 模板。** 不采用，因为其他 DSH 发行版保留自己的 Package 安装策略，不继承仓库或 YourBuddy 产品的决策。

## Consequences

仓库依赖安装、推荐插件命令与 Marketplace 安装都会执行生命周期脚本，无需单独审批。应用升级会修复曾被审批错误中断的 YourBuddy Profile，并在 Host 启动前完成待处理安装。依赖生命周期脚本以所安装 Package 相同的用户权限运行；用户和贡献者仍然负责选择依赖，安装后的社区代码仍拥有完整 Host 权限。聚焦 Rust 测试覆盖缺失、已有、停用和已启用的 Profile 策略；pnpm 11 安装探针还验证生成的 workspace 能够运行先前被阻止的 `protobufjs` 脚本，不再产生 ignored-build 错误。
