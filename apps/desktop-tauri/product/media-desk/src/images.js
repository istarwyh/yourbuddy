// 开放式生图接入：任何兼容 OpenAI Images API 的服务都能用，由用户自己填地址、模型和密钥。
import { assertPublicUrl } from './harvest.js'
import { tr } from './i18n.js'

const TIMEOUT_MS = 300_000
const MAX_IMAGE_BYTES = 40_000_000

function extensionOf(buffer) {
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return '.png'
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return '.jpg'
  if (buffer.length > 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return '.webp'
  if (buffer.length > 6 && buffer.toString('latin1', 0, 3) === 'GIF') return '.gif'
  return null
}

/** 两种后端共用相同的图片校验，工作台只保存真实且有界的图片内容。 */
export function imageBuffer(buffer) {
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error(tr('图片太大'))
  const ext = extensionOf(buffer)
  if (!ext) throw new Error(tr('返回的内容不是图片'))
  return { buffer, ext }
}

function redact(text, key) {
  const clean = String(text ?? '').slice(0, 300)
  return key ? clean.split(key).join('***') : clean
}

function explain(status, detail) {
  if (status === 401 || status === 403) return tr('密钥无效或没有这个模型的权限（{status}）', { status })
  if (status === 404) return tr('接口地址或模型不对（404）')
  if (status === 429) return tr('请求太频繁或额度不足（429）')
  return detail ? tr('生图服务返回 {status}：{detail}', { status, detail }) : tr('生图服务返回 {status}', { status })
}

/** 确定性的错误：重试多少次结果都一样，不该当成网络抖动。 */
function permanent(error) {
  error.permanent = true
  return error
}

/**
 * 网关回传的图片地址可能是完整链接，也可能只是一段相对路径（如 /v1/images/xxx/content），
 * 还可能挂在自定义前缀下：baseUrl 是 …/qwenimage/v1，路径却是 /v1/…。按几种拼法各列一个候选。
 * @param {string} raw - 返回里的 url 字段。
 * @param {string} baseUrl - 设置里的接口地址。
 * @returns {string[]} 去重后的候选地址，越靠前越可能对。
 */
export function imageUrlCandidates(raw, baseUrl) {
  const value = String(raw ?? '').trim()
  const list = []
  const add = (candidate) => {
    try {
      const url = new URL(candidate)
      if ((url.protocol === 'http:' || url.protocol === 'https:') && !list.includes(url.href)) list.push(url.href)
    } catch {
      // 拼不出来的候选直接跳过
    }
  }
  if (!value) return list
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    add(value)
    return list
  }
  let base
  try {
    base = new URL(String(baseUrl).replace(/\/+$/, '') + '/')
  } catch {
    return list
  }
  if (value.startsWith('//')) {
    add(`${base.protocol}${value}`)
    return list
  }
  const mount = base.pathname.replace(/\/+$/, '')
  if (value.startsWith('/')) {
    // 路径已经带上挂载前缀时原样用；否则先补上去掉版本号的前缀，再试补完整前缀，最后才试站点根
    const prefix = mount.replace(/\/v\d+$/i, '')
    const within = root => root && (value === root || value.startsWith(`${root}/`))
    if (!within(mount) && !within(prefix)) {
      if (prefix) add(`${base.origin}${prefix}${value}`)
      if (mount && mount !== prefix) add(`${base.origin}${mount}${value}`)
    }
    add(`${base.origin}${value}`)
  } else {
    add(new URL(value, base).href)
    add(new URL(value, `${base.origin}/`).href)
  }
  return list
}

/** 地址跟接口地址同源时，就是用户自己填的服务，不需要再拦内网，下载也带上同一个密钥。 */
function sameOrigin(href, baseUrl) {
  try {
    return new URL(href).origin === new URL(baseUrl).origin
  } catch {
    return false
  }
}

async function downloadImage(entry, image, fetchImpl, signal) {
  const candidates = imageUrlCandidates(entry.url, image.baseUrl)
  if (!candidates.length) throw permanent(new Error(tr('生图服务返回的图片地址无法识别：{url}', { url: String(entry.url).slice(0, 120) })))
  let last = null
  for (const href of candidates) {
    const trusted = sameOrigin(href, image.baseUrl)
    let url
    try {
      url = trusted ? new URL(href) : await assertPublicUrl(href)
    } catch (err) {
      last = permanent(err)
      continue
    }
    const download = await fetchImpl(url, { signal, ...(trusted && image.apiKey ? { headers: { authorization: `Bearer ${image.apiKey}` } } : {}) })
    if (!download.ok) {
      last = new Error(tr('下载图片失败（{status}）', { status: download.status }))
      last.retryable = download.status >= 500
      continue
    }
    return { buffer: Buffer.from(await download.arrayBuffer()), revisedPrompt: entry.revised_prompt }
  }
  throw last
}

async function requestOpenAI(image, prompt, fetchImpl, signal) {
  const extra = image.extra ? JSON.parse(image.extra) : {}
  const body = { model: image.model, prompt, n: 1, ...(image.size ? { size: image.size } : {}), ...(image.quality ? { quality: image.quality } : {}), ...extra }
  const res = await fetchImpl(`${image.baseUrl}/images/generations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${image.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const raw = await res.text()
  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    // 网关偶尔返回 HTML 错误页
  }
  if (!res.ok) {
    const error = new Error(explain(res.status, redact(data?.error?.message ?? data?.message ?? '', image.apiKey)))
    error.retryable = res.status >= 500
    throw error
  }
  // OpenAI 系放在 data[0]，部分国内服务放在 images[0]
  const entry = data?.data?.[0] ?? data?.images?.[0]
  if (entry?.b64_json) return { buffer: Buffer.from(entry.b64_json, 'base64'), revisedPrompt: entry.revised_prompt }
  if (entry?.url) return downloadImage(entry, image, fetchImpl, signal)
  const error = new Error(entry?.file_path ? tr('生图服务只返回了它本机的文件路径，没有可下载的地址') : tr('生图服务没有返回图片'))
  error.retryable = !data
  throw error
}

/** 用户可能贴完整端点、带 /api/v1 或只贴域名，统一归一成域名根。 */
function dashscopeRoot(baseUrl, patterns) {
  let root = String(baseUrl ?? '').trim().replace(/\/+$/, '')
  for (const pattern of patterns) root = root.replace(pattern, '')
  return root.replace(/\/api\/v1$/i, '')
}

/** 百炼同步生图端点（千问图像、万相 2.6/2.7 同步）。 */
export function bailianEndpoint(baseUrl) {
  const root = dashscopeRoot(baseUrl, [/\/api\/v1\/services\/aigc\/multimodal-generation\/generation$/i])
  return `${root}/api/v1/services/aigc/multimodal-generation/generation`
}

/** 万相异步任务提交端点（万相 2.5 及以下）。 */
export function wanSubmitEndpoint(baseUrl) {
  const root = dashscopeRoot(baseUrl, [/\/api\/v1\/services\/aigc\/text2image\/image-synthesis$/i, /\/api\/v1\/tasks\/[^/]+$/i])
  return `${root}/api/v1/services/aigc/text2image/image-synthesis`
}

/** 万相异步任务查询端点。 */
export function wanTaskEndpoint(baseUrl, taskId) {
  const root = dashscopeRoot(baseUrl, [/\/api\/v1\/services\/aigc\/text2image\/image-synthesis$/i, /\/api\/v1\/tasks\/[^/]+$/i])
  return `${root}/api/v1/tasks/${encodeURIComponent(taskId)}`
}

/** 百炼的尺寸格式是 宽*高；界面沿用 OpenAI 的 宽x高，发请求前转换。 */
function bailianSize(size) {
  const value = String(size ?? '').trim().replace(/[xX×]/g, '*').replace(/\s+/g, '')
  return /^\d+\*\d+$/.test(value) ? value : ''
}

async function requestBailian(image, prompt, fetchImpl, signal) {
  const parameters = {}
  const size = bailianSize(image.size)
  if (size) parameters.size = size
  if (image.extra) Object.assign(parameters, JSON.parse(image.extra))
  const body = {
    model: image.model,
    input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
    ...(Object.keys(parameters).length ? { parameters } : {}),
  }
  const res = await fetchImpl(bailianEndpoint(image.baseUrl), {
    method: 'POST',
    headers: { authorization: `Bearer ${image.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const raw = await res.text()
  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    // 网关偶尔返回 HTML 错误页
  }
  if (!res.ok) {
    const error = new Error(explain(res.status, redact(data?.message ?? data?.error?.message ?? '', image.apiKey)))
    error.retryable = res.status >= 500
    throw error
  }
  // 百炼可能在 200 里返回业务错误码
  if (data?.code) {
    const error = new Error(tr('百炼返回错误：{message}', { message: redact(data.message ?? data.code, image.apiKey) }))
    error.retryable = /Throttling|InternalError|ServiceUnavailable|RequestTimeOut/i.test(String(data.code))
    throw error
  }
  const content = data?.output?.choices?.[0]?.message?.content
  const url = Array.isArray(content) ? content.find(row => typeof row?.image === 'string' && row.image)?.image : null
  if (!url) throw new Error(tr('生图服务没有返回图片'))
  return downloadImage({ url }, image, fetchImpl, signal)
}

/** 等一会儿，期间可以被取消信号打断。 */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('cancelled'))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason ?? new Error('cancelled'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function wanError(data, image) {
  return redact(data?.message ?? data?.error?.message ?? data?.code ?? '', image.apiKey)
}

/** 万相异步：提交任务，轮询 task_id，成功后下载 results[].url。 */
async function requestWan(image, prompt, fetchImpl, signal, pollIntervalMs = 3000) {
  const extra = image.extra ? JSON.parse(image.extra) : {}
  const { negative_prompt: negativePrompt, ...parameterExtra } = extra
  const parameters = { n: 1 }
  const size = bailianSize(image.size)
  if (size) parameters.size = size
  Object.assign(parameters, parameterExtra)
  const input = { prompt, ...(typeof negativePrompt === 'string' && negativePrompt.trim() ? { negative_prompt: negativePrompt.trim() } : {}) }
  const submit = await fetchImpl(wanSubmitEndpoint(image.baseUrl), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${image.apiKey}`,
      'content-type': 'application/json',
      'x-dashscope-async': 'enable',
    },
    body: JSON.stringify({ model: image.model, input, parameters }),
    signal,
  })
  const submitRaw = await submit.text()
  let submitted = null
  try {
    submitted = JSON.parse(submitRaw)
  } catch {
    // 网关偶尔返回 HTML 错误页
  }
  if (!submit.ok) {
    const error = new Error(explain(submit.status, wanError(submitted, image)))
    error.retryable = submit.status >= 500
    throw error
  }
  if (submitted?.code) throw new Error(tr('万相返回错误：{message}', { message: wanError(submitted, image) || submitted.code }))
  const taskId = submitted?.output?.task_id
  if (!taskId) throw new Error(tr('万相没有返回任务 ID'))

  const startedAt = Date.now()
  let interval = Math.max(1, pollIntervalMs)
  let failures = 0
  for (;;) {
    await sleep(interval, signal)
    let res
    try {
      res = await fetchImpl(wanTaskEndpoint(image.baseUrl, taskId), {
        headers: { authorization: `Bearer ${image.apiKey}` },
        signal,
      })
    } catch (err) {
      if (signal?.aborted) throw err
      failures += 1
      if (failures >= 5) {
        const error = new Error(tr('查询万相任务失败：{message}', { message: err.message }))
        error.permanent = true
        throw error
      }
      continue
    }
    const raw = await res.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch {
      // 轮询偶尔会拿到非 JSON 的错误页
    }
    if (!res.ok) {
      if (res.status >= 500) {
        failures += 1
        if (failures >= 5) {
          const error = new Error(explain(res.status, wanError(data, image)))
          error.permanent = true
          throw error
        }
        continue
      }
      throw new Error(explain(res.status, wanError(data, image)))
    }
    failures = 0
    if (data?.code) throw new Error(tr('万相返回错误：{message}', { message: wanError(data, image) || data.code }))
    const output = data?.output
    const status = output?.task_status
    if (status === 'SUCCEEDED') {
      const results = Array.isArray(output.results) ? output.results : []
      const url = results.find(row => typeof row?.url === 'string' && row.url)?.url
      if (url) return downloadImage({ url }, image, fetchImpl, signal)
      const failed = results.find(row => row?.code || row?.message)
      throw new Error(tr('万相任务没有返回图片：{message}', { message: redact(failed?.message ?? failed?.code ?? '', image.apiKey) }))
    }
    if (status === 'FAILED') throw new Error(tr('万相任务失败：{message}', { message: wanError(output, image) || tr('未知原因') }))
    if (status === 'CANCELED') throw new Error(tr('万相任务已取消'))
    if (status === 'UNKNOWN') throw new Error(tr('万相任务不存在或已过期'))
    if (status !== 'PENDING' && status !== 'RUNNING') throw new Error(tr('万相任务状态异常：{status}', { status: String(status ?? '') }))
    if (Date.now() - startedAt > 30_000) interval = Math.max(interval, 10_000)
  }
}

async function requestOnce(image, prompt, fetchImpl, signal, options) {
  if (image.protocol === 'bailian') return requestBailian(image, prompt, fetchImpl, signal)
  if (image.protocol === 'wan') return requestWan(image, prompt, fetchImpl, signal, options.pollIntervalMs)
  return requestOpenAI(image, prompt, fetchImpl, signal)
}

/** new URL 解析失败也是 TypeError，但它不是网络问题。 */
function isUrlError(err) {
  return err?.code === 'ERR_INVALID_URL' || /Invalid URL/i.test(err?.message ?? '')
}

/**
 * 生成一张图。网关抖动时自动重试一次。
 * @param {object} image - 设置里的生图配置。
 * @param {string} prompt - 提示词。
 * @param {{fetchImpl?: typeof fetch, signal?: AbortSignal, pollIntervalMs?: number}} [options] - pollIntervalMs 只用于万相异步轮询。
 * @returns {Promise<{buffer: Buffer, ext: string}>} 图片内容和扩展名。
 */
export async function generateImage(image, prompt, { fetchImpl = fetch, signal, pollIntervalMs } = {}) {
  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const timeout = AbortSignal.timeout(TIMEOUT_MS)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
    try {
      const { buffer } = await requestOnce(image, prompt, fetchImpl, combined, { pollIntervalMs })
      return imageBuffer(buffer)
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err
      if (err.permanent || isUrlError(err)) break
      const network = err.name === 'TypeError' || err.name === 'TimeoutError'
      if (!err.retryable && !network) break
    }
  }
  const message = lastError.name === 'TimeoutError' ? tr('生图超时，可以重试') : isUrlError(lastError) ? tr('图片地址不对：{reason}', { reason: redact(lastError.message, image.apiKey) }) : lastError.name === 'TypeError' ? tr('连不上生图服务：{reason}', { reason: redact(lastError.cause?.code ?? lastError.message, image.apiKey) }) : redact(lastError.message, image.apiKey)
  throw new Error(message)
}

const COVER_STYLE = 'Editorial cover image, striking composition with calm negative space in the lower third, refined and cinematic, no text, no letters, no logo.'
const FIGURE_STYLE = 'Editorial article illustration, refined and consistent with a modern magazine, no text, no letters, no logo.'
const SHOT_STYLE = 'Film storyboard panel, black and white pencil line art sketch, loose confident lines, no color, plain white paper background, no text, no letters, no captions, no panel numbers.'

export function coverPrompt(prompt) {
  return `${COVER_STYLE} ${prompt}`
}

export function figurePrompt(prompt) {
  return `${FIGURE_STYLE} ${prompt}`
}

export function shotPrompt(prompt, characters) {
  return `${SHOT_STYLE} Widescreen 16:9 landscape framing, the scene fills the whole frame edge to edge, no borders. ${characters ? `Recurring characters and setting: ${characters}. ` : ''}${prompt}`
}
