import {test} from 'vitest'

import ExportPrivateKey from '../../src/commands/export-private-key'

const PRIVATE_KEY = '49863e3575baf7af5186a4aeae10bbfdc1ca182d9e75c02a76ab565a742a86cd'
const PASSWORD = ''

test('export private key', async () => {
  await ExportPrivateKey.run(['-k', PRIVATE_KEY, '-p', PASSWORD])
})
