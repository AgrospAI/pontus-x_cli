import {LifecycleStates} from '@deltadao/nautilus'
import {Args, Command} from '@oclif/core'
import readlineSync from 'readline-sync'

import {Connection} from '../utils/connection'

export default class Revoke extends Command {
  static args = {
    dids: Args.string({
      description: 'DIDs to revoke',
      multiple: true,
      required: true,
    }),
  }
  static description = 'Publisher revocation of one or more owned DIDs'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(Revoke)
    const dids = Array.isArray(args.dids) ? args.dids : [args.dids]
    const connection = await Connection.connect()
    if (readlineSync.keyInYNStrict(`Revoke assets ${dids.join(', ')}? `)) {
      try {
        await Promise.all(
          dids.map(async (did) => {
            const aquariusAsset = await connection.nautilus.getAquariusAsset(did)
            this.log('Sending transaction to revoke asset...')
            const tx = await connection.nautilus.setAssetLifecycleState(
              aquariusAsset,
              LifecycleStates.REVOKED_BY_PUBLISHER,
            )
            this.log(`Asset revoked, transaction: ${connection.networkConfig.explorerUri}/tx/${tx.transactionHash}\n`)
          }),
        )
      } catch (error) {
        this.error(`Error revoking asset: ${error}`)
      }
    }
  }
}
