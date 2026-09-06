# Agent Note: Preserve external product snapshot bytes

Status: implemented

English | [中文](2026-09-06-preserve-external-product-snapshot-bytes.zh.md)

## Problem

Product refresh records a tree digest before a reviewed external package is committed. The repository-wide text attribute previously converted CRLF files to LF when Git stored them, so local validation could pass against the extracted package while a clean release checkout failed against different bytes.

## Decision

Every external product snapshot directory that carries `YOURBUDDY_UPSTREAM.json` is explicitly marked `-text -whitespace` in the root `.gitattributes`. Git therefore stores and checks out the exact reviewed package bytes, including upstream line endings, and `treeSha256` remains reproducible in a clean checkout. First-party product files and the product policy and lock files retain the repository-wide LF rule.

Adding another external product snapshot requires adding its directory to the attribute list in the same change. Release preparation continues to verify every recorded tree digest before packaging.

## Alternatives considered

**Normalize text before hashing.** This would make CRLF and LF trees share a digest and could hide an unreviewed line-ending change. The snapshot digest is intended to cover exact packaged bytes.

**Record the post-Git LF digest.** The refresh process validates the staged extracted package before Git stores it, so this would make the new snapshot fail its own validation and would leave the source archive digest disconnected from the reviewed tree.

## Consequences

Clean checkouts and refresh worktrees now hash the same external product bytes, while first-party files remain normalized to LF. The explicit directory list is a small maintenance obligation, but it also prevents unrelated product configuration from opting out of repository text normalization.
