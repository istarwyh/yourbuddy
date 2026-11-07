/** Account choice inside the model credential onboarding step. */
import { useEffect, useLayoutEffect } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type { AccountSectionInjected } from './AccountSection.tsx'
import { SignInDialog } from './SignInDialog.tsx'

/**
 * @param props - onboarding completion, visible takeover, account state and actions.
 * @returns account dialog while signed out; no takeover while account state is loading.
 */
export function AccountOnboarding({ complete, takeOver, useApiKey, useAccount, useTheme, setOnboarding, showLogin, start, cancel, t }:
  PropsRuntime<'settings.models.sign-in'> & PropsLocale<'settings.account'> & InjectFace<AccountSectionInjected>) {
  const account = useAccount(value => value)
  const colorScheme = useTheme(snapshot => snapshot.active.colorScheme)
  const visible = account.view !== undefined && account.view.status !== 'credential-stored'
  useLayoutEffect(() => { if (visible) takeOver() }, [visible, takeOver])
  useEffect(() => { setOnboarding(true); return () => { setOnboarding(false) } }, [setOnboarding])
  useEffect(() => { if (account.view?.status === 'credential-stored') complete() }, [account.view?.status, complete])
  if (!visible) return null
  return <SignInDialog account={account} colorScheme={colorScheme} start={start} cancel={cancel} t={t}
    close={() => { showLogin(false); complete() }} useApiKey={() => { showLogin(false); useApiKey() }} />
}
