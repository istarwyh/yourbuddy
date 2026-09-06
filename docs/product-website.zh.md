# YourBuddy 官网维护

[English](product-website.md) | 中文

官网使用 [OINK](https://oink.pgsty.com/docs/start/starter/) 1.0.0 与 Hugo Extended 0.165.0。中文位于根路径，英文位于 `/en/`；[SDK 文档](user/index.zh.md)继续由 VitePress 构建。

## 本地运行

准备 Node 22.19+、仓库指定的 pnpm、Go 1.27.x 和 Hugo Extended 0.165.0。先运行仓库依赖安装，再启动官网：

```sh
pnpm install
pnpm website:dev
```

打开 `http://localhost:4174/`。修改正文会重新投影；修改首页数据与样式由 Hugo 自动刷新。工具不在 PATH 时，用 `HUGO_BIN` 指定 Hugo，并把 Go 的目录加入 PATH。

## 编辑内容

产品正文位于 [docs/user/product/](user/product/index.zh.md)，已有开发教程保留在 [docs/user/develop/](user/develop/basic/index.zh.md)。发布清单从 `docs/user/` 选择正文，每篇维护英文、中文和翻译记录。首页区块由同目录下的 [home-data/zh.json](user/product/home-data/zh.json) 与 [home-data/en.json](user/product/home-data/en.json) 提供；这是首页短文案的来源。新增页面登记到 [product-pages.json](../website/product-pages.json)，正文继续使用仓库相对链接。主题配置与样式位于 [website/product/](../website/product/)，构建生成物不入库。

首页呈现由[项目模板](../website/product/layouts/_partials/yourbuddy/)与[项目样式](../website/product/assets/scss/_styles_project.scss)负责。区块数据供应首页 HTML，可搜索的指南及其 Markdown 导出来自仓库正文。双语内容一起维护；任务示例须明确标注，并与入门指南保持一致；浅色和深色均须清晰可读。不要编辑缓存中的主题模块。

## 构建与验证

```sh
pnpm website:check
pnpm test:docs
pnpm doc-sync
pnpm lint
```

官网检查包括投影测试、严格 Hugo 构建、产物内部链接、页面锚点与资源检查。SDK 的公开来源或适配器也有变化时，运行 `pnpm docs:check`。嵌套栏目发布 HTML、Markdown 和打印版，包含子页的全文汇编由顶层栏目负责。官网产物位于 `website/product/.dist/`，含双语 HTML、逐页 Markdown、搜索索引、`llms.txt`、章节全文和导航 JSON。[官网工作流](../.github/workflows/product-site.yml)上传可审查产物，并将检查通过的 `master` 构建发布到 GitHub Pages。

用完整且以斜杠结尾的 `PRODUCT_SITE_BASE_URL` 设置部署地址；子路径同时参与正文、导航与资源 URL 的构建。未指定时使用本地地址，发布前必须重建。主题由 [go.mod](../website/product/go.mod) 与 [go.sum](../website/product/go.sum) 固定；不要直接跟随主题主分支。

## GitHub Pages

官网地址为 [istarwyh.github.io/yourbuddy](https://istarwyh.github.io/yourbuddy/)。仓库 Pages 设置使用 **GitHub Actions** 作为构建来源。工作流读取 Pages 基础 URL，带上该前缀构建并检查网站，再通过 `github-pages` 环境部署已验证的产物。仅部署 Job 获得 `pages: write` 和 `id-token: write`；工作流不保存个人访问令牌。

`master` 上的网站输入变更会触发发布。如需在不改源码时重新发布，可在 GitHub Actions 中选择 `master` 手动运行 **YourBuddy website**。PR 和其他分支上的手动运行只生成预览产物。同一分支的更新串行运行，构建失败时线上网站保持不变。

## 下载信息与发布

[下载页](user/product/download.zh.md)与[版本页](user/product/releases.zh.md)只描述已核验的公开发行。带日期的可用性证据归属这些页面和[版本归档](releases/README.zh.md)，不放在维护流程中。源码版本、已推送 Tag 或成功构建都不能单独证明下载 URL 可用。

<a id="release-synchronization"></a>

## 发布时同步官网

每次 YourBuddy 桌面发布都执行本流程，包括补丁版本。发布操作人员负责内容更新与线上核验；现有官网工作流只构建和部署已提交内容。

1. 打 Tag 前，准备[版本归档](releases/_template/README.zh.md)，检查下列受影响页面。保留当前已经核验的下载入口；未发布候选版本标为待发布，不将其提升为默认下载。
2. 产品发布后，按照[桌面发布流程](../apps/desktop-tauri/README.zh.md)核验准确的 GitHub Release、下载的安装包及校验和、架构、带签名的更新归档及签名，以及稳定更新元数据。修改公开声明前先记录失败与部分可用状态。
3. 根据这些证据同步下列双语真源。只有对应安装包公开可用且已核验后，才移除待发布文案。失败的候选版本不替换最近已核验版本。

| 来源 | 发布时更新 |
|---|---|
| [下载页](user/product/download.zh.md) | 准确 Tag 与安装包链接、平台、校验和、安装或升级路径及已知限制 |
| [版本页](user/product/releases.zh.md) | 版本、日期、用户可见变化、验证限制，以及公开发行与证据链接 |
| [首页正文](user/product/home.zh.md)与[中文](user/product/home-data/zh.json) / [英文首页数据](user/product/home-data/en.json) | 一致的安装状态与操作标签；HTML 和原始 Markdown 使用不同内容来源，两处都要检查 |
| [使用指南](user/product/index.zh.md)与[默认插件](user/product/plugins/index.zh.md) | 发生变化的配置、用法、插件前提、来源、限制和选择理由；核实实际打包的来源记录，不默认等于上游最新版本 |
| [路线图](user/product/roadmap.zh.md) | 只有当次发行证据支持时，才把规划能力改为已交付；未承诺方向继续标为建议 |

4. 重新记录变更的 Markdown 配对。设置 `PRODUCT_SITE_BASE_URL=https://istarwyh.github.io/yourbuddy/` 运行 `pnpm website:check`，再执行本指南的文档检查。SDK 来源或适配器也有变化时，运行其独立检查。浏览器可用时，在本地预览检查双语页面与下载旅程。
5. 在已授权的发布任务中，将官网变更提交并发布到 `master`；可以使用不可变发布 Tag 之后的后续 Commit。官网输入变化触发 **YourBuddy website**，仅推送桌面 Tag 不会触发。记录官网 Commit 与对应工作流运行，等待构建和部署均成功。如果只修改归档，官网路径过滤不会触发；确需重建站点时，使用已有的 `master` 手动触发入口。
6. 打开已发布的中英文首页、下载页和版本页，核对目标版本与可用状态，访问真实安装包、校验和及证据链接，并检查导航、搜索与原始 Markdown。将 URL、日期、官网 Commit、运行记录及观察结果写入版本归档。浏览器或网络失败须保留为未验证，绿色部署本身不够。

站点同步单独记录为待同步、已部署待核验、已部署且已核验、失败或不适用。如果产品已发布但站点失败，保留产品的真实发布状态，修复或重试官网任务，不重新发布桌面安装包。发布后的观察结果可使用新的证据 Commit，由发布记录链接，不移动公开 Tag，也不修改已发行字节。公开产品结论需要纠正时，遵循[发布修正规则](releases/README.zh.md)。

网站部署不发布桌面安装包。网站使用 GitHub Pages 域名，不依赖在线字体、CDN 或分析脚本；模型服务与插件的网络访问属于桌面应用。
