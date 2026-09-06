const SENSITIVE_ASSIGNMENT_NAMES = [
  'authorization', 'cookie', 'cookies', 'token', 'auth[_-]?token',
  'access[_-]?token', 'refresh[_-]?token', 'session[_-]?token',
  'api[_-]?key', 'access[_-]?key', 'client[_-]?secret', 'secret',
  'secret[_-]?key', 'secret[_-]?access[_-]?key', 'private[_-]?key',
  'password', 'passwd',
].join('|')

// Environment variables commonly namespace a sensitive suffix, for example
// OPENAI_API_KEY, MY_ACCESS_TOKEN, or AWS_SECRET_ACCESS_KEY. Keep each namespace
// segment unambiguous and bound the segment count: an unbounded repetition whose
// inner token could also consume "-" caused catastrophic backtracking on benign
// hyphenated text.
const SENSITIVE_ASSIGNMENT_KEY = `(?:[A-Za-z][A-Za-z0-9]*[_-]){0,16}(?:${SENSITIVE_ASSIGNMENT_NAMES})`
const ASSIGNMENT_VALUE = new RegExp(
  `(^|[^A-Za-z0-9_])(["'\`]?)(${SENSITIVE_ASSIGNMENT_KEY})\\2\\s*[:=][^\\r\\n]*`,
  'gim',
)
const ASSIGNMENT_VALUE_TEST = new RegExp(
  `(^|[^A-Za-z0-9_])(["'\`]?)(${SENSITIVE_ASSIGNMENT_KEY})\\2\\s*[:=]`,
  'im',
)
const QUOTED_AUTH_VALUE = /(["'`])(Bearer|Basic)\s+[^\r\n]*/gi
const AUTH_VALUE = /\b(Bearer|Basic)\s+[^\s,;"'`<>]+/gi
const AUTH_VALUE_TEST = /\b(?:Bearer|Basic)\s+(?:["'`]|[^\s,;"'`<>])/i
const URL_USERINFO_VALUE = /\b([A-Za-z][A-Za-z0-9+.-]{0,31}:\/\/)(?!\[REDACTED[^\]]*\]@)([^/\s?#@"'`<>]+)@/gi
const URL_USERINFO_VALUE_TEST = /\b[A-Za-z][A-Za-z0-9+.-]{0,31}:\/\/(?!\[REDACTED[^\]]*\]@)[^/\s?#@"'`<>]+@/i
const POSIX_LOCAL_PATH = /(?<![A-Za-z0-9:/])\/(?:[^/\r\n"'`<>,;]+\/)+[^/\r\n"'`<>,;]*|(?<![A-Za-z0-9:/])\/[A-Za-z0-9._~+-]+(?=$|[\s"'`<>,;])/g
const POSIX_LOCAL_PATH_TEST = /(?<![A-Za-z0-9:/])\/(?:[^/\r\n"'`<>,;]+\/)+[^/\r\n"'`<>,;]*|(?<![A-Za-z0-9:/])\/[A-Za-z0-9._~+-]+(?=$|[\s"'`<>,;])/
const WINDOWS_LOCAL_PATH = /(?:\b[A-Za-z]:\\|\\\\)[^\r\n"'`<>,;]*/g
const WINDOWS_LOCAL_PATH_TEST = /(?:\b[A-Za-z]:\\|\\\\)[^\r\n"'`<>,;]*/
const SENSITIVE_CONTAINER_KEY = /authorization|cookie|token|api[_-]?key|secret|password|request[_-]?headers/i
const SENSITIVE_CONTAINER_SUFFIXES = [
  /headers?$/,
  /headermaps?$/,
  /env$/,
  /env(?:vars?|maps?)$/,
  /environment$/,
  /environment(?:variables?|vars?|maps?)$/,
  /credentials?$/,
  /credentials?(?:maps?|stores?|values?)$/,
]

const OPAQUE_SECRET_RULES = [
  {
    kind: 'pem',
    // No footer is still sensitive: fail closed from the BEGIN line through
    // the end of the string instead of returning a truncated private key.
    pattern: /-----BEGIN [^-\r\n]{1,80}-----[\s\S]*?(?:-----END [^-\r\n]{1,80}-----|$)/gi,
  },
  {
    kind: 'token',
    pattern: /\b(?:sk|rk|pk)-(?:proj-)?[A-Za-z0-9_-]{12,}\b|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b|\bxox[a-z]?-[A-Za-z0-9-]{10,}\b/gi,
  },
  {
    kind: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g,
  },
  {
    kind: 'aws',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
]

function replacementFor(replacement, kind) {
  return typeof replacement === 'function' ? replacement(kind) : replacement
}

export function isSensitiveCredentialContainerKey(value) {
  const key = String(value ?? '')
  if (SENSITIVE_CONTAINER_KEY.test(key)) return true
  const canonical = key.replace(/[^A-Za-z0-9]/g, '').toLowerCase()
  return SENSITIVE_CONTAINER_SUFFIXES.some(pattern => pattern.test(canonical))
}

export function redactCredentialTextWithCount(value, replacement = '[REDACTED]', preserveKey = true) {
  let replacements = 0
  let text = String(value ?? '').replace(
    ASSIGNMENT_VALUE,
    (_match, prefix, quote, key) => {
      replacements += 1
      return preserveKey ? `${prefix}${quote}${key}${quote}=${replacement}` : `${prefix}${replacement}`
    },
  )
  text = text.replace(QUOTED_AUTH_VALUE, (_match, quote, scheme) => {
    replacements += 1
    return preserveKey ? `${quote}${scheme} ${replacement}${quote}` : replacement
  })
  text = text.replace(AUTH_VALUE, (_match, scheme) => {
    replacements += 1
    return preserveKey ? `${scheme} ${replacement}` : replacement
  })
  text = text.replace(URL_USERINFO_VALUE, (_match, scheme) => {
    replacements += 1
    return preserveKey ? `${scheme}${replacement}@` : scheme
  })
  return { text, replacements }
}

export function redactCredentialText(value, replacement = '[REDACTED]') {
  return redactCredentialTextWithCount(value, replacement).text
}

export function containsCredentialText(value) {
  const text = String(value ?? '')
  return ASSIGNMENT_VALUE_TEST.test(text) || AUTH_VALUE_TEST.test(text) || URL_USERINFO_VALUE_TEST.test(text)
}

export function redactOpaqueSecretTextWithCount(value, replacement = '[REDACTED]') {
  let text = String(value ?? '')
  let replacements = 0
  for (const rule of OPAQUE_SECRET_RULES) {
    text = text.replace(rule.pattern, () => {
      replacements += 1
      return replacementFor(replacement, rule.kind)
    })
  }
  return { text, replacements }
}

export function redactOpaqueSecretText(value, replacement = '[REDACTED]') {
  return redactOpaqueSecretTextWithCount(value, replacement).text
}

export function containsOpaqueSecretText(value) {
  const text = String(value ?? '')
  return OPAQUE_SECRET_RULES.some(rule => {
    rule.pattern.lastIndex = 0
    const matched = rule.pattern.test(text)
    rule.pattern.lastIndex = 0
    return matched
  })
}

export function redactLocalPathsWithCount(value, replacement = '[local path]') {
  let replacements = 0
  let text = String(value ?? '').replace(POSIX_LOCAL_PATH, () => {
    replacements += 1
    return replacement
  })
  text = text.replace(WINDOWS_LOCAL_PATH, () => {
    replacements += 1
    return replacement
  })
  return { text, replacements }
}

export function redactLocalPaths(value, replacement = '[local path]') {
  return redactLocalPathsWithCount(value, replacement).text
}

export function containsLocalPath(value) {
  const text = String(value ?? '')
  return POSIX_LOCAL_PATH_TEST.test(text) || WINDOWS_LOCAL_PATH_TEST.test(text)
}
