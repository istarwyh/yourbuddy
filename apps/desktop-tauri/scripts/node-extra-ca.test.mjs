import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer as createProxyServer } from 'node:http'
import { createServer } from 'node:https'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// Test-only TLS material for loopback fixtures; no deployed service uses this key.
const TEST_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIDLzCCAhegAwIBAgIUfIy3JEnt/6B2JV1yo0EM7aJt5h4wDQYJKoZIhvcNAQEL
BQAwJzElMCMGA1UEAwwcWW91ckJ1ZGR5IFByb3h5IEZpeHR1cmUgUm9vdDAeFw0y
NjEwMTkxMzMyMzRaFw0zNjEwMTYxMzMyMzRaMCcxJTAjBgNVBAMMHFlvdXJCdWRk
eSBQcm94eSBGaXh0dXJlIFJvb3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQDDgKI6AY1EAEHT9LcGYYCeNilnPcDHWBDTikZJRcTwcdS2SP45f19m3DPT
PwVkv7VZfPvq9NfS/9crQMC9o1e5wOu9O3dYIMUhVekW0/J7U9XiKpaxyS+9m+7G
2jDlmJL+Uzp980MyhsRgMG+IjHG705lggVQ6neuNYvlGt0zOC4gjWzvrWXzlr5wa
7S9KxNqBKjYEM2rmgnB2gBkY6gBJqxcWMgl8sNpk5ly85J7Ugj3QAUQF2TG/LZMq
+r8Qpcsp/RjYh/SNzp2iqijVYFp4LxH5oQ3fsNxntQqDVQFMupzVppLQFormfXkl
8tGUI75EmYtcsirm+qRVfbq5kv4TAgMBAAGjUzBRMB0GA1UdDgQWBBTyYRo37H5B
EjtELLdd0fw1KFGL2jAfBgNVHSMEGDAWgBTyYRo37H5BEjtELLdd0fw1KFGL2jAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBto3rvPKtWhHTOOC1V
xZ5ijuujqQ43bqP1BumtLP3XmAiuMoRSRxnb9oYv1yhq3W/IE1M6Ww2kmDqycRkU
nTnie3EswBv52DCAjgfGjZ13m0BIPaOkz1Ai7Cb1fioWt3tyksPd3wIhjPDlMxvF
hIeb0eCmhb+72/kzR3GLh9eLjjNWWnTWHcONnZm/c4N0OE1thbRX+mHnd/DxnDUv
CeU03q1vlwtq+yYAca1tfk/cBF362jeI+F8oMmK6J2EO+qeoJx09l738YJgzJtE5
vzsfP0NGCUlb15lORzQ8XEDjxaE9LC2tkjz01QrL4b+7/VA/yihRNmWnvdGv11e+
G1Ak
-----END CERTIFICATE-----
`

const TEST_SERVER_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDaDCCAlCgAwIBAgIUCrLtc2wf3h2nwwHCpLYtAVcgdzEwDQYJKoZIhvcNAQEL
BQAwJzElMCMGA1UEAwwcWW91ckJ1ZGR5IFByb3h5IEZpeHR1cmUgUm9vdDAeFw0y
NjEwMTkxMzMyMzVaFw0zNjEwMTYxMzMyMzVaMB0xGzAZBgNVBAMMEnByb3h5LXRl
c3QuaW52YWxpZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOhMuPx5
3e6x2XuHSZAyiqVNK/2KS3ET0QGLTPsHLrQFHJSIG+9iHpGKWPYpQ1r7rurzVw1V
Xv83L7zI/JVQzbnrQw02RpASC9jeXfD1COZWB7/D1UHUSJcmo7b31W1tDI14V3Wi
NJTgZMtPnNOIhViJH5OXMRs0FqY6CVw5Itt8hGaaic4tdFzVdQfDnDHPdkGxczLu
2eC8Vz0fiHxqkNp423rR3kTWxJaZmmhFOy/vhUpeYty35D+Gbp60pU4ZNTQqiA/m
hlviiT5LotH3VNaGkErS4YLz5lWCDq/tFLTgezzywhi3KEs+xE7xFZnK+oLWX+jo
Q1nbtJW+PuKgw5sCAwEAAaOBlTCBkjA7BgNVHREENDAygglsb2NhbGhvc3SCEnBy
b3h5LXRlc3QuaW52YWxpZIILY2hhdGdwdC5jb22HBH8AAAEwEwYDVR0lBAwwCgYI
KwYBBQUHAwEwHQYDVR0OBBYEFJdgctSA5yQnI5O5bb5Sq5ZbKq0WMB8GA1UdIwQY
MBaAFPJhGjfsfkESO0Qst13R/DUoUYvaMA0GCSqGSIb3DQEBCwUAA4IBAQC4Mc3h
C6yTLzN0ygBogXlNJgeDqqSNrja9cN69hRR5As4Xd+AQZcT6G1gPZWJmGikSBRUK
AvuZJlCqFNP0L03d5FYynlfX+TwuejsM8WbuHAPlAraNteI7mPqDOKqwKPPtBtVu
FNrFetVGSqka5kR2KHXDSRuiptIvKWnTsEBIXsE62oCbRMWzwey6pyLiySLGu5uX
AwRIeI6dWrM3DaY5sjpyyvE7Lw+SNfJeirlLRiU48h7U0+jOPquEqte5YsRyPFmW
KsJfEN0sx2sjh8KCf61ApQruJ0p/ygi9ZJOGNJWJCnYh/3TOgNFbF2NhbRLeRcCW
C+f4OJoKWf8fRf6r
-----END CERTIFICATE-----
`

const TEST_SERVER_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDoTLj8ed3usdl7
h0mQMoqlTSv9iktxE9EBi0z7By60BRyUiBvvYh6Rilj2KUNa+67q81cNVV7/Ny+8
yPyVUM2560MNNkaQEgvY3l3w9QjmVge/w9VB1EiXJqO299VtbQyNeFd1ojSU4GTL
T5zTiIVYiR+TlzEbNBamOglcOSLbfIRmmonOLXRc1XUHw5wxz3ZBsXMy7tngvFc9
H4h8apDaeNt60d5E1sSWmZpoRTsv74VKXmLct+Q/hm6etKVOGTU0KogP5oZb4ok+
S6LR91TWhpBK0uGC8+ZVgg6v7RS04Hs88sIYtyhLPsRO8RWZyvqC1l/o6ENZ27SV
vj7ioMObAgMBAAECggEAEzL4HQHTel1fnKqHRXAv7k6NArTx3EQng4moUJz82qsL
fCktqeDBpwS4qoupgfUINWnsOXFjWxOMEf3Ihmy5vBJ6JbblKRYcvY1PVVFjLWpR
1KMSVpD9eOScJkygap1XKsAV9mZ0ExPisL0BOKhxYOpgXjniOJ3a+10Tlfgw7dPZ
6dgGSfwPtN90zwJkgXS32FPTGnc/cgNWdxk2Yr+x+/6N2aDRVy+FYkAI7lRWJFLR
NijjntEdKVa1DDCSHTRsq1Koo+L427QtqFIFSmwQHc02XcFQYuYi4w1lZkZwK04O
0DdUD9/Zu/9g0gS0CHegD9cZ+02aH3wOCL9nqrx7pQKBgQD5ENPnyq+D/YxsgVMM
GvTktLETkGI+VowGM+NNGaopgeQGeIIutXjBKRJEj6IxKfxbuwO5R/fQb5eoSD37
lvdlaYIboCzp4oz8YfiCA772es+MjOe7YLMQPjfhbmjnsr87dFjTWHD2cqS1PJ0D
YHkQjbCVCnVtaMoKcyyLD/4MBwKBgQDuxGXbCTfEnBrlYwGu42W+bMKUmmE5buGH
uO1TwGxJxiiniI3Kc9fUmd18uflj1siHiySanNI6NzVkG0LTINuJnjcWsv+ktom8
MdCnRX7J41INjOwEQoJaWPjQ2UMGwtWBLsDpVHKj8jaIF+eBcwVGjCUprtnNN7H0
xct2O4FOzQKBgQDrcu7/1mmpuwz+nhrl/K25bt9fAUT+bU6dpnugLTzhVDs9qrpW
cZMf9zWfvrCzDV/VT6urgc9RKc0Sdoixx/tD0UP/3aHX0CU7iVolfmkOFPcThTij
uDxOhKLK51cggaeqCsjVsmvHboUqF4zO3mpULb3ahzKPJVqqGkrng0zEDQKBgBJu
YLp2zLJFpqHcca3RafI4LRERlb28PHagpNlZOkK7pDnChceCB8AmnH1bUdAOLW6h
JBM3VdcemeV/YToxCCFocDI1YRyS5rD7W3L+H1pwTM40+acehzd4NMTScKUd9yNA
u62HUk4rjWAWEE3i1h5rBRdhovh/eyI8/obC8yllAoGAcA07Rd81SQnxAm+2aHMO
ZCjlx3h9v74u9uCG4i2ZAtSRCdMBg2KU9WAzvXxtfbwtUEUJ6RJwLS0Sp/4GNZ+H
Q2wK2P7gSfkbByZahiI+ykC1WVf+fglSV0vVZclhPdiTeNSh713L4F/v8NbLitQi
G8ZOImoRov0E9quwBx/qnZA=
-----END PRIVATE KEY-----
`

const REPOSITORY_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const HARNESS_ROOT = process.env.YOURBUDDY_HARNESS_ROOT || REPOSITORY_ROOT
const CLI_BIN = join(HARNESS_ROOT, 'apps', 'cli', 'lib', 'bin.js')
const NODE_BINARY = process.env.YOURBUDDY_NODE_BINARY || process.execPath
const RESULT_PREFIX = 'YOURBUDDY_PROXY_TEST_RESULT '

const PREFLIGHT_SOURCE = readFileSync(join(REPOSITORY_ROOT, 'apps', 'desktop-tauri', 'src-tauri', 'src', 'network_proxy.rs'), 'utf8')
  .match(/const NODE_PREFLIGHT_SOURCE: &str = r#"([\s\S]*?)"#;/u)?.[1]
assert.notEqual(PREFLIGHT_SOURCE, undefined)

function preflightEnvironment(proxyUrl, caPath) {
  const environment = { ...process.env, NODE_OPTIONS: '--use-system-ca' }
  for (const name of [
    'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
    'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy',
    'NODE_EXTRA_CA_CERTS', 'NODE_USE_ENV_PROXY', 'NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_PATH',
  ]) delete environment[name]
  if (proxyUrl !== undefined) {
    environment.HTTP_PROXY = proxyUrl
    environment.HTTPS_PROXY = proxyUrl
  }
  if (caPath !== undefined) environment.NODE_EXTRA_CA_CERTS = caPath
  return environment
}

function runPreflight(cliPackage, url, proxyUrl, caPath, prefix = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(NODE_BINARY, [
      '--input-type=module', '--eval', `${prefix}\n${PREFLIGHT_SOURCE}`, cliPackage, url,
    ], { env: preflightEnvironment(proxyUrl, caPath), stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, 30_000)
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout = `${stdout}${chunk}`.slice(-4096) })
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-4096) })
    child.once('error', error => { clearTimeout(timeout); reject(error) })
    child.once('close', (code, signal) => {
      clearTimeout(timeout)
      try {
        assert.equal(timedOut, false, `preflight timed out: ${stderr}`)
        assert.equal(signal, null, stderr)
        assert.equal(code, 0, stderr)
        resolve(JSON.parse(stdout))
      } catch (error) { reject(error) }
    })
  })
}

function isolatedPreflightHarness(root) {
  const cliRoot = join(root, 'apps', 'cli')
  const proxyRoot = join(root, 'packages', 'util', 'http-proxy')
  const sourceProxy = join(HARNESS_ROOT, 'packages', 'util', 'http-proxy')
  const require = createRequire(join(sourceProxy, 'package.json'))
  mkdirSync(join(cliRoot, 'node_modules', '@deepseek-ai'), { recursive: true })
  mkdirSync(join(proxyRoot, 'node_modules'), { recursive: true })
  cpSync(join(HARNESS_ROOT, 'apps', 'cli', 'package.json'), join(cliRoot, 'package.json'))
  cpSync(join(sourceProxy, 'package.json'), join(proxyRoot, 'package.json'))
  cpSync(join(sourceProxy, 'lib'), join(proxyRoot, 'lib'), { recursive: true })
  cpSync(dirname(require.resolve('undici/package.json')), join(proxyRoot, 'node_modules', 'undici'), { recursive: true })
  symlinkSync(proxyRoot, join(cliRoot, 'node_modules', '@deepseek-ai', 'dsh-http-proxy'), 'junction')
  return join(cliRoot, 'package.json')
}

test('bundled Node preflight resolves its declared proxy dependency in an isolated production layout', async t => {
  const workspace = mkdtempSync(join(tmpdir(), 'yourbuddy-preflight-layout-'))
  t.after(() => rmSync(workspace, { force: true, recursive: true }))
  const cliPackage = isolatedPreflightHarness(workspace)
  const isolatedResolution = `
    const { default: assert } = await import('node:assert/strict')
    const { createRequire: fixtureRequire } = await import('node:module')
    assert.throws(() => fixtureRequire(process.argv[1]).resolve('undici'), { code: 'MODULE_NOT_FOUND' })
  `
  for (const proxy of [undefined, 'http://127.0.0.1:7890']) {
    assert.deepEqual(await runPreflight(cliPackage, 'data:text/plain,probe', proxy, undefined, isolatedResolution), {
      ok: true, status: 200, errorCode: '',
    })
  }
  for (const status of [401, 403, 407, 503]) {
    const ok = status !== 407 && status < 500
    const prefix = `globalThis.fetch = async () => ({ status: ${status} })`
    assert.deepEqual(await runPreflight(cliPackage, 'https://chatgpt.com/', undefined, undefined, prefix), {
      ok, status, errorCode: ok ? '' : `HTTP_${status}`,
    })
  }
  assert.deepEqual(await runPreflight(
    cliPackage, 'https://chatgpt.com/', 'not-a-proxy-url', undefined,
    'globalThis.fetch = async () => ({ status: 403 })',
  ), { ok: false, status: 0, errorCode: 'NODE_PREFLIGHT_INIT_FAILED' })
  const transportFailure = `globalThis.fetch = async () => { throw new TypeError('private proxy', {
    cause: Object.assign(new Error('private certificate'), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }),
  }) }`
  assert.deepEqual(await runPreflight(cliPackage, 'https://chatgpt.com/', undefined, undefined, transportFailure), {
    ok: false, status: 0, errorCode: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  })
  rmSync(join(workspace, 'packages', 'util', 'http-proxy', 'lib'), { force: true, recursive: true })
  assert.deepEqual(await runPreflight(cliPackage, 'data:text/plain,probe'), {
    ok: false, status: 0, errorCode: 'NODE_PREFLIGHT_INIT_FAILED',
  })
})

const HOST_PROBE_SOURCE = `
export const name = 'yourbuddy-enterprise-ca-host-probe'

export async function apply() {
  let result
try {
    const proxyResponse = await fetch(process.env.YOURBUDDY_PROXY_TEST_URL)
    const caResponse = await fetch(process.env.YOURBUDDY_CA_TEST_URL)
    result = { ok: true, status: caResponse.status, proxyStatus: proxyResponse.status, errorCodes: [] }
} catch (error) {
  let current = error
  const codes = []
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current.code === 'string') codes.push(current.code)
    current = current.cause
  }
    result = { ok: false, status: 0, errorCodes: codes }
}
  process.stdout.write(${JSON.stringify(RESULT_PREFIX)} + JSON.stringify(result) + '\\n')
}
`

function runHost(url, proxyUrl, caPath, workspace, suffix) {
  return new Promise((resolve, reject) => {
    const plugin = join(workspace, 'host-probe.mjs')
    const overlay = join(workspace, 'host-probe.patch.yml')
    writeFileSync(plugin, HOST_PROBE_SOURCE)
    writeFileSync(overlay, `- insert:\n    - id: yourbuddy-enterprise-ca-host-probe\n      name: ${JSON.stringify(plugin)}\n`)
    const environment = {
      ...process.env,
      DSH_HOME: join(workspace, `dsh-home-${suffix}`),
      DSH_TELEMETRY_DISABLED: '1',
      HTTP_PROXY: proxyUrl,
      HTTPS_PROXY: proxyUrl,
      http_proxy: proxyUrl,
      https_proxy: proxyUrl,
      NO_PROXY: '127.0.0.1',
      no_proxy: '127.0.0.1',
      NODE_OPTIONS: '--use-system-ca',
      NODE_USE_ENV_PROXY: '1',
      YOURBUDDY_CA_TEST_URL: url,
      YOURBUDDY_PROXY_TEST_URL: 'http://proxy-test.invalid/probe',
    }
    for (const name of [
      'ALL_PROXY', 'all_proxy', 'NODE_EXTRA_CA_CERTS', 'NODE_TLS_REJECT_UNAUTHORIZED',
    ]) delete environment[name]
    if (caPath !== undefined) environment.NODE_EXTRA_CA_CERTS = caPath
    const child = spawn(NODE_BINARY, [CLI_BIN, 'web', '--patch', overlay,
      '--no-open', '--host', '127.0.0.1', '--port', '0'], {
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let result
    let timeoutError
    const timeout = setTimeout(() => {
      timeoutError = new Error(`Node Host probe timed out\nstdout:\n${stdout}\nstderr:\n${stderr}`)
      child.kill('SIGKILL')
    }, 60_000)
    child.stdout.setEncoding('utf8').on('data', chunk => {
      stdout = `${stdout}${chunk}`.slice(-64_000)
      const line = stdout.split('\n').find(value => value.startsWith(RESULT_PREFIX))
      if (line === undefined || result !== undefined) return
      result = JSON.parse(line.slice(RESULT_PREFIX.length))
      child.kill('SIGTERM')
    })
    child.stderr.setEncoding('utf8').on('data', chunk => {
      stderr = `${stderr}${chunk}`.slice(-64_000)
    })
    child.once('error', error => {
      clearTimeout(timeout)
      reject(error)
    })
    child.once('close', code => {
      clearTimeout(timeout)
      if (timeoutError !== undefined) {
        reject(timeoutError)
        return
      }
      if (result === undefined) {
        reject(new Error(`Node Host exited before its probe completed (code=${code})\nstdout:\n${stdout}\nstderr:\n${stderr}`))
        return
      }
      resolve({ code, result, stderr, stdout })
    })
  })
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve()
      return
    }
    server.close(error => error === undefined ? resolve() : reject(error))
  })
}

async function proxyFixture(t) {
  const workspace = mkdtempSync(join(tmpdir(), 'yourbuddy-node-extra-ca-'))
  const caPath = join(workspace, 'company-root.pem')
  writeFileSync(caPath, TEST_CA_PEM)
  const target = createServer({ cert: TEST_SERVER_CERTIFICATE, key: TEST_SERVER_KEY }, (_request, response) => {
    response.writeHead(204)
    response.end()
  })
  const sockets = new Set()
  function track(socket) {
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
    socket.on('error', () => socket.destroy())
    return socket
  }
  target.on('connection', track)
  const authorities = []
  const proxyRequests = []
  let targetPort = 0
  const proxy = createProxyServer((request, response) => {
    proxyRequests.push(request.url ?? '')
    response.writeHead(request.url?.endsWith('/blocked') ? 407 : 204)
    response.end()
  })
  proxy.on('connection', track)
  proxy.on('connect', (request, client, head) => {
    authorities.push(request.url ?? '')
    const upstream = track(connect(targetPort, '127.0.0.1', () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      if (head.length > 0) upstream.write(head)
      client.pipe(upstream)
      upstream.pipe(client)
    }))
    client.once('close', () => upstream.destroy())
    upstream.once('close', () => client.destroy())
  })
  t.after(async () => {
    await Promise.all([...sockets].map(socket => new Promise(resolve => {
      socket.once('close', resolve)
      socket.destroy()
    })))
    const closures = await Promise.allSettled([closeServer(proxy), closeServer(target)])
    try {
      const failedClosure = closures.find(closure => closure.status === 'rejected')
      if (failedClosure !== undefined) throw failedClosure.reason
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })
  await new Promise((resolve, reject) => {
    target.once('error', reject)
    target.listen(0, '127.0.0.1', resolve)
  })
  await new Promise((resolve, reject) => {
    proxy.once('error', reject)
    proxy.listen(0, '127.0.0.1', resolve)
  })
  const address = target.address()
  assert.notEqual(address, null)
  assert.equal(typeof address, 'object')
  targetPort = address.port
  const url = `https://localhost:${address.port}/`
  const proxyAddress = proxy.address()
  assert.notEqual(proxyAddress, null)
  assert.equal(typeof proxyAddress, 'object')
  const proxyUrl = `http://127.0.0.1:${proxyAddress.port}`

  return { workspace, caPath, url, proxyUrl, proxyRequests, authorities }
}

test('bundled Node preflight rejects proxy and certificate failures before saving', async t => {
  const { workspace, caPath, url, proxyUrl, proxyRequests, authorities } = await proxyFixture(t)
  const cliPackage = isolatedPreflightHarness(join(workspace, 'harness'))
  const withoutPreflightCa = await runPreflight(cliPackage, url, proxyUrl)
  assert.equal(withoutPreflightCa.ok, false)
  assert.match(withoutPreflightCa.errorCode, /UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN/u)
  assert.deepEqual(await runPreflight(cliPackage, url, proxyUrl, caPath), {
    ok: true, status: 204, errorCode: '',
  })
  assert.deepEqual(await runPreflight(cliPackage, 'http://proxy-test.invalid/preflight', proxyUrl, caPath), {
    ok: true, status: 204, errorCode: '',
  })
  assert.deepEqual(await runPreflight(cliPackage, 'http://proxy-test.invalid/blocked', proxyUrl, caPath), {
    ok: false, status: 0, errorCode: 'UND_ERR_INVALID_ARG',
  })
  const connectUrl = 'https://proxy-test.invalid/preflight'
  const untrustedConnect = await runPreflight(cliPackage, connectUrl, proxyUrl)
  assert.equal(untrustedConnect.ok, false)
  assert.match(untrustedConnect.errorCode, /UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN/u)
  assert.deepEqual(await runPreflight(cliPackage, connectUrl, proxyUrl, caPath), {
    ok: true, status: 204, errorCode: '',
  })
  const invalidCa = join(workspace, 'invalid.pem')
  writeFileSync(invalidCa, 'not a certificate\n')
  const invalidPreflightCa = await runPreflight(cliPackage, url, proxyUrl, invalidCa)
  assert.equal(invalidPreflightCa.ok, false)
  assert.match(invalidPreflightCa.errorCode, /UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN/u)

  assert.deepEqual(proxyRequests, ['http://proxy-test.invalid/preflight', 'http://proxy-test.invalid/blocked'])
  assert.deepEqual(authorities, ['proxy-test.invalid:443', 'proxy-test.invalid:443'])
})

test('actual Node Host uses HTTP proxying, HTTPS CONNECT, and startup CA injection together', async t => {
  const { workspace, caPath, proxyUrl, proxyRequests, authorities } = await proxyFixture(t)
  const url = 'https://proxy-test.invalid/probe'
  const withoutCa = await runHost(url, proxyUrl, undefined, workspace, 'without-ca')
  assert.equal(withoutCa.code, 0, withoutCa.stderr)
  assert.equal(withoutCa.result.ok, false)
  assert.match(withoutCa.result.errorCodes.join(','), /UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN/u)

  const withCa = await runHost(url, proxyUrl, caPath, workspace, 'with-ca')
  assert.equal(withCa.code, 0, withCa.stderr)
  assert.deepEqual(withCa.result, { ok: true, status: 204, proxyStatus: 204, errorCodes: [] })
  assert.deepEqual(proxyRequests, [
    'http://proxy-test.invalid/probe',
    'http://proxy-test.invalid/probe',
  ])
  assert.deepEqual(authorities, ['proxy-test.invalid:443', 'proxy-test.invalid:443'])
})
