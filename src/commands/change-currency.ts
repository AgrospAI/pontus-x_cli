import { AssetBuilder, getServices, ServiceBuilder } from '@deltadao/nautilus'
import { Args, Command, Flags } from '@oclif/core'
import readlineSync from 'readline-sync'

import { Connection } from '../utils/connection'

export default class ChangeCurrency extends Command {
  static args = {
    did: Args.string({ description: 'DID of the asset', required: true }),
    newCurrency: Args.string({
      description: 'New currency for the asset',
      options: [ "EURAU", "EUROe" ],
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
  static description = 'Change the currency keeping the existing price for an asset with the given DID'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a EURAU',
  ]

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ChangeCurrency)
    const { did, newCurrency } = args
    const connection = await Connection.connect()

    if (flags.yes || readlineSync.keyInYNStrict(`Set the current price to currency ${newCurrency} for asset ${did}? `)) {
      try {
        if (!connection.remoteStore) {
          throw new Error(
            "Editing requires a remote store. Please set PINATA_JWT or IPFS_UPLOAD_URL in your environment.",
          )
        }

        const published = await connection.nautilus.getAsset(did)
        const assetBuilder = new AssetBuilder(published)
        const serviceId = getServices(published)[0]?.id || (published as any).services[0]?.id
        const serviceBuilder = new ServiceBuilder({
          asset: published,
          serviceId,
        })
        const currentPrice =
          (published as any).stats?.price?.value ?? 0
        if (newCurrency === "EUROe") {
          serviceBuilder.setPricing(connection.pricingConfig.fixedRateEUROe(currentPrice))
        } else {
          serviceBuilder.setPricing(connection.pricingConfig.fixedRateEURAU(currentPrice))
        }
        const service = serviceBuilder.build()
        const asset = assetBuilder.addService(service).build()
        const result = await connection.nautilus.edit(asset)
        const txHash =
          (result.setMetadataTxReceipt as any).hash ||
          (result.setMetadataTxReceipt as any).transactionHash
        this.log(
          `Price currency updated, transaction: ${connection.networkConfig.explorerUri}/tx/${txHash}\n`,
        )
      } catch (error) {
        this.error(`Error changing the currency: ${error}`)
      }
    }
  }
}
