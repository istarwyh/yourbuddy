import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { load } from 'js-yaml'

import { prepareDist } from './prepare-dist.mjs'
import { CAPABILITY_COMPONENTS } from './prepare-capability-components.mjs'
import { RELEASE_DOCUMENT_PREVIEWS, writeDocumentPreviewFixtures } from './verify-product-release.mjs'

const workflow = load(readFileSync(new URL('../../../.github/workflows/desktop-release.yml', import.meta.url), 'utf8'))
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const preparationScripts = [
  'bundle-harness-source.mjs',
  'prepare-capability-components.mjs',
  'prepare-harness-offline-store.mjs',
  'prepare-managed-toolchain.mjs',
  'prepare-yourbuddy-runtime.mjs',
]
const preparationFiles = [
  { 'bundled/harness/.bundle-manifest.json': '{"harnessVersion":"0.2.0-rc.1"}' },
  Object.fromEntries(CAPABILITY_COMPONENTS.flatMap(({ key, packageName }) => Object.entries({
    [`bundled/capabilities/${key}/package.json`]: JSON.stringify({
      name: packageName, version: '1.0.0', main: 'lib/index.js',
      dsh: { bundle: { patch: './cordis.patch.yml' } }, dependencies: { ordinary: '1.0.0' },
    }),
    [`bundled/capabilities/${key}/lib/index.js`]: 'export {}\n',
    [`bundled/capabilities/${key}/lib/client.js`]: 'export {}\n',
    [`bundled/capabilities/${key}/cordis.patch.yml`]: '- insert: []\n',
    [`bundled/capabilities/${key}/node_modules/ordinary/package.json`]: '{"name":"ordinary","version":"1.0.0"}',
  }))),
  { 'bundled/harness/yourbuddy-pnpm-store.tar.gz': 'store control' },
  { 'bundled/toolchain/manifest.json': '{}', 'bundled/toolchain/pnpm-11.7.0.tgz': 'fixed pnpm control' },
  { 'bundled/yourbuddy-runtime/manifest.json': '{}' },
]

function fixture(t, { failure, missing } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-release-pipeline-'))
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }))
  for (const name of ['splash.html', 'shell.html', 'desktop-i18n.js', 'splash-state.js', 'app-icon.png']) {
    writeFileSync(join(root, name), name)
  }
  mkdirSync(join(root, 'scripts'))
  // These subprocess controls exercise the real orchestrator's order and stopping behavior.
  // The actual packer and archive builder are covered by their own registered tests.
  preparationScripts.forEach((script, index) => {
    const files = Object.entries(preparationFiles[index]).filter(([path]) => path !== missing)
    writeFileSync(join(root, 'scripts', script), `
import assert from 'node:assert/strict'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
const previous = existsSync('stages.jsonl') ? readFileSync('stages.jsonl', 'utf8').trim().split('\\n').map(JSON.parse) : []
assert.deepEqual(previous, ${JSON.stringify(preparationScripts.slice(0, index))})
appendFileSync('stages.jsonl', JSON.stringify(${JSON.stringify(script)}) + '\\n')
if (${failure === script}) process.exit(19)
for (const [path, value] of ${JSON.stringify(files)}) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, value)
}
`)
  })
  return root
}

function stages(root) {
  return readFileSync(join(root, 'stages.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
}

test('prepares source, capabilities, store, toolchain and runtime once, then seeds fixed pnpm', t => {
  const root = fixture(t)
  assert.equal(prepareDist(root), 0)
  assert.deepEqual(stages(root), preparationScripts)
  assert.equal(readFileSync(join(root, 'component-channel', 'pnpm-11.7.0.tgz'), 'utf8'), 'fixed pnpm control')
  for (const files of preparationFiles) {
    for (const [path, expected] of Object.entries(files)) assert.equal(readFileSync(join(root, path), 'utf8'), expected)
  }
  assert.equal(readFileSync(join(root, 'dist', 'splash.html'), 'utf8'), 'splash.html')
})

test('a failed capability producer stops before store, toolchain and channel writes', t => {
  const root = fixture(t, { failure: preparationScripts[1] })
  assert.equal(prepareDist(root), 19)
  assert.deepEqual(stages(root), preparationScripts.slice(0, 2))
  assert.equal(existsSync(join(root, 'component-channel')), false)
  assert.equal(readFileSync(join(root, 'bundled/harness/.bundle-manifest.json'), 'utf8'), preparationFiles[0]['bundled/harness/.bundle-manifest.json'])
})

for (const missing of ['package.json', 'lib/index.js', 'node_modules/ordinary/package.json']) {
  test(`a successful producer missing capability ${missing} cannot reach later preparation`, t => {
    const root = fixture(t, { missing: `bundled/capabilities/harborPlugin/${missing}` })
    assert.throws(() => prepareDist(root), /ENOENT|capability (entry|dependency) is missing/)
    assert.deepEqual(stages(root), preparationScripts.slice(0, 2))
    assert.equal(existsSync(join(root, 'bundled/harness/yourbuddy-pnpm-store.tar.gz')), false)
    assert.equal(existsSync(join(root, 'component-channel')), false)
  })
}

test('package and release aggregates execute capability preparation and pipeline tests', () => {
  assert.equal(packageJson.scripts['prepare:capabilities'], 'node scripts/prepare-capability-components.mjs')
  assert.equal(packageJson.scripts['prepare:dist'], 'node scripts/prepare-dist.mjs')
  for (const name of ['prepare-capability-components', 'build-bootstrap-components', 'normalize-component-signature', 'release-component-pipeline']) {
    assert.ok(packageJson.scripts['test:components'].split(' ').includes(`scripts/${name}.test.mjs`))
  }
  assert.ok(packageJson.scripts['test:release'].split(' && ').includes('pnpm run test:components'))
  const steps = workflow.jobs.build.steps
  const gate = steps.findIndex(step => step.name === 'Verify component preparation and release pipeline')
  assert.ok(gate > steps.findIndex(step => step.name === 'Build Harness'))
  assert.ok(gate < steps.findIndex(step => step.name === 'Build immutable runtime components'))
  const normalization = [
    'TMPDIR="$(node -p \'require("node:fs").realpathSync(require("node:os").tmpdir())\')"',
    'export TMPDIR',
  ]
  const assertPhysicalTemporaryDirectory = run => assert.deepEqual(run.split('\n').slice(0, 2), normalization)
  assertPhysicalTemporaryDirectory(steps[gate].run)
  for (const omitted of [0, 1]) {
    assert.throws(() => assertPhysicalTemporaryDirectory(steps[gate].run.split('\n').filter((_, index) => index !== omitted).join('\n')))
  }
  assert.match(steps[gate].run, /pnpm --dir apps\/desktop-tauri run test:components/)
  assert.match(steps[gate].run, /YOURBUDDY_CAPABILITY_TEST_STORE="\$\(pnpm store path\)"/)
  assert.equal(steps[gate].env.YOURBUDDY_BUILT_HARNESS_ROOT, '${{ github.workspace }}')
  const build = steps.find(step => step.name === 'Build immutable runtime components').run
  assert.ok(build.indexOf('run prepare:dist') < build.indexOf('run build:components'))
  assert.ok(build.indexOf('run build:components') < build.indexOf('tauri signer sign'))
  assert.match(build, /normalize-component-signature\.mjs/)
  assert.match(build, /cp "\$manifest\.sig" apps\/desktop-tauri\/component-channel\/components\.json\.sig/)
  const assets = steps.find(step => step.name === 'Stage release assets').run
  assert.match(assets, /Copy-Item apps\/desktop-tauri\/component-release\/\*\.tar\.zst release-assets\//)
  for (const name of ['yourbuddy-components-$version.json', 'yourbuddy-components-$version.json.sig', 'yourbuddy-size-report-$version.json']) {
    assert.ok(assets.includes(`Copy-Item "apps/desktop-tauri/component-release/${name}" release-assets/`))
  }
})

function assertPublishingGuards(value) {
  const steps = value.jobs.build.steps
  for (const name of ['Check native acceptance prerequisites', 'Install prepared product acceptance browser', 'Verify prepared default workbench and optional Harbor', 'Remove Python bytecode excluded from component archives', 'Retain component archive measurements', 'Record installer archive sizes', 'Verify native Offline installation and cold starts', 'Retain updater metadata and checksums']) {
    assert.equal(steps.find(step => step.name === name).if, undefined)
  }
  for (const name of ['Upload prepared acceptance evidence', 'Upload native acceptance evidence']) {
    assert.equal(steps.find(step => step.name === name).if, 'always()')
  }
  assert.equal(value.on.workflow_dispatch.inputs.mode.default, 'existing-tag')
  assert.deepEqual(value.on.push.tags, ['yourbuddy-v*'])
  const publishers = steps.filter(step => /gh release (?:create|upload)|first-publication\.mjs publish|git (?:push|tag)/.test(step.run ?? ''))
  assert.deepEqual(publishers.map(({ name, if: condition }) => ({ name, condition })), [
    { name: 'Publish the verified master tag atomically', condition: "env.RELEASE_MODE == 'first-publication'" },
    { name: 'Publish release', condition: "env.RELEASE_MODE != 'candidate-validation'" },
  ])
  assert.equal(steps.find(step => step.name === 'Verify the candidate without publishing').if, "env.RELEASE_MODE == 'candidate-validation'")
  assert.equal(steps.find(step => step.name === 'Refuse an existing Release for tag retry').if, "env.RELEASE_MODE == 'existing-tag'")
  assert.match(steps.find(step => step.name === 'Refuse an existing Release for tag retry').run, /response\.status !== 404/)
  assert.equal(steps.find(step => step.name === 'Upload validation candidate artifacts').if, "env.RELEASE_MODE == 'candidate-validation'")
}

test('candidate mode cannot reach tag, release or updater-feed publication; retry guards remain', () => {
  assertPublishingGuards(workflow)
  for (const name of ['Publish the verified master tag atomically', 'Publish release']) {
    const unguarded = structuredClone(workflow)
    delete unguarded.jobs.build.steps.find(step => step.name === name).if
    assert.throws(() => assertPublishingGuards(unguarded))
  }
  const feed = structuredClone(workflow)
  feed.jobs.build.steps.push({ name: 'Publish candidate feed', run: 'gh release upload yourbuddy-updater release-assets/latest.json --clobber' })
  assert.throws(() => assertPublishingGuards(feed))
  const native = structuredClone(workflow)
  native.jobs.build.steps.find(step => step.name === 'Verify native Offline installation and cold starts').if = "env.RELEASE_TAG == 'yourbuddy-v0.4.11'"
  assert.throws(() => assertPublishingGuards(native))
  const evidence = structuredClone(workflow)
  evidence.jobs.build.steps.find(step => step.name === 'Upload prepared acceptance evidence').if = 'success()'
  assert.throws(() => assertPublishingGuards(evidence))
})

test('prepared acceptance stages workflow-revision Office fixtures without changing older tagged files', t => {
  const run = workflow.jobs.build.steps.find(step => step.name === 'Verify prepared default workbench and optional Harbor').run
  const start = run.indexOf('mkdirSync(documentFixtureDirectory)')
  const end = run.indexOf('await withProcessEnvironment', start)
  assert.ok(start >= 0 && end > start)
  assert.match(run, /const documentFixtureDirectory = join\(isolated\.root, 'document-preview-fixtures'\)/u)
  const passesFixtureDirectory = source => assert.match(source, /await verifyPreparedProduct\([^;]*?\{\s*capabilities: readPreparedCapabilities\(\),\s*desktopOverlayPath,\s*documentFixtureDirectory,/u)
  passesFixtureDirectory(run)
  assert.throws(() => passesFixtureDirectory(run.replace(/\n\s+documentFixtureDirectory,\n/u, '\n')))
  const cleanup = "rmSync(documentFixtureDirectory, { recursive: true, force: true })"
  assert.ok(run.indexOf(cleanup) > run.indexOf('} finally {'))
  const stage = Function('mkdirSync', 'writeFileSync', 'execFileSync', 'join', 'documentFixtureDirectory', 'sourceEnvironment', 'RELEASE_DOCUMENT_PREVIEWS', run.slice(start, end))
  const remove = Function('rmSync', 'documentFixtureDirectory', cleanup)
  for (const missingTrustedFixture of [false, true]) {
    const root = mkdtempSync(join(tmpdir(), 'yourbuddy-workflow-office-'))
    t.after(() => rmSync(root, { recursive: true, force: true }))
    const oldTag = join(root, 'old-tag')
    const world = join(root, 'world')
    const fixtures = join(root, 'workflow-fixtures')
    mkdirSync(oldTag)
    mkdirSync(world)
    assert.throws(() => writeDocumentPreviewFixtures(world, oldTag), /ENOENT/u)
    const execute = () => stage(mkdirSync, writeFileSync, (command, args) => {
      assert.equal(command, 'git')
      assert.equal(args[0], 'show')
      const prefix = 'trusted-workflow-commit:apps/desktop-tauri/scripts/fixtures/'
      assert.ok(args[1].startsWith(prefix))
      if (missingTrustedFixture && args[1].endsWith('.docx')) throw new Error('trusted fixture missing')
      return readFileSync(new URL(`fixtures/${args[1].slice(prefix.length)}`, import.meta.url))
    }, join, fixtures, { GITHUB_WORKFLOW_SHA: 'trusted-workflow-commit' }, RELEASE_DOCUMENT_PREVIEWS)
    try {
      if (missingTrustedFixture) assert.throws(execute, /trusted fixture missing/u)
      else {
        execute()
        writeDocumentPreviewFixtures(world, fixtures)
        for (const preview of RELEASE_DOCUMENT_PREVIEWS.filter(preview => preview.viewer)) {
          assert.deepEqual(readFileSync(join(world, preview.file)), readFileSync(join(fixtures, preview.file)))
          assert.equal(existsSync(join(oldTag, preview.file)), false)
        }
      }
    } finally { remove(rmSync, fixtures) }
    assert.equal(existsSync(fixtures), false)
  }
})
