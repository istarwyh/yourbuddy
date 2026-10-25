/** External native-installer substitute; never installs or stops an application. */
import { appendFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const args = process.argv.slice(2)
if (args[0] !== '--yourbuddy-installer') throw new Error('Expected native installer entry')
const action = args[1]
const root = join(process.cwd(), '.dsh', 'upgrade-fixture')
await appendFile(join(root, 'commands.jsonl'), JSON.stringify(args) + '\n')
const record = { id: 'yourbuddy-upgrade-1', phase: 'accepted', targetVersion: '1.2.3' }
if (action === 'install') await writeFile(join(root, 'operation.json'), JSON.stringify(record))
else if (action === 'handoff') await writeFile(join(root, 'handoff'), record.id)
else if (action === 'cancel' || args.includes('--wait')) record.phase = 'needsUserAction'
else if (action !== 'status') throw new Error('Unexpected native installer action')
process.stdout.write(JSON.stringify(record) + '\n')
