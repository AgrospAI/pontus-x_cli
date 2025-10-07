import {Args, Command, Flags} from '@oclif/core'
import readlineSync from 'readline-sync'

import {Connection} from '../utils/connection'

export default class ChangePrice extends Command {
  static args = {
    did: Args.string({description: 'DID of the asset', required: true}),
    newPrice: Args.string({
      description: 'New price for the asset',
      required: true,
    }),
  }
  static flags = {
    yes: Flags.boolean({
      char: 'y',
      description: 'Automatic yes to prompts',
      required: false,
      default: false,
    }),
  }
  static description = 'Change the price keeping the existing currency for an asset with the given DID'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a 10',
  ]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ChangePrice)
    const {did, newPrice} = args
    const connection = await Connection.connect()
    const newPriceNumber: number = Number.parseFloat(newPrice.replace(',', '.'))
    if (flags.yes || readlineSync.keyInYNStrict(`Set the price to ${newPriceNumber.toString()} for asset ${did}? `)) {
      try {
        const aquariusAsset = await connection.nautilus.getAquariusAsset(did)
        const serviceId = aquariusAsset.services?.[0]?.id
        const tx = await connection.nautilus.setServicePrice(aquariusAsset, serviceId, newPriceNumber.toString())
        this.log(
          `Price updated for asset, transaction: ${connection.networkConfig.explorerUri}/tx/${tx.transactionHash}\n`,
        )
      } catch (error) {
        this.error(`Error changing the price: ${error}`)
      }
    }
  }
}
