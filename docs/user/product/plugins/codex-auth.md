# Codex Auth

English | [中文](codex-auth.zh.md)

Application snapshot version: `0.3.2`. Source: [suntianc/dsh-codex-auth](https://github.com/suntianc/dsh-codex-auth).

## Problem addressed

One settings section combines Codex login state, available models, web search, and image generation, reducing repeated configuration across capabilities.

## Usage

Open Settings → GPT Auth, complete login, inspect account state, and select a usable Codex model. The desktop composition also registers search and image capabilities: search uses standard `web_search`; `generate_image` creates or edits images and saves them as session attachments. Image tool availability depends on model declarations, login, account status, and plugin settings.

## Reason for default inclusion

Existing Codex users can start with a familiar account and use the same authentication entry for research and image tasks. Other providers remain configurable.

## Limits

This is an unofficial account interface supplied by the community; upstream explicitly limits it to personal development. Interfaces, quota, and account availability can change. Available quota depends on the account and upstream service. It reuses native Codex authentication files; keyring-only storage without usable file credentials may require changing native login storage. Images persist in conversations, but the plugin currently offers no workspace image export action. Its long-context switch also does not guarantee increased backend capacity.
