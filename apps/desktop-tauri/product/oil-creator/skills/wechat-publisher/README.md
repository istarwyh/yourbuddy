# WeChat Publisher Skill（微信公众号发布 Skill）

> An [Agent Skill](https://code.claude.com/docs/en/skills) that lets AI agents (Claude Code / OpenClaw / any SKILL.md-compatible agent) write, format, and publish articles to WeChat Official Accounts via the official API. Zero npm dependencies.

让 AI Agent 帮你运营微信公众号：撰写 → 排版 → 上传素材 → 创建草稿 → 发布，全流程通过微信公众号官方 API 完成。

## 功能特性

- **一键发布**：`publish-file` 将 Markdown / HTML 文件直接转为公众号草稿（自动提取标题、摘要、封面，上传配图）
- **公众号排版**：Markdown 自动转为带内联样式的公众号 HTML（微信不支持 `<style>` 标签），内置简约 / 商务 / 活泼三种风格预设
- **素材管理**：正文图片、永久封面素材上传，按文件内容 hash 自动去重，不浪费 API 配额
- **草稿 CRUD**：创建、列出、查看、删除草稿；提交发布与异步状态查询
- **本地记录**：SQLite 记录所有草稿与发布历史，支持按月份 / 状态筛选和关键词搜索
- **零依赖**：单文件 Node.js CLI，仅使用 Node 内置模块（`node:sqlite`），无需 `npm install`

## Skill 格式

本仓库遵循 [Agent Skills](https://code.claude.com/docs/en/skills) 规范，Claude Code 与 [OpenClaw](https://docs.openclaw.ai/tools/skills) 均可直接加载：

```
wechat-publisher-skill/
├── SKILL.md               # skill 入口：YAML frontmatter（name/description/metadata）+ agent 使用指南
├── wechat-publisher.mjs   # CLI 实现（Node.js 单文件，零依赖）
├── _meta.json             # 版本元数据
├── config.example.json    # 凭证配置示例
└── examples/article.md    # 示例文章
```

frontmatter 关键字段：

| 字段 | 值 | 说明 |
|------|----|------|
| `name` | `wechat-publisher` | skill 唯一标识（小写连字符，与安装目录名保持一致） |
| `description` | 一行触发描述 | agent 据此判断何时自动调用本 skill |
| `metadata.openclaw` | `{"emoji": "📰", "requires": {"bins": ["node"]}}` | OpenClaw 依赖门控：`node` 不在 PATH 时不加载 |

SKILL.md 正文中的 `{baseDir}` 指 skill 安装目录，OpenClaw 会自动解析；Claude Code 中即 SKILL.md 所在目录。

## 前置条件

1. **Node.js >= 22.5**（CLI 使用内置 `node:sqlite` 模块）
2. **微信公众号**的 AppID 和 AppSecret：登录 [公众号后台](https://mp.weixin.qq.com) → 设置与开发 → 基本配置。订阅号 / 服务号均可创建草稿；通过 API **直接发布**需要完成微信认证（见下文「已知限制」）
3. **固定公网 IP**：微信 API 要求调用方 IP 在白名单内。没有固定 IP 就需要云服务器中转，见「[IP 白名单与云端中转](#ip-白名单与云端中转必读)」

## 安装

### Claude Code

```bash
# 个人级（所有项目可用）
git clone https://github.com/peterpanstechland/wechat-publisher-skill.git ~/.claude/skills/wechat-publisher

# 或项目级（随仓库提交，团队共享）
git clone https://github.com/peterpanstechland/wechat-publisher-skill.git .claude/skills/wechat-publisher
```

重启 Claude Code 后，`/wechat-publisher` 可手动触发；日常对话中提到「发公众号」「创建公众号草稿」等会自动触发。

### OpenClaw

```bash
# 通过 CLI 安装（推荐，装入当前 workspace 的 skills/）
openclaw skills install git:peterpanstechland/wechat-publisher-skill

# 加 --global 装入 ~/.openclaw/skills，所有本地 agent 可见
openclaw skills install git:peterpanstechland/wechat-publisher-skill --global
```

或手动 clone 到任一 skill 目录（如 `~/.openclaw/skills/wechat-publisher`）。新会话生效。

### 其他 Agent（Cursor 等）

clone 到任意位置，让 agent 阅读 `SKILL.md` 即可；CLI 也可以脱离 agent 独立使用：

```bash
node wechat-publisher.mjs --help
```

## 凭证配置

CLI 按以下优先级读取凭证（二选一）：

**方式一：环境变量**

```bash
export WECHAT_APP_ID="wx1234567890abcdef"
export WECHAT_APP_SECRET="your-app-secret"
export WECHAT_API_PROXY="http://<中转服务器IP>:8888"   # 可选，无需中转时省略
```

**方式二：config.json**（参考 `config.example.json`）

```bash
mkdir -p ~/.wechat-publisher
cat > ~/.wechat-publisher/config.json <<'EOF'
{
  "appId": "wx1234567890abcdef",
  "appSecret": "your-app-secret",
  "proxy": ""
}
EOF
chmod 600 ~/.wechat-publisher/config.json
```

数据目录（存放 `config.json`、token 缓存、本地数据库、上传去重缓存）的解析顺序：

1. `$WECHAT_PUBLISHER_DATA_DIR` 环境变量
2. `~/.openclaw/workspace/wechat-publisher`（检测到 OpenClaw 环境时）
3. `~/.wechat-publisher`（独立使用的默认值）

> ⚠️ `config.json` 和 `token.json` 包含敏感凭证，权限设为 `600`，永远不要提交到 git。

## IP 白名单与云端中转（必读）

### 为什么需要

微信公众号 API 获取 `access_token` 时会校验**调用方出口 IP**：不在公众号后台「IP 白名单」里的请求直接报错 `40164`。这意味着：

- ✅ 有固定公网 IP 的云服务器：直接把 IP 加白名单即可
- ❌ 家庭宽带（动态 IP）、笔记本、办公网络：IP 会变，无法加白名单
- ❌ Serverless / 容器平台：出口 IP 不固定

如果你的 agent 跑在后两种环境，就需要一台**有固定 IP 的云服务器做 HTTP 中转**，所有微信 API 请求经它转发，白名单里只填这台服务器的 IP。

### 方案 A：直接部署在云服务器（最简单）

把 agent（或仅本 skill）跑在有固定公网 IP 的云服务器上：

1. 购买任意云服务器（阿里云 / 腾讯云 / AWS 等，最低配即可）
2. 公众号后台 → 设置与开发 → 基本配置 → IP 白名单 → 填入服务器公网 IP
3. `config.json` 的 `proxy` 留空，正常使用

### 方案 B：本地运行 + 云服务器 HTTP 代理中转

agent 在本地跑，云服务器只装一个轻量 HTTP 代理（以 [tinyproxy](https://tinyproxy.github.io/) 为例，内存占用 ~2MB）。本 CLI 内置 HTTP CONNECT 隧道支持，配置 `proxy` 字段即可让所有微信 API 请求走代理出口。

**1. 云服务器上安装并配置 tinyproxy：**

```bash
sudo apt install tinyproxy
```

`/etc/tinyproxy/tinyproxy.conf`：

```conf
User tinyproxy
Group tinyproxy
Port 8888
Listen 0.0.0.0
Timeout 60
MaxClients 10
ConnectPort 443
FilterURLs On
Filter "/etc/tinyproxy/filter"
FilterDefaultDeny Yes
LogFile "/var/log/tinyproxy/tinyproxy.log"
LogLevel Warning
DisableViaHeader Yes
```

`/etc/tinyproxy/filter`（**只放行微信 API 域名**，防止被当作开放代理滥用）：

```
^api\.weixin\.qq\.com
^mp\.weixin\.qq\.com
```

```bash
sudo systemctl restart tinyproxy && sudo systemctl enable tinyproxy
```

**2. 限制代理的访问来源（重要）：**

对公网开放的代理端口必须加访问控制，任选其一：

- **云安全组 / 防火墙**：8888 端口仅对你的出口 IP（段）开放
- **tinyproxy ACL**：配置文件中加 `Allow <你的IP>`（本地 IP 固定时适用）
- **SSH 隧道（最安全，推荐动态 IP 用户）**：tinyproxy 只监听 `Listen 127.0.0.1`，本地起隧道后走 localhost：

```bash
ssh -N -L 8888:127.0.0.1:8888 user@<云服务器IP>
# config.json 中 proxy 填 http://127.0.0.1:8888
```

**3. 配置白名单与 proxy：**

- 公众号后台 IP 白名单填**云服务器的公网 IP**
- `config.json` 的 `proxy` 填 `http://<云服务器IP>:8888`（SSH 隧道则填 `http://127.0.0.1:8888`）

**4. 验证：**

```bash
node wechat-publisher.mjs auth
# 输出 "Access token: refreshed (...s remaining)" 即打通
```

### 白名单设置路径

[公众号后台](https://mp.weixin.qq.com) → 设置与开发 → 基本配置 → IP 白名单 → 添加 IP。改动约 1-2 分钟生效。

## 快速上手

```bash
# 1. 初始化本地数据库（幂等）
node wechat-publisher.mjs init

# 2. 验证凭证与网络
node wechat-publisher.mjs auth

# 3. 预览排版效果（纯本地转换，不调用 API）
node wechat-publisher.mjs convert examples/article.md --style business

# 4. 一键发布到草稿箱
node wechat-publisher.mjs publish-file examples/article.md --author "运营" --cta

# 5. 到公众号后台草稿箱确认并群发（或已认证号直接 API 发布）
node wechat-publisher.mjs publish <media_id>
```

在 agent 里则直接说自然语言：「把这篇文章排版后发到公众号草稿」。

## CLI 命令参考

| 命令 | 说明 |
|------|------|
| `init` | 初始化本地数据库（首次使用，幂等） |
| `auth` | 显示 / 刷新 access_token 状态 |
| `upload-image <file>` | 上传正文图片 → 微信 CDN URL（自动去重） |
| `upload-cover <file>` | 上传永久封面素材 → media_id（自动去重） |
| `draft add --json '{...}'` | 创建图文草稿 |
| `draft list / get / delete` | 草稿箱管理 |
| `publish <media_id>` | 提交草稿发布（需认证公众号） |
| `publish-status <publish_id>` | 查询异步发布状态 |
| `history` / `search <kw>` | 本地记录筛选与搜索 |
| `publish-file <file> [opts]` | Markdown/HTML 一键发布到草稿 |
| `convert <file.md>` | Markdown → 公众号 HTML（本地预览） |

`publish-file` 常用选项：`--style minimal|business|lively`、`--author`、`--title`、`--digest`、`--thumb 封面.jpg`、`--cta`（文末引导）、`--max-content-images N`、`--dry-run`。

## 已知限制

| 限制 | 说明 |
|------|------|
| **48001 无发布权限** | 未认证公众号无法调用 `freepublish/submit`。草稿仍可正常创建，到后台草稿箱手动发布即可；完成微信认证后可解锁 API 发布 |
| 标题 ≤ 32 字 | 超长会被 CLI 拦截 |
| 正文 ≤ 2 万字 | 微信平台限制 |
| 正文图片 ≤ 1MB/张，封面 ≤ 10MB | 上传前请压缩 |
| 正文外链图片会被微信过滤 | 所有 `<img>` 必须用 `upload-image` 返回的微信 CDN URL |
| 草稿 1000 次/天、发布 100 次/天 | 微信 API 配额 |

## 隐私与安全

- 仓库中**不包含**任何凭证；`config.json`、`token.json`、`drafts.db`、`upload-cache.json` 均生成在数据目录（默认 `~/.wechat-publisher`），已被 `.gitignore` 排除
- AppSecret 一旦泄露可完全控制公众号 API，请像密码一样保管；泄露后立即到后台重置
- 云端中转代理务必按上文做访问控制 + 域名过滤，避免变成开放代理

## License

[MIT](LICENSE)
