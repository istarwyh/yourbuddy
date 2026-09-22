---
name: wechat-publisher
description: "微信公众号图文发布：Markdown/HTML 一键转公众号排版、上传素材、创建/管理草稿、提交发布与状态查询。当用户提到微信公众号、公众号文章、写公众号、发推文、图文消息、微信草稿等操作时使用此 skill。"
homepage: https://github.com/peterpanstechland/wechat-publisher-skill
metadata: {"openclaw": {"emoji": "📰", "requires": {"bins": ["node"]}}}
---

# WeChat Publisher（微信公众号发布）

通过微信公众号官方 API 管理图文内容：上传素材、创建草稿、发布文章。

## Quick Start

CLI 位于此 skill 目录下（`{baseDir}` 即本 SKILL.md 所在目录），零 npm 依赖，运行方式：
```bash
node {baseDir}/wechat-publisher.mjs <command>
```

首次使用需初始化数据库：
```bash
node {baseDir}/wechat-publisher.mjs init
```

## 凭证配置（首次使用必读）

CLI 按以下优先级读取公众号凭证：

1. **环境变量**：`WECHAT_APP_ID` / `WECHAT_APP_SECRET`（可选 `WECHAT_API_PROXY`）
2. **配置文件**：`<数据目录>/config.json`：
   ```json
   {"appId": "wx...", "appSecret": "...", "proxy": "http://<中转服务器IP>:<端口>"}
   ```

数据目录解析顺序：`$WECHAT_PUBLISHER_DATA_DIR` → `~/.openclaw/workspace/wechat-publisher`（OpenClaw 环境）→ `~/.wechat-publisher`。本地数据库、token 缓存、上传去重缓存都存放在此目录。

⚠️ 微信 API 有 **IP 白名单**限制：调用方出口 IP 必须加入公众号后台白名单。若运行环境没有固定公网 IP（家庭宽带、笔记本等），需要在云服务器上部署 HTTP 代理做中转并配置 `proxy` 字段，部署方法见仓库 README。若凭证未配置或报 `40164`（IP 不在白名单），引导用户完成配置而不要反复重试。

## 一键发布文件（publish-file）

当用户提供了现成的 Markdown 或 HTML 文件时，使用 `publish-file` 一键完成全流程：

```bash
node wechat-publisher.mjs publish-file /path/to/article.md [options]
```

**与手动流程的选择**：
- **有现成文件**（用户给了 .md/.html）→ 优先用 `publish-file`，一条命令搞定
- **需要创作内容**（从零写起）→ 用 Step 1-7 的手动流程，更灵活

### 选项

| 选项 | 说明 |
|------|------|
| `--style minimal\|business\|lively` | 排版风格预设（默认 minimal） |
| `--author <name>` | 作者名 |
| `--title <override>` | 覆盖自动检测的标题 |
| `--digest <text>` | 覆盖自动检测的摘要 |
| `--thumb <cover.jpg>` | 指定封面图（默认用正文首图） |
| `--cta` | 文末追加「点赞/在看/转发」引导 |
| `--max-content-images <N>` | 正文配图上限（默认 5；图多的长文可上调，注意上传日配额） |
| `--dry-run` | 仅预览 HTML 输出，不创建草稿 |

### 示例

```bash
# Markdown 一键发布
node wechat-publisher.mjs publish-file ~/article.md --author "运营" --style business --cta

# 预览转换效果
node wechat-publisher.mjs publish-file ~/article.md --dry-run

# HTML 一键发布
node wechat-publisher.mjs publish-file ~/newsletter.html --author "编辑部"

# 纯 Markdown → HTML 转换（不上传、不创建草稿）
node wechat-publisher.mjs convert ~/draft.md --style lively
```

### 支持的文件格式

- `.md` / `.markdown` — 自动转换为带内联样式的公众号 HTML
- `.html` / `.htm` — 保留原有 HTML 格式和样式

### 三种风格预设

| 风格 | --style 值 | 强调色 | 适用场景 |
|------|-----------|--------|----------|
| 简约 | `minimal` | 微信绿 `#07c160` | 通用、技术 |
| 商务 | `business` | 蓝 `#1890ff` | 正式、商业 |
| 活泼 | `lively` | 红 `#ff6b6b` | 轻松、活动 |

如需品牌定制色，可在 `wechat-publisher.mjs` 的 `STYLE_PRESETS` 中自行添加预设（只需一行：`primary`/`accent`/`heading`/`quoteBg` 四个颜色值）。

### 图片处理规则

- 首张本地图片自动作为封面（或用 `--thumb` 指定）
- 正文配图默认上传 **5 张**；图密集的长文可用 `--max-content-images N` 上调（如 `--max-content-images 20`）
- 已上传图片有缓存去重，重复使用不浪费配额
- 单张上传失败最多重试 1 次，仍失败则跳过
- 外链图片保留原 URL（仅 mmbiz.qpic.cn 可在正文中显示）

### 自动检测规则

| 字段 | Markdown | HTML |
|------|----------|------|
| 标题 | 首个 `# H1` | `<title>` 或 `<h1>` |
| 摘要 | 首个正文段落前 120 字 | 首个 `<p>` 前 120 字 |
| 封面 | 首张本地图片 | 首张本地 `<img>` |

### Publish-file 流程

```
[1/5] 解析文件（提取标题、正文、图片、摘要）
[2/5] 上传图片（封面 + 最多5张正文配图，自动去重）
[3/5] 生成 HTML（Markdown 转内联样式 HTML，或保留原 HTML）
[4/5] 创建草稿（调用微信 API）
[5/5] 输出结果（media_id、本地记录、下一步操作）
```

## 关键原则（必读！）

1. **严禁重复上传**：每个文件只上传一次。CLI 内置去重，同文件再次上传会直接返回缓存结果。
2. **一轮完成所有步骤**：从上传到创建草稿到发布，应在同一轮对话中顺序完成，不要等用户催促才推进下一步。
3. **上传完立即推进**：封面上传成功拿到 `media_id` 后，立即进入 Step 4 创建草稿，不要停下来等确认。
4. **正文配图上限**：一篇文章最多上传 **5 张**正文配图。如果原文有更多图片，选最重要的 5 张。
5. **失败不重试超过 2 次**：单张图片上传失败后最多重试 1 次，仍然失败则跳过该图，继续后续步骤。
6. **处理大型网页/URL 时必须分段**：当用户给出一个 URL 要求转发到公众号时，**不要**一次性把整个网页内容放进 prompt。先用 web 工具获取内容，如果内容很长（超过 8000 字），只提取正文部分（标题、正文段落、关键图片），丢弃导航栏、侧边栏、页脚、脚本、广告等无关内容。必要时分段处理：先提取并精简正文，再进行排版和发布。
7. **用户只说要推微信时，只做微信**：若用户明确说「排版后推到微信草稿」「发到公众号」等，**不要**同时创建飞书文档、Notion 等。仅执行 wechat-publisher 流程：排版 → 上传图片 → 创建草稿（及可选发布）。
8. **正文中禁止占位图**：content HTML 里的 `<img src="...">` 必须使用 `upload-image` 返回的微信 CDN URL。不得使用占位符、data URI、外链或「图片说明」代替。若某张图无法上传或用户未提供，从正文中**删除该图**或改为文字说明（如「[此处配图：xxx]」），不要保留空框或无效 src。

## 长文重排并推送到微信：拆解流程（防超时）

当用户给出一篇**已有长文**（如在线文档链接、粘贴的全文）并要求「重新排版并推到微信草稿」时，若一次性处理容易因**信息量过大、响应超时**或**处理了无关内容**而失败。采用以下拆解方式：

### 何时启用拆解

- 用户提供的正文**纯文本或 HTML 超过约 6000 字**，或
- 用户提供的消息/附件中明显包含多篇/多段混合内容（如多期连载、多篇文章），或
- 之前同一请求曾出现超时或「处理了不知道是啥的东西」的情况。

### 拆解策略（两阶段）

**阶段一（本轮只做精简与排版，不调用微信 API）**

1. **只取一篇、只取正文**：若附件或消息里有多篇，只处理用户明确指定的那一篇（如「第一期」「这篇」）；其余忽略，不要混在一起排版。
2. **严格限制输入长度**：从原文中只取**前 6000 字**（或按小节取「标题 + 前 3～4 个小节」），作为「本期要排版的正文」。更长部分用一句话概括并放在文末，例如：「（后续章节可在下期推送中继续。）」
3. **输出排版结果**：按本 SKILL 的排版规范，生成**完整可用的 content HTML**（段落、小标题、引用、列表、分隔线等均带内联样式）。正文中**不要**插入 `<img>`，除非本轮已能拿到微信 CDN URL（通常阶段一不传图，或只保留 1 张封面占位说明）。
4. **明确回复用户**：给出标题（及备选）、摘要、以及「已按公众号规范排好版，正文约 xxx 字。请确认：若认可，请回复『推送到微信草稿』，我会再上传封面与配图并创建草稿。」

**阶段二（用户确认后再执行）**

5. 用户回复确认后，再执行：上传封面图 → 上传正文配图（最多 5 张，若原文有图则选最重要的 5 张）→ 将 content 中的占位或说明替换为微信 CDN URL → `draft add` 创建草稿。
6. 若用户在本轮同时提供了**封面图与最多 5 张配图**，且正文已在前一步排好版，则可在同一轮内完成阶段二，无需等用户再回复。

### 单轮可处理的正文上限

- 用于**生成/排版**的原文输入建议不超过 **6000 字**（约 1.2 万 token）。超过则先做「阶段一」精简与排版，下一轮再推送。
- 最终写入微信草稿的 content HTML 总长度仍须符合公众号限制（不超过 20000 字）。

### 避免「处理了不知道是啥的东西」

- **不猜测、不扩展**：只处理用户明确指向的那一篇文章/那一期内容；不要自动把「下一篇预告」、其他连载、无关链接或附件一并排版或推送。
- **图片**：没有真实上传并拿到微信 CDN URL 的图片，一律不写入 content；用文字说明替代或省略，不保留占位符或空白图框。
- **来源单一**：若用户给的是在线文档链接（飞书 / Notion 等），只抓该文档正文，不要混入侧栏、评论、其他文档。

若按上述拆解后仍出现请求超时，可在 OpenClaw 运行环境中适当调大 `agents.defaults.timeoutSeconds`（具体配置位置见 OpenClaw 文档或部署配置）。

## 发布一篇公众号文章的完整流程

⚠️ **常规流程**：整个流程应在一轮对话中连续执行。每完成一步立即进入下一步，不要中途停下来报告中间状态或等待用户确认。

**例外**：当用户提供的是已有长文（见上文「长文重排并推送到微信：拆解流程」）时，先做阶段一（精简+排版并回复），等用户确认后再做阶段二（上传图+创建草稿），避免单轮信息量过大导致超时或错乱。

### Step 0: 处理来源 URL（如果用户提供了网页链接）

当用户给出一个 URL 说"把这篇文章发到公众号"时：

1. **获取网页内容**：用 web/browse 工具抓取页面。
2. **精简提取**：只保留文章标题、正文段落、关键配图（最多 5 张）。**丢弃**导航栏、侧边栏、页脚、相关推荐、广告、脚本标签等无关内容。
3. **控制长度**：提取后的纯文本正文控制在 **8000 字以内**。如果原文特别长，保留核心内容并在文末注明"阅读原文"链接。
4. **下载配图**：将正文中需要的图片下载到本地临时目录，后续通过 `upload-image` 上传到微信 CDN。

⚠️ **绝对不要**把原始网页 HTML（包含 CSS/JS/导航等）直接传给 LLM 或塞进 content 字段。AWS、Medium 等网站的完整 HTML 可能超过 25 万 token，会导致 `InvalidParameter: Range of input length` 错误。

### Step 1: 撰写内容

帮用户撰写以下字段：

- **title**（必填）— 文章标题，不超过 32 个字
- **author**（可选）— 作者名，不超过 16 个字
- **digest**（可选）— 摘要，不超过 128 个字；留空则自动截取正文前 54 个字
- **content**（必填）— 正文，HTML 格式，不超过 20000 个字

#### 标题优化

撰写 title 时，**同时生成 2-3 个备选标题**供用户选择：

```
主标题：xxx
备选1：xxx
备选2：xxx
```

标题原则：
- 善用**数字**（"5 个方法"、"3 分钟学会"）和**悬念**（"你一定不知道…"）
- 触达**痛点**（"还在为 xxx 发愁？"）
- 长度不超过 32 个字，简短有力

#### 写作模板

根据用户描述判断文章类型，选用对应模板组织内容结构。用户未明确指定时，自动选择最匹配的模板：

| 模板 | 适用场景 | 结构 |
|------|----------|------|
| 产品测评 | 产品推荐、工具评测 | 开篇引入 → 产品介绍 → 优缺点 → 使用体验 → 总结推荐 |
| 教程/干货 | 操作指南、知识分享 | 背景/痛点 → 步骤 1/2/3（每步配图）→ 注意事项 → 总结 |
| 观点文 | 热点评论、深度分析 | 热点引入 → 观点陈述 → 论据 1/2/3 → 结论与建议 |
| 资讯快报 | 行业动态、新闻摘要 | 一句话概括 → 要点 1/2/3 → 延伸阅读/原文链接 |

撰写要点：
- 正文用 HTML 标签排版（具体样式见下方「排版规范」）
- 建议每 3-4 段插入一张配图（最多 5 张），提高阅读体验
- 适当使用 emoji 增加亲和力，但不过度（标题 0-1 个，正文每段 0-2 个）
- 文末加引导语（关注、点赞、在看）

#### 排版规范（必须遵守）

生成 content HTML 时，**必须**使用以下内联样式模板，保证统一 UI 风格。微信公众号仅支持内联 `style` 属性，不支持 `<style>` 标签和外部 CSS。

用户可指定「简约」「商务」「活泼」三种风格预设（未指定时默认「简约」）：

| 风格 | 主色 | 强调色 | 标题装饰 | 引用块 |
|------|------|--------|----------|--------|
| 简约（默认） | `#333` | `#07c160`（微信绿） | 绿色左边框 | 灰底绿边 |
| 商务 | `#1a1a1a` | `#1890ff`（蓝） | 蓝色左边框 | 灰底蓝边 |
| 活泼 | `#333` | `#ff6b6b`（红） | 红色左边框 | 浅红底红边 |

下方模板以「简约」风格为例，其他风格替换对应颜色即可。

**段落**：
```html
<p style="margin: 0 0 1em 0; line-height: 1.8; font-size: 16px; color: #333; letter-spacing: 0.5px;">正文内容</p>
```

**段落间距**（呼吸感）：
```html
<p style="margin: 0; line-height: 1;"><br/></p>
```

**小标题（h2）**：
```html
<h2 style="margin: 1.5em 0 0.8em 0; font-size: 18px; font-weight: bold; color: #1a1a1a; border-left: 4px solid #07c160; padding-left: 12px; line-height: 1.4;">小标题文字</h2>
```

**强调文字**：
```html
<strong style="color: #07c160;">重点文字</strong>
```

**引用块**：
```html
<blockquote style="margin: 1em 0; padding: 12px 16px; background: #f7f7f7; border-left: 4px solid #07c160; color: #555; font-size: 15px; line-height: 1.75;">引用内容</blockquote>
```

**图片**（居中 + 圆角）：
```html
<p style="text-align: center; margin: 1.2em 0;"><img src="微信CDN_URL" style="max-width: 100%; border-radius: 8px;" /></p>
```

**图注**（图片下方可选说明）：
```html
<p style="text-align: center; font-size: 13px; color: #999; margin: 0.3em 0 1em 0;">▲ 图片说明文字</p>
```

**无序列表**：
```html
<ul style="margin: 0.8em 0; padding-left: 2em; color: #333;">
  <li style="margin-bottom: 0.5em; line-height: 1.8; font-size: 16px;">列表项</li>
</ul>
```

**有序列表**：
```html
<ol style="margin: 0.8em 0; padding-left: 2em; color: #333;">
  <li style="margin-bottom: 0.5em; line-height: 1.8; font-size: 16px;">列表项</li>
</ol>
```

#### 样式片段库

根据内容类型，在正文中选用以下样式片段（直接复制 HTML 使用）：

**分隔线**（章节之间）：
```html
<p style="text-align: center; margin: 1.5em 0; color: #ddd; font-size: 14px; letter-spacing: 4px;">────── ✦ ──────</p>
```

**提示框**（重要提示、注意事项）：
```html
<div style="margin: 1em 0; padding: 12px 16px; background: #fff7e6; border-left: 4px solid #fa8c16; border-radius: 0 8px 8px 0; font-size: 15px; color: #664d03; line-height: 1.75;">💡 <strong>提示：</strong>这里写提示内容</div>
```

**总结框**（要点归纳、文末总结）：
```html
<div style="margin: 1em 0; padding: 12px 16px; background: #f0f9ff; border-left: 4px solid #1890ff; border-radius: 0 8px 8px 0; font-size: 15px; color: #333; line-height: 1.75;">📌 <strong>小结：</strong>这里写总结内容</div>
```

**文末引导**（关注、点赞、在看）：
```html
<p style="margin: 0; line-height: 1;"><br/></p>
<p style="text-align: center; margin: 1.5em 0; color: #ddd; font-size: 14px; letter-spacing: 4px;">────── ✦ ──────</p>
<p style="margin-top: 1em; padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center; color: #666; font-size: 14px; line-height: 1.8;">如果觉得有帮助，欢迎 <strong style="color: #07c160;">点赞</strong> | <strong style="color: #07c160;">在看</strong> | <strong style="color: #07c160;">转发</strong><br/>你的支持是我持续创作的动力 👆</p>
```

#### 完整排版示例

以下是一篇排版后的 content 结构示意（简约风格）：

```html
<h2 style="margin: 1.5em 0 0.8em 0; font-size: 18px; font-weight: bold; color: #1a1a1a; border-left: 4px solid #07c160; padding-left: 12px; line-height: 1.4;">一、开篇引入</h2>

<p style="margin: 0 0 1em 0; line-height: 1.8; font-size: 16px; color: #333; letter-spacing: 0.5px;">这里是第一段正文，介绍背景和痛点。使用 <strong style="color: #07c160;">强调色</strong> 突出关键词。</p>

<p style="margin: 0; line-height: 1;"><br/></p>

<p style="margin: 0 0 1em 0; line-height: 1.8; font-size: 16px; color: #333; letter-spacing: 0.5px;">这里是第二段正文，展开论述。</p>

<p style="text-align: center; margin: 1.2em 0;"><img src="微信CDN_URL" style="max-width: 100%; border-radius: 8px;" /></p>
<p style="text-align: center; font-size: 13px; color: #999; margin: 0.3em 0 1em 0;">▲ 图片说明</p>

<p style="text-align: center; margin: 1.5em 0; color: #ddd; font-size: 14px; letter-spacing: 4px;">────── ✦ ──────</p>

<h2 style="margin: 1.5em 0 0.8em 0; font-size: 18px; font-weight: bold; color: #1a1a1a; border-left: 4px solid #07c160; padding-left: 12px; line-height: 1.4;">二、核心内容</h2>

<p style="margin: 0 0 1em 0; line-height: 1.8; font-size: 16px; color: #333; letter-spacing: 0.5px;">详细内容段落…</p>

<blockquote style="margin: 1em 0; padding: 12px 16px; background: #f7f7f7; border-left: 4px solid #07c160; color: #555; font-size: 15px; line-height: 1.75;">这里引用一段数据或名言。</blockquote>

<div style="margin: 1em 0; padding: 12px 16px; background: #fff7e6; border-left: 4px solid #fa8c16; border-radius: 0 8px 8px 0; font-size: 15px; color: #664d03; line-height: 1.75;">💡 <strong>提示：</strong>这里写注意事项</div>

<p style="text-align: center; margin: 1.5em 0; color: #ddd; font-size: 14px; letter-spacing: 4px;">────── ✦ ──────</p>

<h2 style="margin: 1.5em 0 0.8em 0; font-size: 18px; font-weight: bold; color: #1a1a1a; border-left: 4px solid #07c160; padding-left: 12px; line-height: 1.4;">三、总结</h2>

<div style="margin: 1em 0; padding: 12px 16px; background: #f0f9ff; border-left: 4px solid #1890ff; border-radius: 0 8px 8px 0; font-size: 15px; color: #333; line-height: 1.75;">📌 <strong>小结：</strong>全文要点归纳。</div>

<p style="margin: 0; line-height: 1;"><br/></p>
<p style="text-align: center; margin: 1.5em 0; color: #ddd; font-size: 14px; letter-spacing: 4px;">────── ✦ ──────</p>
<p style="margin-top: 1em; padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center; color: #666; font-size: 14px; line-height: 1.8;">如果觉得有帮助，欢迎 <strong style="color: #07c160;">点赞</strong> | <strong style="color: #07c160;">在看</strong> | <strong style="color: #07c160;">转发</strong><br/>你的支持是我持续创作的动力 👆</p>
```

### Step 2: 上传正文配图（最多 5 张）

正文中所有图片**必须**使用微信 CDN URL，外部链接会被过滤。

对每张需要在文章正文中展示的图片（**最多 5 张**）：
```bash
node wechat-publisher.mjs upload-image /path/to/image.jpg
```

返回微信 CDN URL，将其嵌入 content HTML 的 `<img src="...">` 中。

限制：单张不超过 1MB，支持 JPG/PNG。

**去重**：CLI 会自动检测同一文件是否已上传过，重复调用直接返回缓存 URL，不会浪费 API 配额。

**失败处理**：如果某张图上传失败，重试 1 次后仍失败则跳过，从正文中移除该 `<img>` 标签，继续下一步。

### Step 3: 上传封面图（仅 1 张）

封面图需要一个**永久素材** media_id：
```bash
node wechat-publisher.mjs upload-cover /path/to/cover.jpg
```

返回 `media_id`，用于 `thumb_media_id` 字段。

限制：单张不超过 10MB，支持 BMP/PNG/JPEG/GIF。

**去重**：同一文件再次上传会返回缓存的 `media_id`。

⚠️ **封面图上传成功后，立即进入 Step 4，不要停下来报告或等待用户确认。**

### Step 4: 创建草稿

将所有内容组合，调用 draft add：
```bash
node wechat-publisher.mjs draft add --json '{
  "title": "5个提升效率的AI工具推荐",
  "author": "运营团队",
  "digest": "这5个AI工具让你的工作效率翻倍...",
  "content": "<p>正文 HTML（图片使用 Step 2 返回的 URL）</p>",
  "thumb_media_id": "STEP3_RETURNED_MEDIA_ID",
  "content_source_url": "https://example.com/original",
  "need_open_comment": 1,
  "only_fans_can_comment": 0
}'
```

成功后返回 `media_id`（草稿ID），同时记录到本地数据库。

### Step 5: 确认并发布

向用户展示草稿摘要，确认后尝试提交发布：
```bash
node wechat-publisher.mjs publish <media_id>
```

**⚠️ 未认证公众号的发布限制：**

如果公众号未完成企业认证，`publish` 命令会返回 `error: api_unauthorized`（错误码 48001）。
这**不是 bug**，而是微信平台的权限限制——`freepublish/submit` 接口仅对已认证的公众号开放。

**遇到 48001 时的正确做法：**
1. 告诉用户：「草稿已成功创建。由于公众号未完成企业认证，无法通过 API 自动发布。」
2. 引导用户：「请登录微信公众号后台 mp.weixin.qq.com → 内容管理 → 草稿箱 → 找到刚才创建的草稿 → 点击发布。」
3. **不要**重试 publish 命令，不要尝试其他发布接口，48001 是账号级别的权限限制，无法通过代码绕过。

如果 publish 成功，会返回 `publish_id`。注意：发布是异步的，提交成功不等于发布完成。

### Step 6: 查询发布状态

```bash
node wechat-publisher.mjs publish-status <publish_id>
```

发布需要几秒到几分钟不等。状态为 0 表示成功。

### Step 7: 反馈用户

发布成功后，向用户汇报：
```
✅ 公众号文章已发布
标题: 5个提升效率的AI工具推荐
作者: 运营团队
状态: 已发布
```

## 管理草稿箱

```bash
# 列出草稿（从微信服务器获取）
node wechat-publisher.mjs draft list

# 查看草稿详情
node wechat-publisher.mjs draft get <media_id>

# 删除草稿
node wechat-publisher.mjs draft delete <media_id>
```

## 查看本地记录

所有通过此工具创建的草稿和发布记录都保存在本地数据库：

```bash
# 列出本地记录
node wechat-publisher.mjs history

# 按月筛选
node wechat-publisher.mjs history --month 2026-03

# 按状态筛选
node wechat-publisher.mjs history --status published

# 搜索
node wechat-publisher.mjs search 效率工具
```

## CLI Commands Reference

| Command | Description |
|---------|-------------|
| `init` | 初始化本地数据库（首次使用，幂等） |
| `auth` | 显示 access_token 状态 |
| `upload-image <file>` | 上传正文图片，返回微信 CDN URL（自动去重） |
| `upload-cover <file>` | 上传永久封面素材，返回 media_id（自动去重） |
| `draft add --json '{...}'` | 创建图文草稿 |
| `draft list [--offset N] [--count N]` | 列出微信草稿箱 |
| `draft get <media_id>` | 获取草稿详情 |
| `draft delete <media_id>` | 删除草稿 |
| `publish <media_id>` | 提交草稿发布 |
| `publish-status <publish_id>` | 查询发布状态 |
| `history [--month YYYY-MM] [--status S]` | 列出本地记录 |
| `search <keyword>` | 搜索本地记录 |
| `publish-file <file> [opts]` | 一键发布 Markdown/HTML 到草稿（解析→上传→创建草稿） |
| `convert <file.md> [--style S]` | Markdown → 微信 HTML 转换（预览，不创建草稿） |

### history 筛选参数

- `--month YYYY-MM` — 按月份
- `--status draft|published|failed` — 按状态
- `--limit N` — 最大条数（默认 50）

## Important Rules

1. 首次使用必须 `init`（幂等，可重复运行）
2. 正文图片 URL 必须来自 `upload-image` 返回值，外部 URL 会被微信过滤
3. 封面 `thumb_media_id` 必须来自 `upload-cover` 返回值
4. 发布是异步操作，提交后用 `publish-status` 轮询结果
5. 每日草稿创建限额 1000 次，发布限额 100 次
6. 发布后草稿自动从草稿箱移除
7. 如果 access_token 过期导致报错，工具会自动刷新，重试即可
8. **每个文件只上传一次**，CLI 内置去重缓存
9. **正文配图最多 5 张**，超过的选重要的保留
10. **单张图片上传最多重试 1 次**，仍失败则跳过继续后续步骤
11. **publish 返回 48001（api_unauthorized）时不要重试**，这是账号认证级别的限制，引导用户去公众号后台手动发布即可
