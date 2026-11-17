import type { Hook } from '@oclif/core'
import { offerUpdate } from '../../lib/update'

const hook: Hook.Init = async function ({ id, config, context }) {
  // The explicit command performs its own uncached check, after parsing flags.
  if (id === 'update') return
  let updated = false
  try {
    updated = await offerUpdate({ cacheDir: config.cacheDir, version: config.version })
  } catch (error) {
    context.error(error instanceof Error ? error : String(error))
  }
  if (updated) context.exit(0)
}

export default hook
