# Ego Browser

English | [中文](ego-browser.zh.md)

Application snapshot version: `0.8.5`. Source: [Fisfzy/dsh-ego-browser](https://github.com/Fisfzy/dsh-ego-browser).

## Problem addressed

Agents can operate a real Chromium browser through focused `ego_*` tools while the user watches the active page and takes over interaction when needed.

## Usage

Ego Browser is included in YourBuddy and uses Better Sidebar for its Agent Browser tab. Ask the agent to open or operate a website; the tab shows the live browser when the first browser tool starts. The plugin can also use a floating watch panel when Better Sidebar is unavailable. A compatible Chrome, Chromium, Brave, or Edge installation must be available on the machine.

## Reason for default inclusion

It makes login-dependent and dynamically rendered websites usable from the workbench while keeping browser activity visible for human review and intervention.

## Delivery choice and trade-offs

YourBuddy ships a reviewed `dsh-ego-browser` plugin snapshot instead of running `dsh plugin --profile web add git+https://github.com/Fisfzy/ego-browser.git` during startup. YourBuddy uses an isolated application home rather than the user's `~/.dsh`, and a startup Git installation would require GitHub access, resolve a branch that can change between launches, and run dependency installation or build work on the user's machine. The bundled snapshot pins the package version, Git commit, archive integrity, peer metadata, and offline lockfile so a cold start remains reproducible and does not need npm or GitHub.

This choice adds approximately 317 KB of compressed plugin payload and 1.2 MB before application-level compression; it does not bundle Chromium or optional FFmpeg downloads. Updates arrive with YourBuddy releases instead of immediately following upstream, so each Ego Browser or Harness upgrade must repeat compatibility and browser smoke checks. A user-installed active `dsh-ego-browser` Web Profile bundle takes precedence over the uniquely named in-box fallback, allowing independent updates at the cost of returning package selection and compatibility to the user.

## Limits

Browser automation can encounter login expiry, human-verification challenges, download restrictions, and site-specific controls. Taking over the browser does not grant the agent permission to publish, purchase, or perform another consequential action without the user's instruction. Websites and browser profiles may contain sensitive account data, so review the active page and account before continuing.
