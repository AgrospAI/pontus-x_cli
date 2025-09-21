import {AssetBuilder, FileTypes, ServiceBuilder, ServiceFileType, ServiceTypes} from '@deltadao/nautilus'
import {readFileSync} from 'node:fs'

const publish = async (folder: string, connection: any, provider: string, dryRun: boolean) => {
  const assetBuilder = new AssetBuilder()
  assetBuilder
    .setType('dataset')
    .setName('Red Wine Dataset')
    .setAuthor('Cortez et al., 2009')
    .setOwner(connection.wallet.address)
    .setDescription(readFileSync(`${folder}/description.md`, 'utf8'))
    .addTags(['agriculture', 'wine', 'agrospai', 'udl', 'tabular-data'])
    .setLicense('CC-BY-4.0')
    .setNftData({
      name: 'Red Wine',
      symbol: 'RED',
      templateIndex: 1,
      tokenURI:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Red_and_white_wine_12-2015.jpg/240px-Red_and_white_wine_12-2015.jpg',
      transferable: false,
    })
    .addLinks(['https://archive.ics.uci.edu/dataset/186/wine+quality'])

  const serviceBuilder = new ServiceBuilder({fileType: FileTypes.URL, serviceType: ServiceTypes.COMPUTE})
  const urlFile: ServiceFileType<FileTypes> = {
    method: 'GET', // HTTP request method
    type: 'url', // there are multiple supported data source types, see https://docs.oceanprotocol.com/developers/storage
    url: 'https://raw.githubusercontent.com/plotly/datasets/master/winequality-red.csv',
    // headers: {
    //     Authorization: 'Basic XXX' // optional headers field e.g. for basic access control
    // }
  }
  const service = serviceBuilder
    .setServiceEndpoint(provider) // the access controller to be in control of this asset
    .setTimeout(0) // Timeout in seconds (0 means unlimited access after purchase)
    .addFile(urlFile)
    .addTrustedAlgorithmPublisher(connection.wallet.address)
    // .addTrustedAlgorithms([{ did: 'did:op:c1e39404719ee92613b3bf9c276bbdcd63473c1189b34cef9f3de22cdb8eaf53' }])
    .allowAlgorithmNetworkAccess(false)
    .setPricing(connection.pricingConfig.fixedRateEUROe(0))
    .setDatatokenNameAndSymbol(`Red Wine`, `RED`)
    .build()
  assetBuilder.addService(service)
  const asset = assetBuilder.build()
  console.log(`Asset metadata: \n ${JSON.stringify(asset, null, 2)}`)

  if (dryRun) {
    console.log('\nDry run completed. Asset not published.\n')
  } else {
    console.log(`Publishing asset...`)
    const result = await connection.nautilus.publish(asset)
    console.log(
      `Asset published, ` +
        `transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
    )
  }
}
