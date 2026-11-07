import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { load } from 'js-yaml'

const installer = fileURLToPath(new URL('./install-yourbuddy.sh', import.meta.url))
const posix = { skip: process.platform === 'win32' ? 'The installer runs only in a macOS POSIX shell.' : false }

function fixture(t, { legacy = false, transport = '', nativeExit = 0, platform = 'Darwin' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-installer-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }))
  const bin = join(root, 'bin')
  const temporary = join(root, 'temporary')
  const contents = join(root, 'archive', 'YourBuddy.app', 'Contents')
  for (const directory of [bin, temporary, join(contents, 'MacOS'), join(contents, 'Resources')]) mkdirSync(directory, { recursive: true })
  const executable = (path, body) => {
    writeFileSync(path, `#!${process.execPath}\n${body}\n`)
    chmodSync(path, 0o755)
  }
  writeFileSync(join(contents, 'Info.plist'), JSON.stringify({ CFBundleShortVersionString: '1.2.3' }))
  if (!legacy) writeFileSync(join(contents, 'Resources', 'installer-protocol.json'), '{"version":1}')
  executable(join(contents, 'MacOS', 'yourbuddy'), `
const fs = require('node:fs');
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
fs.writeFileSync(process.env.NATIVE_LOG, JSON.stringify({ args, executable: process.argv[1], packagePresent: fs.existsSync(value('--package')), signature: fs.readFileSync(value('--signature'), 'utf8') }));
console.log(JSON.stringify({ id: 'operation-1', phase: ${nativeExit ? "'failed'" : "'accepted'"} }));
process.exit(${nativeExit});`)
  const archive = join(root, 'official.app.tar.gz')
  execFileSync('tar', ['-czf', archive, '-C', join(root, 'archive'), 'YourBuddy.app'])
  const signature = `${archive}.sig`
  writeFileSync(signature, 'official signature fixture')
  executable(join(bin, 'uname'), `console.log(process.argv[2] === '-s' ? ${JSON.stringify(platform)} : 'arm64');`)
  executable(join(bin, 'plutil'), `
try { const fs = require('node:fs'); const value = JSON.parse(fs.readFileSync(process.argv.at(-1), 'utf8'))[process.argv[3]]; if (value === undefined || process.argv[4] !== 'xml1') process.exit(1); const type = typeof value === 'number' ? 'integer' : 'string'; console.log('<plist>\\n<' + type + '>' + value + '</' + type + '>\\n</plist>'); } catch { process.exit(1); }`)
  executable(join(bin, 'curl'), `
const fs = require('node:fs');
const args = process.argv.slice(2);
const url = args.at(-1);
const output = args[args.indexOf('--output') + 1];
fs.appendFileSync(process.env.TRANSPORT_LOG, JSON.stringify(args) + '\\n');
if (url.endsWith('/latest')) { fs.writeFileSync(output, JSON.stringify({ tag_name: 'yourbuddy-v1.2.3' })); process.exit(0); }
if (${JSON.stringify(transport)} === 'unavailable') process.exit(22);
if (${JSON.stringify(transport)} === 'interrupted' && !url.endsWith('.sig')) {
  const archive = fs.readFileSync(process.env.ARCHIVE);
  const cut = Math.floor(archive.length / 2);
  if (!fs.existsSync(output)) { fs.writeFileSync(output, archive.subarray(0, cut)); process.exit(18); }
  if (!args.includes('--continue-at') || !fs.readFileSync(output).equals(archive.subarray(0, cut))) process.exit(99);
  fs.appendFileSync(output, archive.subarray(cut)); process.exit(0);
}
if (${JSON.stringify(transport)} === 'no-range' && args.includes('--continue-at') && !url.endsWith('.sig')) { fs.writeFileSync(output, 'partial download'); process.exit(33); }
fs.copyFileSync(url.endsWith('.sig') ? process.env.ARCHIVE + '.sig' : process.env.ARCHIVE, output);`)
  const env = {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    TMPDIR: temporary,
    ARCHIVE: archive,
    NATIVE_LOG: join(root, 'native.json'),
    TRANSPORT_LOG: join(root, 'transport.jsonl'),
  }
  return {
    archive, signature,
    installExisting() {
      const destination = join(root, 'Installed YourBuddy.app')
      cpSync(join(root, 'archive', 'YourBuddy.app'), destination, { recursive: true })
      return destination
    },
    run(args = []) {
      const result = spawnSync('/bin/bash', [installer, ...args], { env, encoding: 'utf8', timeout: 30_000 })
      assert.equal(result.error, undefined, 'the shell process must finish without a timeout')
      assert.equal(result.signal, null, 'the shell process must exit without a signal')
      assert.deepEqual(readdirSync(temporary), [], 'temporary candidate and downloads are released after native receipt')
      return result
    },
    native: () => existsSync(env.NATIVE_LOG) ? JSON.parse(readFileSync(env.NATIVE_LOG, 'utf8')) : undefined,
    requests: () => existsSync(env.TRANSPORT_LOG) ? readFileSync(env.TRANSPORT_LOG, 'utf8').trim().split('\n').map(JSON.parse) : [],
  }
}

test('the shell resolves latest, proxies every transfer, and forwards a durable-operation request', posix, t => {
  const f = fixture(t)
  const result = f.run(['--proxy', 'http://127.0.0.1:7890', '--app', '/Applications/Your Buddy.app', '--request-id', 'stable-request', '--session-id', 'session-1', '--defer-stop'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { id: 'operation-1', phase: 'accepted' })
  assert.match(result.stderr, /An operation receipt is not installation success/)
  assert.match(result.stderr, /status --operation operation-1 --wait/)
  assert.match(result.stderr, /bin\/yourbuddy/)
  const native = f.native()
  assert.equal(native.packagePresent, true)
  assert.equal(native.signature, 'official signature fixture')
  assert.deepEqual(native.args.slice(0, 4), ['--yourbuddy-installer', 'install', '--version', '1.2.3'])
  assert.deepEqual(native.args.slice(8), ['--json', '--app', '/Applications/Your Buddy.app', '--request-id', 'stable-request', '--session-id', 'session-1', '--defer-stop', '--proxy', 'http://127.0.0.1:7890'])
  assert.equal(f.requests().length, 3)
  for (const request of f.requests()) {
    assert.equal(request[request.indexOf('--proxy') + 1], 'http://127.0.0.1:7890')
    assert.equal(request[request.indexOf('--retry') + 1], '3')
    assert.equal(request[request.indexOf('--continue-at') + 1], '-')
  }
  assert.match(f.requests()[1].at(-1), /yourbuddy-v1\.2\.3\/yourbuddy-1\.2\.3-bootstrap-macos-arm64\.app\.tar\.gz$/)
})

test('local offline installation uses the archive version without contacting the network', posix, t => {
  const f = fixture(t)
  const result = f.run(['--offline', '--package', f.archive, '--signature', f.signature])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(f.requests(), [])
  assert.ok(f.native().args.includes('--offline'))
  assert.equal(f.native().args[3], '1.2.3')
  assert.ok(existsSync(f.archive), 'the caller still owns the local package')
})

test('a pinned Offline download recovers from unsupported Range without resolving latest', posix, t => {
  const f = fixture(t, { transport: 'no-range' })
  const result = f.run(['--version', '1.2.3', '--offline'])
  assert.equal(result.status, 0, result.stderr)
  const requests = f.requests()
  assert.equal(requests.length, 3)
  assert.match(requests[0].at(-1), /offline-macos-arm64\.app\.tar\.gz$/)
  assert.equal(requests[0].at(-1), requests[1].at(-1))
  assert.equal(requests[1].includes('--continue-at'), false)
  assert.ok(f.native().args.includes('--offline'))
})

test('an interrupted transfer resumes from the retained partial archive', posix, t => {
  const f = fixture(t, { transport: 'interrupted' })
  const result = f.run(['--version', '1.2.3'])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(f.requests().length, 3)
  assert.equal(f.requests()[0].at(-1), f.requests()[1].at(-1))
  assert.equal(f.native().packagePresent, true)
})

test('an installed protocol-capable helper is preferred over executing the downloaded candidate', posix, t => {
  const f = fixture(t)
  const installed = f.installExisting()
  const result = f.run(['--app', installed, '--package', f.archive, '--signature', f.signature])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(f.native().executable, join(installed, 'Contents', 'MacOS', 'yourbuddy'))
})

test('an unavailable archive reports an actionable failure without starting the native installer', posix, t => {
  const f = fixture(t, { transport: 'unavailable' })
  const result = f.run(['--version', '1.2.3'])
  assert.equal(result.status, 1)
  const error = JSON.parse(result.stderr.trim().split('\n').at(-1))
  assert.equal(error.error, 'package_download_failed')
  assert.match(error.nextAction, /--proxy/)
  assert.equal(f.native(), undefined)
})

test('an older archive without the installer protocol never starts its GUI executable', posix, t => {
  const f = fixture(t, { legacy: true })
  const result = f.run(['--package', f.archive, '--signature', f.signature])
  assert.equal(result.status, 1)
  assert.equal(JSON.parse(result.stderr).error, 'legacy_release')
  assert.equal(f.native(), undefined)
  assert.deepEqual(f.requests(), [])
})

test('a native refusal remains a refusal rather than becoming an accepted receipt', posix, t => {
  const f = fixture(t, { nativeExit: 7 })
  const result = f.run(['--package', f.archive, '--signature', f.signature])
  assert.equal(result.status, 7)
  assert.equal(JSON.parse(result.stdout).phase, 'failed')
})

test('release publication stages the launcher, tests it, and includes the native protocol resource', () => {
  const workflow = load(readFileSync(new URL('../../../.github/workflows/desktop-release.yml', import.meta.url), 'utf8'))
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'))
  assert.equal(config.bundle.resources['installer-protocol.json'], 'installer-protocol.json')
  assert.equal(packageJson.scripts['test:installer'], 'node --test scripts/install-yourbuddy.test.mjs')
  assert.ok(packageJson.scripts['test:release'].includes('pnpm run test:installer'))
  const steps = workflow.jobs.build.steps
  assert.match(steps.find(step => step.name === 'Verify component preparation and release pipeline').run, /pnpm --dir apps\/desktop-tauri run test:installer/)
  assert.match(steps.find(step => step.name === 'Stage release assets').run, /Copy-Item apps\/desktop-tauri\/scripts\/install-yourbuddy\.sh release-assets\/install-yourbuddy\.sh/)
})
