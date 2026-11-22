# 仓库工具配置

[English](README.md) | 中文

本参考页列出仓库级测试与构建配置。包专属配置留在包内；构建顺序与编译器职责见[开发指南](../docs/development.zh.md#typescript-project-layout)。

| 目录 | 内容 |
| --- | --- |
| [vitest/](vitest/) | 默认单元测试、专用测试套件与共享 Vitest 设置。 |
| [build/](build/) | 工作区 tsdown 配置。 |

## 根目录发现入口

根目录 [vitest.config.ts](../vitest.config.ts) 与 [tsdown.config.ts](../tsdown.config.ts) 转导出此处的配置，让两个工具继续从仓库根目录自动发现配置。

根目录 TypeScript 配置保留编辑器与 tsx 入口（[tsconfig.json](../tsconfig.json)）、Node 编译器选项（[tsconfig.node.base.json](../tsconfig.node.base.json)）、包继承与源码别名（[tsconfig.base.json](../tsconfig.base.json)、[tsconfig.base.client.json](../tsconfig.base.client.json)），以及编译器与生成器项目图（[tsconfig.host.json](../tsconfig.host.json)、[tsconfig.client.json](../tsconfig.client.json)）。[pytest.ini](../pytest.ini) 保留根目录 pytest 发现入口。具名构建与测试流程使用[根包脚本](../package.json)。
