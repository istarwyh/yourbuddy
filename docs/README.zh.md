# 文档地图

[English](README.md) | 中文

## 概述

请选择符合当前任务的路径。产品指南、Harness 使用、扩展教程、架构、包约定、生成参考与历史记录各有独立归属；本页只链接这些归属，不重复其内容。

## 目录

- [使用 YourBuddy](#use-yourbuddy)
- [使用 DeepSeek Harness](#use-deepseek-harness)
- [开发扩展](#develop-extensions)
- [维护仓库](#maintain-the-repository)
- [理解架构](#understand-the-architecture)
- [查阅生成参考](#look-up-generated-references)
- [文档归属](#documentation-ownership)
- [开发备注](#dev-note)

-----

<a id="use-yourbuddy"></a>
## 使用 YourBuddy

从 [YourBuddy 产品指南](user/product/index.zh.md)开始，了解安装、模型、工作区、设置、内置插件、评测与故障排查。

<a id="use-deepseek-harness"></a>
## 使用 DeepSeek Harness

从 [Web UI 指南](user/guide/index.zh.md)开始。随后可查看[提供方配置](user/guide/providers.zh.md)、[Python SDK](user/guide/python-sdk.zh.md)，或通过 [`dsh` 启动器参考](../apps/cli/README.zh.md)使用其他应用 Profile。

<a id="develop-extensions"></a>
## 开发扩展

按照[扩展基础教程](user/develop/basic/index.zh.md)完成配置和首个包，再通过[框架指南](user/develop/framework/index.zh.md)了解 Cordis 服务与事件，并使用[扩展 Cookbook](cookbook/extension-cookbook.zh.md)执行面向仓库维护者的步骤。

<a id="maintain-the-repository"></a>
## 维护仓库

通过 [development.md](development.zh.md)了解环境配置与日常流程，通过 [testing.md](testing.zh.md)选择验证证据，并遵循根 [AGENTS.md](../AGENTS.md)与子树指令中的长期实现规则。包组及其归属统一列在 [`packages/README.md`](../packages/README.zh.md)。

<a id="understand-the-architecture"></a>
## 理解架构

先阅读 [architecture.md](architecture.zh.md)了解有序运行时地图，再打开对应的[子系统参考](subsystems/README.zh.md)查阅类型与服务语义。[图谱索引](graph-atlas.zh.md)链接依赖、组合、事件、生命周期与工具流程图。

<a id="look-up-generated-references"></a>
## 查阅生成参考

生成的查询页包括[模块图](module-graph.zh.md)、[配置目录](config-catalog.zh.md)、[工具目录](tool-catalog.zh.md)、[持久化目录](persistence-catalog.zh.md)和 [Cordis API](cordis-api/context.zh.md)。每份源文件的注释都会标明所属生成器与重新生成命令。

<a id="documentation-ownership"></a>
## 文档归属

当前产品与任务指南位于 `user/`；跨包行为位于 `architecture.md` 和 `subsystems/`；每个包的配置与限制位于包 README；操作步骤位于 `cookbook/`；决策位于 Agent Notes；事故位于 `postmortem/`；发布证据位于 `releases/`。[文档标准](AGENTS.md)定义完整的放置规则。

<a id="dev-note"></a>
## 开发备注

无。
