const V2_RESULT_PREFIX = 'VIDEO_PUBLISHER_V2_RESULT:';
const PLATFORM_URLS = {
  xiaohongshu: 'https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=video',
  douyin: 'https://creator.douyin.com/creator-micro/content/upload',
  bilibili: 'https://member.bilibili.com/platform/upload/video/frame?spm_id_from=333.1007.top_bar.upload',
  wechat_channels: 'https://channels.weixin.qq.com/platform/post/create',
  youtube: 'https://studio.youtube.com/',
};
const PLATFORM_HOSTS = {
  xiaohongshu: /creator\.xiaohongshu\.com/,
  douyin: /creator\.douyin\.com/,
  bilibili: /member\.bilibili\.com/,
  wechat_channels: /channels\.weixin\.qq\.com/,
  youtube: /studio\.youtube\.com|accounts\.google\.com/,
};
const FINAL_TEXT = /^(发布|发布笔记|发表|立即投稿|定时发布|定时发表)$/;
const YOUTUBE_FINAL_TEXT = /^(保存|发布|安排时间|定时发布|定时发表|Save|Publish|Schedule)$/i;
const FINAL_GUARD_KEY = '__VIDEO_PUBLISHER_FINAL_GUARD__';
let activeTaskSpace = null;
let taskSpaceRecovery = null;

const compactText = value => String(value || '').replace(/\s+/g, ' ').trim();
const unique = values => [...new Set((values || []).filter(Boolean))];

function typedBlocker(code, message, options = {}) {
  return {
    code,
    message,
    retryable: options.retryable === true,
    requiresUser: options.requiresUser === true,
    evidence: options.evidence || null,
  };
}

function okGate(evidence = {}, extra = {}) {
  return { ok: true, evidence, ...extra };
}

function failedGate(evidence = {}, extra = {}) {
  return { ok: false, evidence, ...extra };
}

async function selectTaskSpace() {
  const raw = String(taskSpaceRef || '').trim();
  const ref = raw && /^\d+$/.test(raw) ? Number(raw) : (raw || taskName);
  try {
    activeTaskSpace = await useOrCreateTaskSpace(ref);
    const identityMismatch = typeof ref === 'number'
      && Boolean(taskName)
      && Boolean(activeTaskSpace?.name)
      && activeTaskSpace.name !== taskName;
    if (identityMismatch) {
      const conflictingTaskSpace = activeTaskSpace;
      activeTaskSpace = await useOrCreateTaskSpace(taskName);
      taskSpaceRecovery = {
        recreated: true,
        reason: 'task_space_identity_mismatch',
        previousTaskSpaceId: ref,
        previousTaskSpaceName: conflictingTaskSpace.name,
        taskSpaceId: activeTaskSpace?.id ?? null,
        taskSpaceName: activeTaskSpace?.name || taskName,
      };
    }
  } catch (error) {
    const missingRecordedSpace = typeof ref === 'number' && /task space not found/i.test(String(error?.message || error));
    if (!missingRecordedSpace) throw error;
    activeTaskSpace = await useOrCreateTaskSpace(taskName);
    taskSpaceRecovery = { recreated: true, reason: 'task_space_not_found', previousTaskSpaceId: ref, taskSpaceId: activeTaskSpace?.id ?? null, taskSpaceName: activeTaskSpace?.name || taskName };
  }
  return activeTaskSpace;
}

async function selectPlatformTab() {
  const tabs = await listTabs();
  const match = tabs.find(tab => PLATFORM_HOSTS[platform].test(String(tab.url || '')));
  if (match) {
    await switchTab(match.targetId);
  } else {
    await openOrReuseTab(PLATFORM_URLS[platform], { wait: true, timeout: 45 });
  }
  await wait(1.5);
  const info = await pageInfo();
  if (info?.dialog) {
    return { ok: false, blocker: typedBlocker('STATE_AMBIGUOUS', `浏览器原生弹窗阻塞页面: ${info.dialog.message || 'unknown dialog'}`, { retryable: true, evidence: info.dialog }) };
  }
  if (!info || info.w < 300 || info.h < 300) {
    return { ok: false, blocker: typedBlocker('INPUT_CHANNEL_BROKEN', 'Ego Lite 页面视口不可用', { retryable: true, evidence: info }) };
  }
  return { ok: true, info };
}

async function armFinalPublishGuard() {
  const activeFinalText = platform === 'youtube' ? YOUTUBE_FINAL_TEXT : FINAL_TEXT;
  return await js(String.raw`((key, finalSource, finalFlags) => {
    const existing = window[key]
    if (existing?.version === 2 && typeof existing.guard === 'function') {
      document.addEventListener('click', existing.guard, true)
      document.addEventListener('submit', existing.guard, true)
      if (existing.armed !== true) existing.armedAt = new Date().toISOString()
      existing.armed = true
      existing.detached = false
      existing.detachedAt = null
      existing.detachVerified = false
      return { ok: true, armed: true, version: existing.version, armedAt: existing.armedAt, blockedAttempts: existing.blockedAttempts.length }
    }
    if (existing) {
      return { ok: false, armed: existing.armed === true, version: existing.version || null, legacyGuard: true, reason: 'legacy final-publish guard requires a user page reload before retry' }
    }
    const finalText = new RegExp(finalSource, finalFlags)
    const compact = value => String(value || '').replace(/\s+/g, ' ').trim()
    const state = { armed: true, version: 2, armedAt: new Date().toISOString(), detached: false, detachedAt: null, detachVerified: false, blockedAttempts: [], guard: null }
    const buttonLabel = element => {
      if (!(element instanceof Element)) return ''
      const buttonish = element.matches('button, input[type="submit"], [role="button"], .d-button, .bcc-button')
      if (!buttonish) return ''
      return compact(element.value || element.getAttribute('aria-label') || element.innerText || element.textContent || '')
    }
    const guard = event => {
      const candidates = [event.submitter, ...(typeof event.composedPath === 'function' ? event.composedPath() : []), event.target]
      const match = candidates.map(element => ({ element, label: buttonLabel(element) })).find(item => finalText.test(item.label))
      if (!match) return
      event.preventDefault()
      event.stopImmediatePropagation()
      state.blockedAttempts.push({ type: event.type, label: match.label, at: new Date().toISOString() })
    }
    state.guard = guard
    document.addEventListener('click', guard, true)
    document.addEventListener('submit', guard, true)
    window[key] = state
    return { ok: true, armed: true, version: state.version, armedAt: state.armedAt, blockedAttempts: 0 }
  })(${JSON.stringify(FINAL_GUARD_KEY)}, ${JSON.stringify(activeFinalText.source)}, ${JSON.stringify(activeFinalText.flags)})`);
}

async function inspectFinalPublishGuard() {
  return await js(String.raw`((key) => {
    const state = window[key]
    return {
      armed: state?.armed === true,
      detached: state?.detached === true,
      detachVerified: state?.detachVerified === true,
      version: state?.version || null,
      armedAt: state?.armedAt || null,
      detachedAt: state?.detachedAt || null,
      blockedAttempts: state?.blockedAttempts?.length || 0,
      attempts: state?.blockedAttempts?.slice?.(-5) || [],
    }
  })(${JSON.stringify(FINAL_GUARD_KEY)})`);
}

async function detachFinalPublishGuard() {
  const probeLabel = platform === 'youtube' ? 'Publish' : '发布';
  return await js(String.raw`((key, probeLabel) => {
    const state = window[key]
    if (state?.armed !== true || state.version !== 2 || typeof state.guard !== 'function') {
      return { ok: false, armed: state?.armed === true, detached: state?.detached === true, detachVerified: false, version: state?.version || null, reason: 'detachable armed guard missing' }
    }
    document.removeEventListener('click', state.guard, true)
    document.removeEventListener('submit', state.guard, true)
    const attemptsBefore = state.blockedAttempts.length
    let form = null
    let clickAllowed = false
    let submitAllowed = false
    let probeError = null
    try {
      form = document.createElement('form')
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = probeLabel
      form.style.display = 'none'
      form.appendChild(button)
      document.documentElement.appendChild(form)
      const clickEvent = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true })
      clickAllowed = button.dispatchEvent(clickEvent) && !clickEvent.defaultPrevented
      const submitEvent = typeof SubmitEvent === 'function'
        ? new SubmitEvent('submit', { bubbles: true, composed: true, cancelable: true, submitter: button })
        : new Event('submit', { bubbles: true, composed: true, cancelable: true })
      if (!('submitter' in submitEvent)) Object.defineProperty(submitEvent, 'submitter', { value: button })
      submitAllowed = form.dispatchEvent(submitEvent) && !submitEvent.defaultPrevented
    } catch (error) {
      probeError = String(error?.message || error)
    } finally {
      form?.remove()
    }
    const attemptsAfter = state.blockedAttempts.length
    const detachVerified = !probeError && clickAllowed && submitAllowed && attemptsAfter === attemptsBefore
    if (!detachVerified) {
      const probeBlockedAttempts = state.blockedAttempts.slice(attemptsBefore)
      state.blockedAttempts.splice(attemptsBefore)
      document.addEventListener('click', state.guard, true)
      document.addEventListener('submit', state.guard, true)
      state.armed = true
      state.detached = false
      state.detachVerified = false
      return { ok: false, armed: true, detached: false, detachVerified: false, version: state.version, clickAllowed, submitAllowed, attemptsBefore, attemptsAfter, probeBlockedAttempts, probeError, reason: 'listener detachment probe failed' }
    }
    state.armed = false
    state.detached = true
    state.detachedAt = new Date().toISOString()
    state.detachVerified = true
    const guardAfter = { armed: state.armed, detached: state.detached, detachVerified: state.detachVerified, version: state.version, detachedAt: state.detachedAt, blockedAttempts: state.blockedAttempts.length }
    return { ok: true, armed: false, detached: true, detachVerified: true, version: state.version, detachedAt: state.detachedAt, clickAllowed, submitAllowed, attemptsBefore, attemptsAfter, guardAfter }
  })(${JSON.stringify(FINAL_GUARD_KEY)}, ${JSON.stringify(probeLabel)})`);
}

function checkpointReceipts(receipts) {
  if (!receiptCheckpointPath || !jobFingerprint || !receipts || !Object.keys(receipts).length) {
    return { ok: false, skipped: true };
  }
  const payload = {
    schemaVersion: 2,
    platform,
    fingerprint: jobFingerprint,
    taskSpaceId: activeTaskSpace?.id ?? null,
    writtenAt: new Date().toISOString(),
    receipts,
  };
  fs.mkdirSync(path.dirname(receiptCheckpointPath), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(receiptCheckpointPath), 0o700);
  const temp = `${receiptCheckpointPath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, receiptCheckpointPath);
  fs.chmodSync(receiptCheckpointPath, 0o600);
  return { ok: true, path: receiptCheckpointPath, writtenAt: payload.writtenAt };
}

async function preparePlatform() {
  const task = await selectTaskSpace();
  const selected = await selectPlatformTab();
  if (!selected.ok) return { task, selected };
  const guard = await armFinalPublishGuard();
  if (!guard.ok || !guard.armed) {
    const legacyGuard = guard.legacyGuard === true;
    return {
      task,
      selected: {
        ok: false,
        blocker: typedBlocker(legacyGuard ? 'ACTION_FAILED' : 'INPUT_CHANNEL_BROKEN', legacyGuard
          ? '页面仍有旧版最终发布保护；请等待本次任务停止后手动刷新页面，再沿用原 Job 重试'
          : '最终发布按钮硬保护无法挂载', { retryable: !legacyGuard, requiresUser: legacyGuard, evidence: guard }),
      },
    };
  }
  return { task, selected, guard };
}

async function pageRootsState() {
  return await js(String.raw`(() => {
    const compact = value => String(value || '').replace(/\s+/g, ' ').trim()
    const roots = [document, ...[...document.querySelectorAll('*')].map(el => el.shadowRoot).filter(Boolean)]
    const text = roots.map(root => root.body?.innerText || root.host?.innerText || '').join('\n')
    return { url: location.href, title: document.title, text: compact(text), rootCount: roots.length }
  })()`);
}

async function inspectFinalButtons(labels = FINAL_TEXT) {
  return await js(String.raw`((source, flags) => {
    const re = new RegExp(source, flags)
    const compact = value => String(value || '').replace(/\s+/g, ' ').trim()
    const roots = [document, ...[...document.querySelectorAll('*')].map(el => el.shadowRoot).filter(Boolean)]
    return roots.flatMap(root => [...root.querySelectorAll('button, [role="button"], .d-button, .bcc-button, div, span')])
      .map(el => {
        const rect = el.getBoundingClientRect(); const style = getComputedStyle(el)
        const text = compact(el.innerText || el.textContent || '')
        const buttonish = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || /button|btn|submit/i.test(String(el.className || ''))
        return { text, disabled: Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true' || /disabled|loading/.test(String(el.className || '')), buttonish, width: Math.round(rect.width), height: Math.round(rect.height), display: style.display, visibility: style.visibility }
      })
      .filter(item => re.test(item.text) && item.width > 12 && item.height > 12 && item.display !== 'none' && item.visibility !== 'hidden')
      .sort((a, b) => Number(b.buttonish) - Number(a.buttonish) || (a.width * a.height) - (b.width * b.height))
  })(${JSON.stringify(labels.source)}, ${JSON.stringify(labels.flags)})`);
}

async function inspectBlockingDialogs(allowPatterns = []) {
  return await js(String.raw`((allowSources) => {
    const compact = value => String(value || '').replace(/\s+/g, ' ').trim()
    const allowed = allowSources.map(source => new RegExp(source))
    const roots = [document, ...[...document.querySelectorAll('*')].map(el => el.shadowRoot).filter(Boolean)]
    const selectors = '.d-modal-mask, .semi-modal-mask, .bcc-dialog, .bcc-modal, [role="dialog"], [class*="modal-mask"], [class*="dialog-mask"]'
    return roots.flatMap(root => [...root.querySelectorAll(selectors)])
      .map(el => {
        const rect = el.getBoundingClientRect(); const style = getComputedStyle(el)
        const text = compact(el.innerText || el.textContent || '')
        const staleLeaving = /leave-active/.test(String(el.className || '')) && Number(style.opacity) === 0
        return { text: text.slice(0, 600), className: String(el.className || ''), width: rect.width, height: rect.height, opacity: style.opacity, pointerEvents: style.pointerEvents, display: style.display, visibility: style.visibility, staleLeaving }
      })
      .filter(item => item.width > 20 && item.height > 20 && item.display !== 'none' && item.visibility !== 'hidden' && !item.staleLeaving)
      .filter(item => !allowed.some(re => re.test(item.text)))
  })(${JSON.stringify(allowPatterns.map(pattern => pattern.source))})`);
}

async function setNativeInputValue(selector, value) {
  return await js(String.raw`((selector, value) => {
    const el = document.querySelector(selector)
    if (!el) return { ok: false, reason: 'input missing', selector }
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (!setter) return { ok: false, reason: 'native value setter missing' }
    el.focus(); setter.call(el, value)
    el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: value }))
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    el.blur()
    return { ok: el.value === value, value: el.value }
  })(${JSON.stringify(selector)}, ${JSON.stringify(value)})`);
}

async function removeExactStaleMask(textPattern) {
  return await js(String.raw`((source, flags) => {
    const re = new RegExp(source, flags)
    const masks = [...document.querySelectorAll('.d-modal-mask, [class*="modal-mask"]')]
      .filter(el => re.test(el.innerText || el.textContent || ''))
      .filter(el => /leave-active/.test(String(el.className || '')) && Number(getComputedStyle(el).opacity) === 0)
    masks.forEach(el => el.remove())
    return { removed: masks.length }
  })(${JSON.stringify(textPattern.source)}, ${JSON.stringify(textPattern.flags)})`);
}

async function emitObservation(observation) {
  const guard = await inspectFinalPublishGuard().catch(error => ({
    armed: false,
    blockedAttempts: 0,
    error: String(error?.message || error),
  }));
  const payload = {
    schemaVersion: 1,
    platform,
    phase,
    taskSpaceId: activeTaskSpace?.id ?? null,
    taskSpace: activeTaskSpace?.name || taskName,
    taskSpaceRecovery,
    observedAt: new Date().toISOString(),
    finalPublishClicked: false,
    ...observation,
  };
  payload.gates ||= {};
  const safetyEvidence = {
    finalPublishClicked: false,
    guardArmed: guard.armed === true,
    blockedAttempts: guard.blockedAttempts || 0,
    attempts: guard.attempts || [],
    guardVersion: guard.version || null,
    handoffCommitted: false,
    guardDetached: false,
    detachVerified: false,
  };
  payload.gates.safety = guard.armed === true && guard.blockedAttempts === 0
    ? okGate(safetyEvidence)
    : failedGate(safetyEvidence);
  const handoffCandidate = ['inspect', 'verify'].includes(phase)
    && !payload.blocker
    && requiredGateNames.every(name => payload.gates[name]?.ok === true);
  if (handoffCandidate) {
    let detach = null;
    let detachedGuard = null;
    let detachError = null;
    try {
      detach = await detachFinalPublishGuard();
      detachedGuard = detach?.guardAfter || null;
    } catch (error) {
      detachError = String(error?.message || error);
    }
    const handoffCommitted = detach?.ok === true
      && detach.detached === true
      && detach.detachVerified === true
      && detachedGuard?.armed === false
      && detachedGuard?.detached === true
      && detachedGuard?.detachVerified === true;
    Object.assign(safetyEvidence, {
      handoffCommitted,
      guardDetached: handoffCommitted,
      detachVerified: handoffCommitted,
      detachedAt: detachedGuard?.detachedAt || detach?.detachedAt || null,
      detach,
      detachedGuard,
      detachError,
    });
    if (!handoffCommitted) {
      const rollback = await armFinalPublishGuard().catch(error => ({ ok: false, error: String(error?.message || error) }));
      const failureDetail = [detachError, rollback?.error].filter(Boolean).join(' | ');
      const userControl = /user (?:has|had) taken control|user took control|user is controlling|user controls|用户.*控制|not assigned to an agent|task space.*inactive/i.test(failureDetail);
      const blockerCode = userControl ? 'USER_CONTROL' : failureDetail ? 'INPUT_CHANNEL_BROKEN' : 'ACTION_FAILED';
      safetyEvidence.rollback = rollback;
      payload.gates.safety = failedGate(safetyEvidence);
      payload.blocker = typedBlocker(blockerCode, userControl
        ? '最终发布按钮移交期间用户接管了任务空间'
        : blockerCode === 'INPUT_CHANNEL_BROKEN'
          ? '最终发布按钮移交期间 Ego Lite 通道中断'
          : '最终发布按钮保护无法安全移交给用户', {
        retryable: !userControl,
        requiresUser: userControl,
        evidence: { detach, detachedGuard, detachError, rollback },
      });
    }
  }
  delete payload.ready;
  cliLog(V2_RESULT_PREFIX + JSON.stringify(payload));
  return payload;
}
