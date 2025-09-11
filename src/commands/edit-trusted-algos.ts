import {AssetBuilder, ServiceBuilder} from '@deltadao/nautilus'
import {Args, Command, Flags} from '@oclif/core'
import readlineSync from 'readline-sync'

import {Connection} from '../utils/connection'

export default class EditTrustedAlgos extends Command {
  static args = {
    did: Args.string({description: 'DID of the asset', required: true}),
  }
  static description = 'Overwrite the trusted algorithms for a data asset to the provided algorithm DIDs'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a --algos did:op:8f9994d01975cadd0196a2f7f811ed850e5d02a7223e7c5a31faaebe7371c81a did:op:0b970c95211cb8ef4574383386376646081bb7eb949b2a75e1e2171ea25949a7',
  ]
  static flags = {
    algos: Flags.string({
      description: 'Algorithm DIDs',
      multiple: true,
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(EditTrustedAlgos)
    const {did} = args
    const {algos} = flags
    const connection = await Connection.connect()
    if (readlineSync.keyInYNStrict(`Changing the trusted algorithms for ${did} to [${algos.join(', ')}]? `)) {
      try {
        const aquariusAsset = await connection.nautilus.getAquariusAsset(did)
        const assetBuilder = new AssetBuilder(aquariusAsset)
        const serviceBuilder = new ServiceBuilder({
          aquariusAsset,
          serviceId: aquariusAsset.services[0].id,
        })
        serviceBuilder.addTrustedAlgorithms(algos.map((algo: string) => ({did: algo})))
        const service = serviceBuilder.build()
        const asset = assetBuilder.addService(service).build()
        const result = await connection.nautilus.edit(asset)
        this.log(
          `Edited the trusted algorithms, transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
        )
      } catch (error) {
        this.error(`Error editing the trusted algorithms: ${error}`)
      }
    }
  }
}
