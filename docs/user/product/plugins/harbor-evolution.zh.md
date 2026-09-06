# Harbor Evolution

[English](harbor-evolution.md) | 中文

随应用集成的快照版本：`0.9.2`。来源：[istarwyh/harbor-self-evolving](https://github.com/istarwyh/harbor-self-evolving)。

## 解决的问题

面对不稳定的 Agent 结果，用户可以从已完成会话寻找问题，也可以用固定任务比较一次受控修改前后的表现。

## 使用方式

没有数据集时，打开 Harbor 标签页，选择 `Evaluate recent Sessions`。先检查近期已完成业务会话的预览、评测器与 Judge，以及预计模型请求数，确认后启动后台诊断并打开完成的 Job。`evolve-agent-with-harbor` Skill 提供对话入口；已有明确任务时，说明评测集、生成器、评测器及标准、优化器四项信息。

## 默认集成的理由

它使“按你的方式工作”可以延伸为“根据你的任务判断什么有效”。用户可以从实际失败逐步形成回归样例，而非只凭单次演示判断模型或提示词好坏。

## 配套内容

桌面同时携带 Harbor Skill、配套的 `harbor-dsh-evolution` Python Adapter 和托管 Python 运行时，普通桌面用户不应再照搬独立插件 README 的 `npx ... setup` 安装流程。Candidate 任务所需的 Docker 环境、模型服务和网络仍需准备，并由 Doctor 检查。

## 限制

历史会话诊断观察已有记录，不重新运行 Candidate，不能作为晋级比较基线；缺少证据时允许不评分。单 Query 快速诊断主要检查执行链路，其草拟标准不等于已执行的质量评测。正式比较要求固定任务、模型与评测身份；评测器可靠性还需要独立的 Ground Truth 元评测。插件不会自动部署 Candidate 或替换生产 Agent。评测可能产生额外模型请求、容器运行与磁盘开销。

## 凭据说明

评测中的 Candidate 可通过 Job 级临时能力调用已冻结的 Host 模型；可复用的 Codex OAuth 或上游 API 密钥不会复制进 Candidate。这不表示模型请求不经过网络。

<a id="development-example"></a>
## 开发案例：从专业需求到插件

Harbor Self Evolving 是 Y8 维护者本人深度开发、独立维护的项目。它解决的需求是把任务诊断与受控评测放进日常工作台，而不是让每个用户手动拼接评测命令和报告。

| 组成 | 负责的工作 | 用户检查的位置 |
|---|---|---|
| DSH 插件 | 注册评测相关能力与工作台视图 | 结果、证据和比较报告 |
| 配套 Skill | 指导任务选择、必要信息收集与评测操作 | 对话中的任务说明和确认步骤 |
| Python Adapter | 连接评测执行环境与 DSH Candidate | 运行诊断、任务输出和失败记录 |

开发自己的扩展时，可以借鉴这种职责划分：说明负责引导，插件负责运行时操作与界面，外部程序承担必要的专门执行。普通小插件无需 Python 或容器。先从[第一个插件](../../develop/basic/index.zh.md)入手，再通过项目顶部的源码链接阅读 Harbor 的完整实现；本页维护使用说明，不复制其开发 API。
