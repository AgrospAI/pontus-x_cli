import Publish from '../../src/commands/publish'
import Revoke from '../../src/commands/revoke'
import {ALGORITHM1_SPEC, ALGORITHM2_SPEC, DATASET1_SPEC, DATASET2_SPEC, STATE_FILE} from '../config'
import fs from 'node:fs'

interface Assets {
  algorithm1Did: string
  algorithm2Did: string
  dataset1Did: string
  dataset2Did: string
}

export async function initializeAssets() {
  console.log('🚀 Publishing assets for integration tests...')

  const PublishAsset = async (spec: string) => {
    console.log(`Publishing ${spec}...`)
    const did = await Publish.run([spec])
    console.log(`✅ Published ${spec}: ${did}`)
    return did as string
  }

  // NOTE: we publish sequentially because parallel publishing throws errors
  const algorithm1Did = await PublishAsset(ALGORITHM1_SPEC)
  const algorithm2Did = await PublishAsset(ALGORITHM2_SPEC)
  const dataset1Did = await PublishAsset(DATASET1_SPEC)
  const dataset2Did = await PublishAsset(DATASET2_SPEC)

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        algorithm1Did,
        algorithm2Did,
        dataset1Did,
        dataset2Did,
      },
      null,
      2,
    ),
  )

  console.log('⏳ Waiting for assets to propagate on the network...')
  await new Promise((resolve) => setTimeout(resolve, 5000))

  console.log('✅ All assets ready for integration tests.')
}

export function getAssets() {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('State file not found. Please run initializeAssets() first.')
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))

  if (!state) {
    throw new Error('No state found in state file. Please run initializeAssets() first.')
  }

  return state as Assets
}

export async function revokeAssets() {
  console.log('🛑 Revoking assets used in integration tests...')

  if (!fs.existsSync(STATE_FILE)) {
    console.log('No state file found, skipping revocation.')
    return
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))

  if (!state) {
    console.log('No state found in state file, skipping revocation.')
    return
  }

  const dids = Object.values(state) as string[]

  if (dids.length === 0) {
    console.log('No DIDs found in state file, skipping revocation.')
    return
  }

  await Revoke.run([dids.join(' '), '-y'])

  fs.unlinkSync(STATE_FILE)

  console.log('✅ All assets revoked.')
}

if (typeof require !== 'undefined' && require.main === module) {
  const cmd = process.argv[2]
  if (cmd === 'initializeAssets') {
    initializeAssets().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err)
      process.exit(1)
    })
  } else if (cmd === 'revokeAssets') {
    revokeAssets().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err)
      process.exit(1)
    })
  } else {
    // eslint-disable-next-line no-console
    console.error('Usage: npx ts-node test/helpers/assets.ts <command>')
    process.exit(2)
  }
}
