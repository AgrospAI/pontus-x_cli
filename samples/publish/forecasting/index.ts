import {
  AssetBuilder,
  ConsumerParameterBuilder,
  FileTypes,
  MetadataConfig,
  ServiceBuilder,
  ServiceTypes,
} from '@deltadao/nautilus'
import {ConsumerParameter} from '@oceanprotocol/lib'
import {readFileSync} from 'node:fs'

const publish = async (folder: string, connection: any, provider: string, dryRun: boolean) => {
  // ALGORITHM USER INPUT DATA
  const consumerParametersBuilder = new ConsumerParameterBuilder()
  const consumerParameters: ConsumerParameter[] = []

  consumerParameters.push(
    consumerParametersBuilder
      .setName('Dataset parameters')
      .setLabel('dataset')
      .setDescription(
        'Dataset parameters to train the model with, such as: separator, target_column, split, random_state and stratify.',
      )
      .setDefault(JSON.stringify(JSON.parse(readFileSync(`${folder}/dataset-default.json`, 'utf8'))))
      .setRequired(true)
      .setType('text')
      .build(),
  )

  consumerParametersBuilder.reset() // Reset the builder to create a new parameter

  consumerParameters.push(
    consumerParametersBuilder
      .setName('Model parameters')
      .setLabel('model')
      .setDescription('Model parameters to train the model with, such as: name, parameters and metrics.')
      .setDefault(JSON.stringify(JSON.parse(readFileSync(`${folder}/model-default.json`, 'utf8'))))
      .setRequired(true)
      .setType('text')
      .build(),
  )

  // ALGORITHM METADATA
  const algoMetadata: MetadataConfig['algorithm'] = {
    consumerParameters,
    container: {
      checksum: 'sha256:bd4e4ba94a5f93cb44934d7e5e3e9ab102aea148e09bbf16d6860fa64925f30b',
      entrypoint: 'python $ALGO',
      // entrypoint: "sleep infinity",
      image: 'clopezgarcia/timeseries-forecast',
      tag: 'latest',
    },
    language: 'python',
    version: '0.1',
  }

  const service = new ServiceBuilder({fileType: FileTypes.URL, serviceType: ServiceTypes.COMPUTE})
    .setServiceEndpoint(provider) // the access controller to be in control of this asset
    .setTimeout(0) // Timeout in seconds (0 means unlimited access after purchase)
    .addFile({
      method: 'GET', // HTTP request method
      type: 'url', // there are multiple supported data source types, see https://docs.oceanprotocol.com/developers/storage
      url: 'https://raw.githubusercontent.com/AgrospAI/ocean-algo/refs/heads/main/timeseries-forecast/algorithm/src/main.py',
      // headers: {
      //     Authorization: 'Basic XXX' // optional headers field e.g. for basic access control
      // }
    })
    .setPricing(connection.pricingConfig.fixedRateEUROe(0))
    .setDatatokenNameAndSymbol('UdL scikit-learn forecasting model trainer', 'UDL-SKFORECAST')
    .build()

  const asset = new AssetBuilder()
    .setType('algorithm')
    .setName('SciKit-Learn Forecasting Model Trainer')
    .setAuthor('Universitat de Lleida (UdL)')
    .setOwner(connection.wallet.address)
    .setDescription(readFileSync(`${folder}/description.md`, 'utf8'))
    .addTags(['forecasting', 'ml', 'sklearn', 'scikit-learn', 'tabular-data', 'pandas', 'udl', 'agrospai'])
    .setLicense('MIT')
    .setNftData({
      name: 'UdL scikit-learn forecasting model trainer',
      symbol: 'UDL-SKLEARN',
      templateIndex: 1,
      tokenURI: 'https://scikit-learn.org/stable/_static/scikit-learn-logo-small.png',
      transferable: false,
    })
    .setAlgorithm(algoMetadata)
    .addService(service)
    .build()

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
