# harbor-dsh-evolution

[English](README.md) | 中文

这是 Harbor 一侧的集成包，同时支持 DeepSeek Harness Candidate 评测与隐私保护 Historical Generation Evaluation。

它提供：

- `DshCandidateAgent`：验证并上传不可变 Candidate，安装其锁定的 npm 依赖，再通过 Harbor ACP Runner 运行 Candidate。
- `EvolutionPlugin`：把每个 Job 绑定到 Candidate、Dataset Manifest、Evaluation Stack Manifest、Candidate Context v3、Architecture Doctor、不可变的已执行 Evaluator Bundle、Trial Assessment、Population Report 与 Summary。Harbor 运行前，每个源 Task Verifier 都会替换为一个严格 Adapter；该 Adapter 调用 Descriptor 授权的 `input_builder` 与 Evaluator，并校验配置、物化和执行阶段的可迁移 Digest。
- `SessionObservationAgent`：把一个冻结且经过凭据脱敏的 DSH Session Observation 作为一个确定性的 Harbor Trial 提供给评测流程，而不重新运行 Candidate；可见源码文本中的普通路径会保留。
- `HistoricalGenerationEvaluationPlugin`：验证不可变 Historical Batch、Dataset 与 Stack 的交叉引用，运行 Evaluator v2，保留 `completed-unscored` 弃权，并写入 Summary v4 与严格的完成标记。Historical Job 只用于诊断，不能进入 Promotion Gate。
- `harbor-dsh`：初始化严格项目，验证或创建 Candidate、Dataset 与 Stack Snapshot，物化 Historical Batch 输入，预览 Candidate Context v3，执行架构诊断、Job 汇总和确定性的 Promotion Gate。
- `business-observation/v1`：校验并保存经过审阅的聚合业务指标，包含不可变 Observation id、Canonical Digest、来源信息、Subject／Window／Metric 身份、敏感字段拒绝以及趋势和分组读取。它绝不执行网络导入，也不修改离线 Summary、Reward 或 Gate。

它必须与 Harbor 安装在同一个 Python 环境中，Harbor 才能发现该插件 Entry Point：

```bash
uv venv .venv
uv pip install --python .venv/bin/python harbor-dsh-evolution==0.10.1
source .venv/bin/activate
harbor plugins list
harbor-dsh --help
```

插件列表必须包含两个 Entry Point：

```text
dsh-evolution
dsh-historical-evaluation
```

从本仓库开发：

```bash
uv sync
uv run harbor plugins list
uv run harbor-dsh --help
uv run harbor-dsh historical --help
uv run harbor-dsh dataset validate ../../examples/deep-research/task --project-root ../..
uv run harbor-dsh stack validate ../../examples/deep-research/.harbor/evaluation-stack.yml --project-root ../..
uv run harbor-dsh business-observation import --project-root ../.. --input ../../results/reviewed-observation.json
uv run harbor-dsh business-observation list --project-root ../.. --candidate-digest sha256:<64-hex>
uv run pytest
uv build
```

Harbor 与该包必须位于同一个 Python 环境中，`harbor plugins list` 才会显示 `dsh-evolution` 和 `dsh-historical-evaluation` Entry Point。

`snapshot` 默认从 `package.json` 推导 Candidate id 与版本，也允许显式指定。旧版 Candidate Context 和 Dataset 自有的评分 Verifier 不作为兼容路径。Candidate 晋级要求 Context v3，并输出结构化的不匹配、产物、基础设施、指标与回归原因码。Historical 物化则从经过凭据脱敏的 `historical-generation-batch/v1` 派生配套 Dataset 与不可变 Stack；它绝不会创建 Candidate 身份，会把证据不足报告为 `completed-unscored`，并且在传给 Gate 时始终返回 `UNSUPPORTED_JOB_KIND_FOR_PROMOTION`。
