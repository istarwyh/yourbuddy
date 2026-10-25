# 从终端安装与升级

[English](installer.md) | 中文

在 Apple Silicon macOS 上安装 YourBuddy，不需要源码仓库、Node、pnpm 或编译器。在桌面对话中升级承载该对话的应用；应用不可用时使用终端。

## 选择入口

普通首次安装仍以 [Bootstrap DMG](download.zh.md) 图形界面方式最简单。终端方式要求官方 Release 包含 `install-yourbuddy.sh`。缺少该文件或原生安装协议的 Release 必须使用其 DMG；不支持向旧版应用传递安装器参数。

在支持该功能的 YourBuddy 对话中，请助手升级 YourBuddy。助手通过 `yourbuddy_upgrade` 准备独立安装进程，把操作回执记录到当前会话，然后交接重启。如果其他任务、subagent 或后台任务正在运行或排队，升级会被拒绝；请先完成这些工作再重试。重启后仍可打开原对话，但 agent（智能体）不会自动恢复或重复先前的工具操作。

终端安装不会自动关闭正在运行的 YourBuddy 图形界面，因为外部命令无法确认其任务已空闲且会话已保存。请改用当前对话升级，或完成任务并退出选定应用后，再从终端重试。支持安装器协议的应用也受此限制。

## 首次从终端安装

确认[最新官方 Release](https://github.com/istarwyh/yourbuddy/releases/latest) 列出 `install-yourbuddy.sh` 后，执行：

```sh
curl --fail --location --retry 3 --output install-yourbuddy.sh \
  https://github.com/istarwyh/yourbuddy/releases/latest/download/install-yourbuddy.sh
bash install-yourbuddy.sh
```

启动脚本选择最新 YourBuddy Release，下载其 Bootstrap 归档与匹配签名，然后启动原生安装器。原生预配复用兼容 Node、pnpm Store 与已保存的代理设置，不要求手动修改缓存。启动脚本下载使用 curl 的网络环境或显式 `--proxy`。`--app` 选择准确的应用路径；省略时使用 `/Applications` 或 `~/Applications` 中已有的副本，存在多个副本则要求明确选择。首次安装默认使用 `/Applications/YourBuddy.app`。

首次引导信任官方 GitHub HTTPS 下载或你提供的官方归档。存在支持协议的已安装辅助程序时，脚本优先使用它；否则先执行下载的辅助程序，再由该程序检查应用归档签名。原生签名检查保护安装载荷，而不是辅助程序的首次执行。不要替换为来源不明的归档。

## 代理、固定版本与离线文件

访问 GitHub 需要代理时，同时将其用于启动脚本下载与原生安装：

```sh
curl --fail --location --retry 3 --proxy http://127.0.0.1:7890 \
  --output install-yourbuddy.sh \
  https://github.com/istarwyh/yourbuddy/releases/latest/download/install-yourbuddy.sh
bash install-yourbuddy.sh --proxy http://127.0.0.1:7890
```

使用这台 Mac 可以访问且不含凭据的代理地址。添加 `--version X.Y.Z` 可选择已发布且支持安装器的 Release；添加 `--app "$HOME/Applications/YourBuddy.app"` 可选择父目录已存在的可写目标。固定版本不代表旧版应用能够兼容降级后的数据。

单独使用 `--offline` 会下载较大的 Offline 归档，然后只使用其中的签名 Seed 与本地缓存预配组件。对于不能联网的 Mac，请在联网设备上从同一官方 Release 下载 `install-yourbuddy.sh`、Offline `.app.tar.gz` 及匹配的 `.sig`。将它们复制到 Mac，保留归档与签名配对，并使用文件的实际绝对路径：

```sh
bash install-yourbuddy.sh --offline \
  --package "$HOME/Downloads/YourBuddy.app.tar.gz" \
  --signature "$HOME/Downloads/YourBuddy.app.tar.gz.sig"
```

本地文件方式不会向 GitHub 查询 Release，版本取自归档。它不要求逐个复制组件、解压 pnpm Store 或重新构建应用。

## 读取结果

`accepted` 回执表示操作已保存且独立安装器已启动，不代表安装成功。请保留其 `id`。只有目标应用版本、私有 Host 与前端均就绪，持久记录中的 `phase` 才会成为 `succeeded`；`failed` 与 `needsUserAction` 都是需要处理的终止结果。 `unchanged` 表示所选应用已是目标版本，没有停机或替换应用；它不表示工作台就绪。

安装器会在返回回执之前创建稳定命令，首次安装也不例外。无需修改 PATH，即可等待指定应用的结果：

```sh
"$HOME/Library/Application Support/YourBuddy/bin/yourbuddy" \
  status --app /Applications/YourBuddy.app --wait
```

`--wait` 输出终止状态的 JSON 记录。请读取 `phase`：即使记录的操作失败或需要用户处理，状态命令也可能以零退出。桌面的**启用终端命令**会让 `yourbuddy` 在新的终端会话中可用。这与安装相互独立：启动脚本不会编辑 Shell Profile。启用后，可查询最近操作或某份具体回执：

```sh
yourbuddy status --app /Applications/YourBuddy.app
yourbuddy status --operation OPERATION_ID
```

`yourbuddy version` 不访问网络，直接报告本地命令可执行文件的版本。`yourbuddy check` 查询可用 Release 版本，不执行安装。`yourbuddy install` 发起新的安装请求。显式 `--request-id` 会使相同目标和选项的重试返回同一操作；处理终止失败后，如需重新尝试，请使用新的请求 ID。使用 `--defer-stop` 的高级调用方必须自行阻止其他工作、负责目标 Host 的繁忙准入检查，并在执行 `yourbuddy handoff --operation OPERATION_ID` 前保存会话回执。仅提供 `--session-id` 并不能确立该职责。`yourbuddy cancel --operation OPERATION_ID --reason "Cancel before restart"` 只在开始关闭应用前接受；取消会记为 `needsUserAction`，而不是成功。

在桌面对话中，`yourbuddy_upgrade_status` 读取同一持久结果，不会重新执行升级。重启恢复的是已保存对话，而不是自动继续 agent。

## 不删除用户数据的恢复方式

重试前先读取 `error` 与 `userAction`。网络失败可通过代理或本地文件重试。其他任务仍在运行时，先等待其完成。从终端升级时，请先完成任务，再亲自退出选定应用并重试。不支持关闭协议的旧版应用不能使用对话交接，安装器也不会强制终止它。

出现 `needsUserAction` 时，请亲自执行记录中的操作。其他权限或启动错误可能记为 `failed`；请读取错误信息，不要假定每个 macOS 授权问题都有独立分类。YourBuddy 尚未使用 Apple Developer 身份签名或公证，首次启动可能需要选择**隐私与安全性 → 仍要打开**。安装器不会绕过该决定，也不会悄悄请求管理员权限。目标目录无法替换时，请选择可写的应用位置。

设置、凭据和会话不在应用替换范围内。不要通过删除应用数据或组件缓存修复升级。平台检查的实际结果与已知限制见[故障排查](troubleshooting.zh.md)及所选 Release 的[验证归档](../../releases/README.zh.md)。
