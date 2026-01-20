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
    .addAdditionalInformation({
      "termsAndConditions": true,
      "gaiaXInformation": {
        "termsAndConditions": [
          {
            "url": "https://creativecommons.org/licenses/by/4.0/"
          }
        ]
      },
      "http://purl.org/dc/terms/spatial": {
        "@type": ["http://purl.org/dc/terms/Location", "http://www.w3.org/2004/02/skos/core#Concept"],
        "http://www.w3.org/2004/02/skos/core#prefLabel": "Denominação de Origem Vinho Verde",
        "http://www.w3.org/ns/dcat#bbox": {
          "@type": "http://www.opengis.net/ont/geosparql#wktLiteral",
          "@value": "POLYGON(( -8.8 40.95, -7.60 40.95, -7.60 42.00, -8.8 42.00, -8.8 40.95 ))"
        }
      }
    })

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
    .setTimeout(3600) // Timeout in seconds, 0 means unlimited access after purchase, while:
      // 1 year = 31536000, 1 month = 2630000, 1 week = 604800, 1 day = 86400, 1 hour = 3600
    .addFile(urlFile)
    .allowAlgorithmNetworkAccess(false)
    .setPricing(connection.pricingConfig.fixedRateEURAU(1))
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
