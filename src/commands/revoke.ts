import {LifecycleStates} from '@deltadao/nautilus'
import {Args, Command, Flags} from '@oclif/core'
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
  static flags = {
    yes: Flags.boolean({
      char: 'y',
      description: 'Skip confirmation prompt',
      required: false,
      default: false,
    }),
  }

  static description = 'Publisher revocation of one or more owned DIDs'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a did:op:abcee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7b',
  ]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Revoke)
    const dids = args.dids.split(' ')
    const connection = await Connection.connect()
    if (flags.yes || readlineSync.keyInYNStrict(`Revoke assets ${dids.join(', ')}? `)) {
      try {
        for (const did of dids) {
          const aquariusAsset = await connection.nautilus.getAquariusAsset(did)
          this.log('Sending transaction to revoke asset...')
          const tx = await connection.nautilus.setAssetLifecycleState(
            aquariusAsset,
            LifecycleStates.REVOKED_BY_PUBLISHER,
          )
          this.log(`Asset revoked, transaction: ${connection.networkConfig.explorerUri}/tx/${tx.transactionHash}\n`)
        }
      } catch (error) {
        this.error(`Error revoking asset: ${error}`)
      }
    }
  }
}
