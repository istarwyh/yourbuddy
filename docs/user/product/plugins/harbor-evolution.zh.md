# Harbor Evolution

[English](harbor-evolution.md) | 中文

随应用集成的快照版本：`0.8.1`。来源：[istarwyh/harbor-self-evolving](https://github.com/istarwyh/harbor-self-evolving)。

## 解决的问题

面对不稳定的 Agent 结果，用户可以从已完成会话寻找问题，也可以用固定任务比较一次受控修改前后的表现。

## 使用方式

从对话调用 `evolve-agent-with-harbor` Skill。没有提供数据集时，先预览当前工作目录中近期已完成会话，确认后再评测；已有明确任务时，说明评测集、生成器、评测器及标准、优化器四项信息。工作台用于查看结果、证据、覆盖率和比较信息，运行评测通过显式的 Agent／Skill 流程发起。

## 默认集成的理由

它使“按你的方式工作”可以延伸为“根据你的任务判断什么有效”。用户可以从实际失败逐步形成回归样例，而非只凭单次演示判断模型或提示词好坏。

## 配套内容

桌面同时携带 Harbor Skill、配套的 `harbor-dsh-evolution` Python Adapter 和托管 Python 运行时，普通桌面用户不应再照搬独立插件 README 的 `npx ... setup` 安装流程。Candidate 任务所需的 Docker 环境、模型服务和网络仍需准备，并由 Doctor 检查。

## 限制

历史会话诊断观察已有记录，不重新运行 Candidate，不能作为晋级比较基线；缺少证据时允许不评分。单 Query 快速诊断主要检查执行链路，其草拟标准不等于已执行的质量评测。正式比较要求固定任务、模型与评测身份；评测器可靠性还需要独立的 Ground Truth 元评测。插件不会自动部署 Candidate 或替换生产 Agent。评测可能产生额外模型请求、容器运行与磁盘开销。

## 凭据说明

评测中的 Candidate 可通过 Job 级临时能力调用已冻结的 Host 模型；可复用的 Codex OAuth 或上游 API 密钥不会复制进 Candidate。这不表示模型请求不经过网络。
