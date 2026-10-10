/**
 * Native shell dictionaries for splash.html and shell.html.
 * Locale follows the OS language (zh* → zh, otherwise en).
 */
window.DSH_I18N = (function () {
  const zh = {
    'splash.bytes': '字节',
    'splash.download': '正在下载',
    'splash.retry': '正在重试下载',
    'splash.verify': '正在校验',
    'splash.unpack': '正在解压',
    'splash.retryAction': '重试启动',
    'splash.restarting': '正在重新启动…',
    'splash.copy': '复制诊断信息',
    'splash.copied': '已复制',
    'splash.copyFailed': '无法复制，请手动选择错误信息',
    'splash.bridgeError': '无法读取启动状态：',
    'splash.proxyHint': '若多次失败，请检查网络或代理后重试。已有安装与可续传数据会保留。',
    'splash.claim': '为你而来，也由你定义。',
    'splash.explanation': '基于 DSH，界面、模型、Skill、Plugin 与工作方式都可以按需更换、扩展。',
    'splash.promise': '每个人，都有自己的 Buddy。',
    'splash.preparing': '正在唤醒你的工作台…',
    'splash.failed': '启动失败',
    'shell.closeTitle': '关闭窗口',
    'shell.closeDesc': '下次将记住这个选择，可在托盘菜单里改回。',
    'shell.exit': '退出程序',
    'shell.minimizeTray': '最小化到托盘',
    'shell.cancel': '取消',
    'shell.min': '最小化',
    'shell.max': '最大化',
    'shell.close': '关闭',
  }
  const en = {
    'splash.bytes': 'bytes',
    'splash.download': 'Downloading',
    'splash.retry': 'Retrying download',
    'splash.verify': 'Verifying',
    'splash.unpack': 'Unpacking',
    'splash.retryAction': 'Retry startup',
    'splash.restarting': 'Restarting…',
    'splash.copy': 'Copy diagnostics',
    'splash.copied': 'Copied',
    'splash.copyFailed': 'Could not copy; select the error text manually',
    'splash.bridgeError': 'Could not read startup state: ',
    'splash.proxyHint': 'If it keeps failing, check your network or proxy and retry. Existing installations and resumable data are preserved.',
    'splash.claim': 'Made for you. Shaped by you.',
    'splash.explanation': 'Built on DSH, YourBuddy lets you change the interface, models, Skills, Plugins, and workflows around the way you work.',
    'splash.promise': 'Everyone gets a Buddy of their own.',
    'splash.preparing': 'Waking your workbench…',
    'splash.failed': 'Startup failed',
    'shell.closeTitle': 'Close window',
    'shell.closeDesc': 'This choice is remembered; change it later from the tray.',
    'shell.exit': 'Quit',
    'shell.minimizeTray': 'Minimize to tray',
    'shell.cancel': 'Cancel',
    'shell.min': 'Minimize',
    'shell.max': 'Maximize',
    'shell.close': 'Close',
  }

  function detect() {
    if (window.__DSH_LOCALE__ === 'zh' || window.__DSH_LOCALE__ === 'en') {
      return window.__DSH_LOCALE__
    }
    const tag = String(navigator.language || navigator.userLanguage || '')
    const primary = tag.split(/[-_]/)[0]
    return primary.toLowerCase() === 'zh' ? 'zh' : 'en'
  }

  function dict() {
    return detect() === 'zh' ? zh : en
  }

  function t(key) {
    const table = dict()
    return table[key] || zh[key] || key
  }

  function apply(root) {
    const locale = detect()
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    const scope = root || document
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n')
      if (key) el.textContent = t(key)
    })
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria')
      if (key) el.setAttribute('aria-label', t(key))
    })
  }

  return { detect, t, apply }
})()
