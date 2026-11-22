/** PowerShell prompt installation and platform-specific terminal rendering setup. */
import { ENCODING_PREAMBLE } from '@deepseek-ai/dsh-pwsh-local'
import { CONTROLLED_PROMPT } from './sanitize.ts'

/** Emit the shared completion marker before the controlled PowerShell prompt. */
export const PWSH_PROMPT_SETUP =
  "function prompt { [Console]::Write([char]27 + ']133;D;' + [int]$LASTEXITCODE + [char]7); '" + CONTROLLED_PROMPT + "' }"

/** Disable the multi-pass PSReadLine rendering that ConPTY serializes into scrollback. */
export const PWSH_DISABLE_PSREADLINE = 'Remove-Module PSReadLine -ErrorAction SilentlyContinue; '

/**
 * Install UTF-8 output and the controlled prompt, retaining PSReadLine on POSIX.
 * @param platform Host platform; PSReadLine removal is Windows-only.
 * @returns The first submitted PowerShell command.
 */
export function pwshBootstrap(platform: NodeJS.Platform): string {
  return ENCODING_PREAMBLE + (platform === 'win32' ? PWSH_DISABLE_PSREADLINE : '') + PWSH_PROMPT_SETUP
}
