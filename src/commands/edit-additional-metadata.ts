import {AssetBuilder} from '@deltadao/nautilus'
import {Args, Command, Flags} from '@oclif/core'
import readlineSync from 'readline-sync'
import * as fs from 'node:fs'
import {Connection} from '../utils/connection'

export default class EditAlgo extends Command {
  static args = {
    did: Args.string({description: 'Algorithm DID', required: true}),
    metadatafile: Args.string({description: 'JSON metadata file path', required: true})
  }
  static flags = {
    yes: Flags.boolean({char: 'y', description: 'Skip confirmation prompt', required: false, default: false}),
  }
  static description = 'Change the container additional metadata for a given DID'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> did:op:dcdb747f8feff3122c6d6c0f45a339a6e09415e721f98f61cc2c1d62ab35a21f ./metadata.json',
  ]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(EditAlgo)
    const {did, metadatafile} = args
    const connection = await Connection.connect()
    if (
      flags.yes ||
      readlineSync.keyInYNStrict(
        `Update the asset additional metadata for asset ${did}` +
          `to that in file "${metadatafile}? `,
      )
    ) {
      try {
        const aquariusAsset = await connection.nautilus.getAquariusAsset(did)
        const assetBuilder = new AssetBuilder(aquariusAsset)
        const additionalMetadata = JSON.parse(fs.readFileSync(metadatafile, 'utf-8'))
        this.log(`New additional metadata: ${JSON.stringify(additionalMetadata, null, 2)}`)
        const asset = assetBuilder
          .addAdditionalInformation(additionalMetadata)
          .build()
        const result = await connection.nautilus.edit(asset)
        this.log(
          `Asset additional metadata updated, transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
        )
      } catch (error) {
        this.error(`Error editing container metadata: ${error}`)
      }
    }
  }
}
