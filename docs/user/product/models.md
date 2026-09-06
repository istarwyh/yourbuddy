# Connect a model

English | [中文](models.zh.md)

Choose the account or provider that fits your task.

## GPT Auth

Open Settings → GPT Auth, inspect login state, and follow the login flow. Choose an available Codex model in the model selector. [Codex Auth](plugins/codex-auth.md) is a community integration using an unofficial account interface; account availability and quota apply. It reuses native Codex login storage.

## API providers

Open Settings → Model, select Add provider, or enter DeepSeek credentials in its card. Select the provider and model, then send a simple text request. Credentials configured in another DSH environment are not automatically YourHarness credentials.

## Custom endpoints

Choose Add custom provider for a company gateway or compatible local service. Supply its provider ID, base URL, protocol, credentials, and model. Declared image and tool capabilities must match the actual endpoint. The [detailed provider reference](../guide/providers.md) explains modality declarations and protocol settings.

## Check the active selection

Changing an API model takes effect on the next request. Check the session's selection before comparing results. A Codex Agent Preset enables delegation; it is distinct from selecting the model for the parent conversation.

Keep secrets out of conversations and screenshots. If a request fails, check the account, selected model, quota, and [network settings](settings.md).
