# Context Doctor

English | [中文](context-doctor.zh.md)

Application snapshot version: `0.7.0`. Source: [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor).

## Problem addressed

As project instructions, skills, and MCP tools accumulate, users need to locate context costs, repeated instructions, and shadowed same-name skills.

## Usage

Expand Context Doctor beside an existing session's input, or ask the Agent to call `context_audit`. Inspect instruction chains, skill catalogs, tool schemas, and MCP groups. Review the files and sources behind suggestions before deciding to change them.

## Reason for default inclusion

A workbench that encourages plugin composition should also help users observe its costs. Audits support decisions about retention, trimming, and on-demand loading.

## Limits

Auditing itself is read-only. Token figures are estimates rather than billing records. Duplicate detection mainly identifies identical text; it cannot guarantee detection of semantic conflicts or establish that content has no value. Asking an Agent to implement a suggestion is a separate operation. Check paths and excerpts for sensitive information before sharing reports.
