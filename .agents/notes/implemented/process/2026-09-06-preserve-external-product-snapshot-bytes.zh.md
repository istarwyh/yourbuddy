# Agent Note: 保留外部产品快照字节

Status: implemented

[English](2026-09-06-preserve-external-product-snapshot-bytes.md) | 中文

## Problem

产品刷新会在经过审查的外部 Package 提交前记录目录摘要。仓库级文本属性此前会在 Git 存储 CRLF 文件时把它转换为 LF，因此本地验证可能针对解压后的 Package 通过，而干净发布 Checkout 会针对不同字节失败。

## Decision

根目录 `.gitattributes` 会把每个带有 `YOURBUDDY_UPSTREAM.json` 的外部产品快照目录显式标记为 `-text -whitespace`。Git 因而会存储并检出经过审查的准确 Package 字节，包括上游换行符；`treeSha256` 也可以在干净 Checkout 中复现。第一方产品文件以及产品 Policy 和 Lockfile 继续使用仓库级 LF 规则。

新增外部产品快照时，必须在同一次变更中把其目录加入属性列表。发布准备仍会在打包前验证每个已记录的目录摘要。

## Alternatives considered

**哈希前规范化文本。** 这样会让 CRLF 和 LF 目录共享一个摘要，并可能隐藏未经审查的换行符变更。快照摘要需要覆盖准确的打包字节。

**记录 Git 存储后的 LF 摘要。** 刷新过程会在 Git 存储前验证暂存的解压 Package，因此这种做法会让新快照无法通过自身验证，也会让源 Archive 摘要与经过审查的目录脱节。

## Consequences

干净 Checkout 与刷新 Worktree 现在会对相同的外部产品字节计算哈希，而第一方文件仍会规范化为 LF。显式目录列表带来少量维护成本，但也能避免无关产品配置退出仓库文本规范化。
