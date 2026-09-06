# 评测与改进

[English](evaluation.md) | 中文

从真实任务的证据开始，再建立稳定的比较。

## 四个实用概念

| 概念 | 回答的问题 |
|---|---|
| 评测集 Dataset | 测什么？ |
| 生成器 Generator | 谁来产生答案或成果？ |
| 评测器与标准 Evaluator | 怎样算好，由谁检查？ |
| 优化器 Optimizer | 谁提出下一次受控修改？ |

随附的 Harbor Skill 会引导配置。在对话中调用 `evolve-agent-with-harbor` 并说明任务。桌面已包含插件、Skill 与配套 Python Adapter，无需重复独立包的安装命令。Candidate 执行仍需相应 Docker 环境和可用模型服务，开始前运行 Doctor。

## 还没有数据集

请求诊断当前工作目录中近期已完成的会话。先预览记录范围、评测器、预计请求与证据保存说明，再确认执行。在 Harbor 工作台检查覆盖率、证据和未评分原因。

历史诊断不重新运行 Candidate，也不能作为晋级基线。已完成但未评分的记录不等于零分。没有符合条件的历史时，先完成任务或明确提供 Query／Dataset。

## 已有可重复任务

确认四个概念，固定 Candidate 模型并建立有效基线。每次改变一个因素，在可比任务上回归，同时检查改善与退化。模型或评测器身份变化时可能需要新基线。

单 Query 快速诊断检查执行链路，不等于按草拟标准完成了质量评测。正式晋级需要已接受的策略，评测器可靠性需要独立 Ground Truth 元评测。部署仍是独立操作。

成本、凭据与限制见 [Harbor Evolution](plugins/harbor-evolution.zh.md)。
