// 版本自查：问 npm registry 上最新发布的是哪个版本，和本地 package.json 比一比。
// registry 慢或挂了就安静地失败，不挡工作台加载。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const VERSION_URLS = [
  'https://registry.npmjs.org/dsh-media-desk/latest',
  'https://registry.npmmirror.com/dsh-media-desk/latest',
]
const FETCH_TIMEOUT_MS = 8_000
// 成功的结果放一小时，失败半分钟后可以再问；别让离线时的每次刷新都去撞墙
const TTL_MS = 60 * 60 * 1000
const RETRY_MS = 30 * 1000

const CHANNEL_RANK = { alpha: 1, beta: 2, rc: 3 }

/** 解析 x.y.z 或 x.y.z-rc.n；解析不了返回 null。 */
export function parseVersion(text) {
  if (typeof text !== 'string') return null
  const found = /^v?(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)(?:\.(\d+))?)?(?:\+[0-9a-z.-]+)?$/i.exec(text.trim())
  if (!found) return null
  return {
    major: Number(found[1]),
    minor: Number(found[2]),
    patch: Number(found[3]),
    rank: found[4] ? CHANNEL_RANK[found[4].toLowerCase()] : 4,
    serial: found[5] ? Number(found[5]) : 0,
  }
}

/** latest 是不是比 current 新；任一版本号解析不了都当作没有新版本。 */
export function isNewerRelease(latest, current) {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  if (!a || !b) return false
  if (a.major !== b.major) return a.major > b.major
  if (a.minor !== b.minor) return a.minor > b.minor
  if (a.patch !== b.patch) return a.patch > b.patch
  if (a.rank !== b.rank) return a.rank > b.rank
  return a.serial > b.serial
}

/** 本地 package.json 里的版本；读不到就返回 null，界面上不显示版本号。 */
export function currentVersion() {
  try {
    const file = fileURLToPath(new URL('../package.json', import.meta.url))
    const version = JSON.parse(readFileSync(file, 'utf8')).version
    return typeof version === 'string' ? version : null
  } catch {
    return null
  }
}

async function fetchVersion(url, fetchImpl) {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, { signal: abort.signal, headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const body = await res.json()
    return typeof body?.version === 'string' ? body.version : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 版本检查器。read() 给出 { current, latest, updateAvailable, failed, checkedAt, ready }。
 * 两个 registry 依次试，先成功的算数；同一时刻只发一轮请求。
 */
export function createVersionCheck({ fetchImpl = fetch, now = Date.now } = {}) {
  const current = currentVersion()
  let latest = null
  let failed = false
  let checkedAt = null
  let inflight = null

  const stale = () => checkedAt === null || now() - checkedAt >= (failed ? RETRY_MS : TTL_MS)

  function snapshot() {
    return {
      ready: checkedAt !== null,
      current,
      latest,
      updateAvailable: latest !== null && current !== null ? isNewerRelease(latest, current) : null,
      failed,
      checkedAt: checkedAt === null ? null : new Date(checkedAt).toISOString(),
    }
  }

  async function refresh() {
    let value = null
    for (const url of VERSION_URLS) {
      value = await fetchVersion(url, fetchImpl)
      if (value !== null) break
    }
    failed = value === null
    // 查询失败时保留上次拿到的版本，别让已经提示过的更新闪没了
    if (value !== null) latest = value
    checkedAt = now()
  }

  async function read() {
    if (stale()) {
      if (!inflight) inflight = refresh().finally(() => { inflight = null })
      await inflight
    }
    return snapshot()
  }

  return { read }
}
