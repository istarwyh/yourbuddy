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

## 构建与验证

```sh
pnpm website:check
pnpm docs:check
pnpm doc-sync
pnpm lint
```

官网检查包括投影测试、严格 Hugo 构建、产物内部链接、页面锚点与资源检查。SDK 的独立构建检查保留。官网产物位于 `website/product/.dist/`，含双语 HTML、逐页 Markdown、搜索索引、`llms.txt`、章节全文和导航 JSON。[构建工作流](../.github/workflows/product-site.yml)上传可审查产物，不发布网站。

用完整且以斜杠结尾的 `PRODUCT_SITE_BASE_URL` 设置部署地址；子路径同时参与正文、导航与资源 URL 的构建。未指定时使用本地地址，发布前必须重建。主题由 [go.mod](../website/product/go.mod) 与 [go.sum](../website/product/go.sum) 固定；不要直接跟随主题主分支。

## 下载信息与发布

[下载页](user/product/download.zh.md)与[版本页](user/product/releases.zh.md)只描述已核验的公开发行。核验记录：2026-09-06，GitHub 公开发行仍为 XiaoHui 品牌，YourBuddy 0.3.0 尚无公开安装包。发布 YourBuddy 后，核验发行资产、校验和、架构与更新元数据，再同步双语正文和首页安装状态。不能仅根据源码版本号构造下载链接。

公网托管、域名和部署凭据需要另行配置。当前构建不依赖在线字体、CDN 或分析脚本；模型服务与插件的网络访问属于桌面应用。
