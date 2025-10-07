import {AssetBuilder} from '@deltadao/nautilus'
import {Args, Command, Flags} from '@oclif/core'
import readlineSync from 'readline-sync'

import {Connection} from '../utils/connection'

export default class EditAlgo extends Command {
  static args = {
    did: Args.string({description: 'Algorithm DID', required: true}),
    image: Args.string({description: 'Container image', required: true}),
    tag: Args.string({description: 'Container tag', required: true}),
    checksum: Args.string({description: 'Image checksum', required: true}),
    entrypoint: Args.string({description: 'Algorithm entrypoint', required: true}),
  }
  static flags = {
    yes: Flags.boolean({char: 'y', description: 'Skip confirmation prompt', required: false, default: false}),
  }
  static description = 'Change the container metadata for a given algorithm DID'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> did:op:dcdb747f8feff3122c6d6c0f45a339a6e09415e721f98f61cc2c1d62ab35a21f rogargon/pandas-profiling 4.16 sha256:81dca5439f07dff4d56097546a9fce7335be3de8e2622dc105c64e54376f86b5 "python /algorithm/src/main.py"',
  ]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(EditAlgo)
    const {checksum, did, image, tag, entrypoint} = args
    const connection = await Connection.connect()
    if (
      flags.yes ||
      readlineSync.keyInYNStrict(
        `Change the container metadata for asset ${did}` +
          `to entrypoint "${entrypoint}" for ${image}:${tag} and image checksum ${checksum}? `,
      )
    ) {
      try {
        const aquariusAsset = await connection.nautilus.getAquariusAsset(did)
        const assetBuilder = new AssetBuilder(aquariusAsset)
        const asset = assetBuilder
          .setAlgorithm({
            ...aquariusAsset.metadata.algorithm,
            container: {
              ...aquariusAsset.metadata.algorithm!.container,
              checksum,
              image,
              tag,
              entrypoint,
            },
          })
          .build()
        const result = await connection.nautilus.edit(asset)
        this.log(
          `Container metadata updated for the algorithm, transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
        )
      } catch (error) {
        this.error(`Error editing container metadata: ${error}`)
      }
    }
  }
}
