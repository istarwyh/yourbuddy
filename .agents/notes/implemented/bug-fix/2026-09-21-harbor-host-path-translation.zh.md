# Agent Note: Harbor Host 路径转换保持幂等

Status: implemented

[English](2026-09-21-harbor-host-path-translation.md) | 中文

## Problem

内置 Harbor Historical Session Adapter 会先解析逻辑容器路径，再把 Python 命令交给 Host 执行提供方。该提供方也会转换命令中的逻辑路径片段。已解析的 Trial 路径在 `.host-environment` 之下仍包含 `/opt/harbor-dsh`，所以再次转换会重复插入 Trial Host Root，导致冻结的 Session Observation 无法读取。所有 Trial 随后都会停在 Adapter，Workbench 只能报告基础设施失败而无法产生分数。

## Decision

Harbor Host 命令转换会先用无冲突占位符保护每个已映射的 Host 路径，再替换逻辑根路径，最后恢复受保护路径。因此，命令可以包含 Harbor 逻辑路径、已解析 Host 路径或两者；每个逻辑路径只转换一次。

经过审查的 Harbor 快照与 Python Adapter 继续作为[YourBuddy 产品化 AI 工作台发行](../feature/2026-08-22-yourbuddy-product-workbench.zh.md)中的同一稳定 Release 配对。内置回归会创建有效的冻结 Session Observation，通过真实 `HostEnvironment` 运行 `SessionObservationAgent`，并验证其 Digest 与 Trial Artifact。

## Alternatives considered

**只移除 SessionObservationAgent 中的路径解析。** 不采用，因为 Candidate 执行使用相同的已解析路径约定。只修复一个调用方会让 Host Provider 继续保持非幂等，并为其他命令保留相同故障模式。

**把基础设施失败视为未评分 Trial。** 不采用，因为 Adapter 没有生成 Observation Artifact。重新分类会削弱分数有效性，并隐藏损坏的执行路径。

**重写失败的 Job。** 不采用，因为 Harbor Job 与 Trial 是不可变证据。安装修正后的 Release 后，验证会创建新的 Historical Job。

## Consequences

Historical Session Observation 与 Candidate 命令可以共享 Host 路径解析器，不会产生重复 Trial Root。转换辅助函数会在现有逻辑根替换前，对配置映射执行有界保护与恢复。源码测试在不调用模型的情况下证明 Adapter 完成；仍需从已安装桌面 Runtime 创建新的打包版 Historical Job，以验证 Renderer 与 Judge 完成。
