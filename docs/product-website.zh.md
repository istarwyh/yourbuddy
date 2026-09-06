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

公开正文位于 [docs/user/product/](user/product/index.zh.md)，每页维护英文、中文和翻译记录。首页区块由同目录下的 [home-data/zh.json](user/product/home-data/zh.json) 与 [home-data/en.json](user/product/home-data/en.json) 提供；这是首页短文案的来源。新增页面登记到 [product-pages.json](../website/product-pages.json)，正文继续使用仓库相对链接。主题配置与样式位于 [website/product/](../website/product/)，构建生成物不入库。

首页呈现由[项目模板](../website/product/layouts/_partials/yourbuddy/)与[项目样式](../website/product/assets/scss/_styles_project.scss)负责。区块数据供应首页 HTML，可搜索的指南及其 Markdown 导出来自仓库正文。双语内容一起维护；任务示例须明确标注，并与入门指南保持一致；浅色和深色均须清晰可读。不要编辑缓存中的主题模块。

## 构建与验证

```sh
pnpm website:check
pnpm docs:check
pnpm doc-sync
pnpm lint
```

官网检查包括投影测试、严格 Hugo 构建、产物内部链接、页面锚点与资源检查。SDK 的独立构建检查保留。官网产物位于 `website/product/.dist/`，含双语 HTML、逐页 Markdown、搜索索引、`llms.txt`、章节全文和导航 JSON。[官网工作流](../.github/workflows/product-site.yml)上传可审查产物，并将检查通过的 `master` 构建发布到 GitHub Pages。

用完整且以斜杠结尾的 `PRODUCT_SITE_BASE_URL` 设置部署地址；子路径同时参与正文、导航与资源 URL 的构建。未指定时使用本地地址，发布前必须重建。主题由 [go.mod](../website/product/go.mod) 与 [go.sum](../website/product/go.sum) 固定；不要直接跟随主题主分支。

## GitHub Pages

官网地址为 [istarwyh.github.io/yourbuddy](https://istarwyh.github.io/yourbuddy/)。仓库 Pages 设置使用 **GitHub Actions** 作为构建来源。工作流读取 Pages 基础 URL，带上该前缀构建并检查网站，再通过 `github-pages` 环境部署已验证的产物。仅部署 Job 获得 `pages: write` 和 `id-token: write`；工作流不保存个人访问令牌。

`master` 上的网站输入变更会触发发布。如需在不改源码时重新发布，可在 GitHub Actions 中选择 `master` 手动运行 **YourBuddy website**。PR 和其他分支上的手动运行只生成预览产物。同一分支的更新串行运行，构建失败时线上网站保持不变。

## 下载信息与发布

[下载页](user/product/download.zh.md)与[版本页](user/product/releases.zh.md)只描述已核验的公开发行。核验记录：2026-09-06，GitHub 公开发行仍为 XiaoHui 品牌，YourBuddy 0.3.0 尚无公开安装包。发布 YourBuddy 后，核验发行资产、校验和、架构与更新元数据，再同步双语正文和首页安装状态。不能仅根据源码版本号构造下载链接。

网站部署不发布桌面安装包。网站使用 GitHub Pages 域名，不依赖在线字体、CDN 或分析脚本；模型服务与插件的网络访问属于桌面应用。
