import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const TEST_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIDHzCCAgegAwIBAgIUdxu5JjZXYXvUW+LuCAd0wISut78wDQYJKoZIhvcNAQEL
BQAwHzEdMBsGA1UEAwwUWGlhb0h1aSBUZXN0IFJvb3QgQ0EwHhcNMjYwOTAzMTYy
MzI5WhcNMzYwODMxMTYyMzI5WjAfMR0wGwYDVQQDDBRYaWFvSHVpIFRlc3QgUm9v
dCBDQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANPI+zzaoCxkeAxr
Yf6pLbY2Q9C3cnfuwY0fNAIlVWwZ15rBavFmtEagUw59k6cZ5uWlACjU+cZGp3fF
pfPO7FkYfvYKulFoFl6OBX1ywzAfjmY+jNh4cKPWNQ0GerEbyWaQCZZFSS0fN3qI
kMLiJZ1/0Du4TvF4UZFehQf5Bd+k3DHAo0pna2gWLqtqTtOo1r8snULEqoKAClB1
Z43u6ky1DK+NQe5dFiSYf2GdKfSLP0uKmnBJPTEVyv6usrXcoG4DVeiiRz73w7rp
iFvcgdu+5dpMF1+MnXI/bPV6/AXvo7Dc4zvdOlziMMappGGIT0H2eu2SzGbT3zqX
nuIJk98CAwEAAaNTMFEwHQYDVR0OBBYEFL05bkFo869nwAWspSKpvUQTbAifMB8G
A1UdIwQYMBaAFL05bkFo869nwAWspSKpvUQTbAifMA8GA1UdEwEB/wQFMAMBAf8w
DQYJKoZIhvcNAQELBQADggEBADX90WScMxdZJqgBeusQ1wZ3pf2mHocFRtyfFnmt
k5P7XslZ1ruvl/b7+uawCnqXBUKVWWcUpXIWg1gA3izZBRCd5Tu3bRjOZpK3ltjv
6SMn8KOMNMhUNzV7oObNmwaGQqnzBCbzxwRRb5WX2ZCm9DUpUWESrgiZvROt8eI+
Z3yTKEahVJukxCCUY5dflcgN0Yc7j0eymVN+uTIV31Mwbe6b4mVy3et25rpS3Wgv
taOR/eYw4rUVTZFOPqm8UnjHU/7A912wTNtw9zXTZ+NyB1Ime0FnVs5OYzeWAi9P
S6SwbXK80h7DuF0rHy94HjkjOYfkfNPnOccktVWMuUUJqLc=
-----END CERTIFICATE-----
`

const TEST_SERVER_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDHzCCAgegAwIBAgIUVhnY43PkeN4nkSkouzN1a3cQEgQwDQYJKoZIhvcNAQEL
BQAwHzEdMBsGA1UEAwwUWGlhb0h1aSBUZXN0IFJvb3QgQ0EwHhcNMjYwOTAzMTYy
MzI5WhcNMzYwODMxMTYyMzI5WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0G
CSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQClDEtU1ZlzrVbiRRbhWYTfZYpV598s
4i3NoeEuwpJWRlh9Qxmx1JR7LRL0YbnXZsIq0HMdNK+xhfb10ZmHktV+vq6lf/yU
4Ca9qPj6SNyhqEVOviBlcutqHJh6ucYcZInR0mTN9QUxnyscKeVQpYGprcCrBK3M
co2a3GFkveNLKbtgLD4fwae17rvXwRfTj8H/HR0hP+wn2WBB7pTCTo65LPFOlvCv
BVxP5ecHZIfPWU4p5l6n+CQADWHnbkUyOY1ccEVC14UMCXsiSG5ZVdLHXoHTzu6t
F9e6/TFOgLZ4hbMReviTBOLHKvEphzsDZOQgR4E9l0maeCvgEkqariEHAgMBAAGj
XjBcMBoGA1UdEQQTMBGCCWxvY2FsaG9zdIcEfwAAATAdBgNVHQ4EFgQUPHi0cOF7
K/bl0kAssaDAiAmWWyYwHwYDVR0jBBgwFoAUvTluQWjzr2fABaylIqm9RBNsCJ8w
DQYJKoZIhvcNAQELBQADggEBAGfvpjc5lNH/DmaApe4w2NF/ptD4LlTEkmwN2vdZ
5s/lNpgOEcR7JdIwtyyXItUtscIrm2x9dXqUbw6qAHCY1KXqagjRZuXg456hKEDv
K5V6syxZX85PayXaviIP62gsdnHZJWH8t344RYiA/A8ASSO76+0Hyr6IvYT+inyj
EWU2rqdl0PuhN2/6F9wEINUxY5/9J31cGhvEuX6lL7UZGc48TOfWaTwwIuRLojif
XSwS1fG1f3a+r9cbcQPP26prxZad4zkOHjrQVs+V3IvYvHIT/+ZVfu/ROcXICzYJ
ZmGJRE+0GIGEcbX2UnqfPXTJIoVyYzu9EI3jHU1ofgBLbxY=
-----END CERTIFICATE-----
`

const TEST_SERVER_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQClDEtU1ZlzrVbi
RRbhWYTfZYpV598s4i3NoeEuwpJWRlh9Qxmx1JR7LRL0YbnXZsIq0HMdNK+xhfb1
0ZmHktV+vq6lf/yU4Ca9qPj6SNyhqEVOviBlcutqHJh6ucYcZInR0mTN9QUxnysc
KeVQpYGprcCrBK3Mco2a3GFkveNLKbtgLD4fwae17rvXwRfTj8H/HR0hP+wn2WBB
7pTCTo65LPFOlvCvBVxP5ecHZIfPWU4p5l6n+CQADWHnbkUyOY1ccEVC14UMCXsi
SG5ZVdLHXoHTzu6tF9e6/TFOgLZ4hbMReviTBOLHKvEphzsDZOQgR4E9l0maeCvg
EkqariEHAgMBAAECggEABoq9Naidw3sHFZg9du3bGWu8lvkbhyY+ldxTwPcPYSy6
odnAsU7GxTcdKDieFXlKOvOLjIh5FPqatlWk1eiDs9llB2787lMQK2EA4BLL7qXC
fC4xud5bPG0pEhGTq65vKV+YhUgFTlk2a+WxOYgbN+7eKH6FUQmSrqULleL87mQH
CzXISk85Sjvft0ByDVmsYNxb6WMK9UlmsSShiJWqHjNcu44o+hnwIvv+HqhfEGoO
wnuveLYps2inwLgxjGhepoJ+GJ8dbjrsonPsxUpGUOasaz3WwXCEHJnE7h3RWhFg
I4sSJ++QPTZSLLEjMdpP1/9xmCj4eKpc1o3JJGrMgQKBgQDge0FNehgq9L/ltdKB
zcVEXSy1k/VeCaKRtG9F58QRnorD+G0EFvXQESq0lQgHFfYb3oWdwqIOjSFT4cHY
gmNJt/ryK4AKSalW9gxPSjnCTH3eelO38qZXBJmUF/ozRfgf+c0vRm5O3VB3Fiz3
dXPJ7/Bl90ebTRsjp2ZQc7dyQQKBgQC8OMSe13HhACPnAUvIy8Wn253f+OEja+9C
/DPqkwHL29e6qlYFqmY/lK/agkctgN+ddqnIk5NoLK/CVOm6pXblHKzY2Fjz4ERU
p7IYsqHmtdghmbXiV5Iqw+9fEnK5NtFKeBsTNgPaPA36+kpG8GBL7RFn/E9r6lZH
9WYzbC8xRwKBgBeyKxSInOB78X3IEa6OEBLFWyDXu4Dvt292AoD4lCPf/nntUWSr
H8uU5FMnoC9PTClo9eXPU9gBYdE+9X1rVhvEBgNmQB/V4sBBPM9p4Gr4NBk2BHxY
auKoo6WUWl7rNeP6NISXBLHifsnzV0/P4Cci4teAoNht7T14QD6h2G2BAoGAZQ6J
qsr77pU3sYjFmrqllflZK26h2nXSEYH9kd16Im0Xx7Y613Hk0hBP1p8J/klqRk32
3KU3iMAtYcZbc4XxbxPVTdvi7pWjulwLSC1otck+kNPJjwv7g5CNjdsG06C2ACi6
SLdAnESQMQd/J9VZropLRSx3q/Y2ew4r4EIemHMCgYEAg5xsVT0l9WbaYecc3KaX
fEkW9eP98DmMA8QeqWnAgIymBEpRYBbKVBPKzXzn7BIfomRANFXZFJPn0328K1Y8
E2bjzgQ+oY33YH8iMv8CJ7UCnPZWL5BMgLo0HBBigpYoYtMkDmDjpwaLpO+txk19
xoIyRXsekY4JRZF4LNfgZO0=
-----END PRIVATE KEY-----
`

const CHILD_SOURCE = `
try {
  const response = await fetch(process.argv[1])
  console.log(response.status)
} catch (error) {
  let current = error
  const codes = []
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current.code === 'string') codes.push(current.code)
    current = current.cause
  }
  console.error(codes.join(','))
  process.exitCode = 1
}
`

function runNode(url, caPath) {
  return new Promise((resolve, reject) => {
    const environment = { ...process.env, NODE_OPTIONS: '--use-system-ca' }
    for (const name of [
      'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
      'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy',
      'NODE_USE_ENV_PROXY', 'NODE_EXTRA_CA_CERTS',
    ]) delete environment[name]
    if (caPath !== undefined) environment.NODE_EXTRA_CA_CERTS = caPath
    const child = spawn(process.execPath, ['--input-type=module', '--eval', CHILD_SOURCE, url], {
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk })
    child.once('error', reject)
    child.once('close', code => { resolve({ code, stderr, stdout }) })
  })
}

test('NODE_EXTRA_CA_CERTS is effective only when supplied before Node Host startup', async t => {
  const workspace = mkdtempSync(join(tmpdir(), 'yourharness-node-extra-ca-'))
  const caPath = join(workspace, 'company-root.pem')
  writeFileSync(caPath, TEST_CA_PEM)
  const server = createServer({ cert: TEST_SERVER_CERTIFICATE, key: TEST_SERVER_KEY }, (_request, response) => {
    response.writeHead(204)
    response.end()
  })
  t.after(() => {
    server.close()
    rmSync(workspace, { force: true, recursive: true })
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.notEqual(address, null)
  assert.equal(typeof address, 'object')
  const url = `https://localhost:${address.port}/`

  const withoutCa = await runNode(url)
  assert.notEqual(withoutCa.code, 0)
  assert.match(withoutCa.stderr, /UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN/u)

  const withCa = await runNode(url, caPath)
  assert.equal(withCa.code, 0, withCa.stderr)
  assert.equal(withCa.stdout.trim(), '204')
})
