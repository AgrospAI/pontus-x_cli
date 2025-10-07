import {AssetBuilder, ConsumerParameterBuilder, CredentialListTypes, ServiceBuilder} from '@deltadao/nautilus'
import Ajv from 'ajv'
import yaml from 'js-yaml'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import type PublishConfig from '../types/publish'
import {Connection} from '../utils/connection'
import schema from '../types/schema'

function parseConfig(filePath: string): PublishConfig {
  const raw = readFileSync(filePath, 'utf-8')
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.json') {
    return JSON.parse(raw)
  } else if (ext === '.yaml') {
    return yaml.load(raw) as PublishConfig
  } else {
    throw new Error(`Unsupported file extension: ${ext}`)
  }
}

export const publishFromFile = async (
  filePath: string,
  providerUrl: string,
  connection: Connection,
  dryRun: boolean,
) => {
  const config: PublishConfig = parseConfig(filePath)

  const ajv = new Ajv()
  const validate = ajv.compile(schema)
  const valid = validate(config)

  if (!valid) {
    console.error('❌ Invalid publish config file:')
    console.error(validate.errors)
    process.exit(1)
  }

  const folder = path.dirname(filePath)

  const assetBuilder = new AssetBuilder()
    .setType(config.metadata.type)
    .setName(config.metadata.name)
    .setAuthor(config.metadata.author)
    .setOwner(connection.wallet.address)
    .setDescription(readFileSync(path.resolve(folder, config.metadata.description), 'utf8'))
    .setLicense(config.metadata.license)
    .setNftData(config.nftData)

  if (config.metadata.tags) {
    assetBuilder.addTags(config.metadata.tags)
  }

  if (config.metadata.links) {
    assetBuilder.addLinks(config.metadata.links)
  }

  if (config.credentials) {
    if (config.credentials.allow) {
      assetBuilder.addCredentialAddresses(CredentialListTypes.ALLOW, config.credentials.allow)
    }
    if (config.credentials.deny) {
      assetBuilder.addCredentialAddresses(CredentialListTypes.DENY, config.credentials.deny)
    }
  }

  if (config.metadata.additionalInformation) {
    assetBuilder.addAdditionalInformation(config.metadata.additionalInformation)
  }

  if (config.metadata.type === 'algorithm' && config.metadata.algorithm) {
    const consumerParameters = []
    for (const param of config.metadata.algorithm.consumerParameters || []) {
      const consumerParameter = new ConsumerParameterBuilder()
        .setType(param.type)
        .setName(param.name)
        .setLabel(param.label)
        .setDescription(param.description)
        .setRequired(param.required)
        .setDefault(typeof param.default === 'object' ? JSON.stringify(param.default) : param.default)

      for (const option of param.options || []) {
        consumerParameter.addOption(option)
      }

      consumerParameters.push(consumerParameter.build())
    }

    const algorithm = {
      language: config.metadata.algorithm.language,
      version: config.metadata.algorithm.version,
      container: config.metadata.algorithm.container,
    }

    assetBuilder.setAlgorithm(consumerParameters.length > 0 ? {...algorithm, consumerParameters} : algorithm)
  }

  const serviceBuilder = new ServiceBuilder({
    fileType: config.service.fileType,
    serviceType: config.service.serviceType,
  })

  for (const file of config.service.files) {
    serviceBuilder.addFile(file)
  }

  for (const param of config.service.consumerParameters || []) {
    // Stringify param.default if it's an object
    const defaultValue = typeof param.default === 'object' ? JSON.stringify(param.default) : param.default

    const consumerParam = new ConsumerParameterBuilder()
      .setType(param.type)
      .setName(param.name)
      .setLabel(param.label)
      .setDescription(param.description)
      .setRequired(param.required)
      .setDefault(defaultValue)
      .build()

    serviceBuilder.addConsumerParameter(consumerParam)
  }

  if (config.trustedAlgorithms) {
    serviceBuilder.addTrustedAlgorithms(config.trustedAlgorithms)
  }

  for (const trustedAlgorithmPublisher of config.trustedAlgorithmPublishers || []) {
    serviceBuilder.addTrustedAlgorithmPublisher(trustedAlgorithmPublisher)
  }

  if (config.trustOwnerAlgorithms) {
    serviceBuilder.addTrustedAlgorithmPublisher(connection.wallet.address)
  }

  if (config.allowAlgorithmNetworkAccess !== undefined) {
    serviceBuilder.allowAlgorithmNetworkAccess(config.allowAlgorithmNetworkAccess)
  }

  serviceBuilder
    .setServiceEndpoint(providerUrl)
    .setTimeout(config.service.timeout)
    .setDatatokenNameAndSymbol(config.service.datatoken.name, config.service.datatoken.symbol)
    .setPricing(
      config.service.pricing.type === 'free' || !config.service.pricing.amount
        ? {type: 'free'}
        : config.service.pricing.currency === 'EUROe'
          ? connection.pricingConfig.fixedRateEUROe(config.service.pricing.amount)
          : connection.pricingConfig.fixedRateOCEAN(config.service.pricing.amount),
    )

  const service = serviceBuilder.build()

  assetBuilder.addService(service)

  const asset = assetBuilder.build()

  console.log(`\n✅ Asset metadata:\n${JSON.stringify(asset, null, 2)}\n`)

  if (dryRun) {
    console.log('⚠️  Dry run enabled. Asset not published.\n')
    return
  }

  console.log(`🚀 Publishing asset...`)

  const result = await connection.nautilus.publish(asset)
  console.log(
    [
      '✅ Asset published.',
      `🔗 Transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}`,
      `🌐 Asset: https://portal.agrospai.udl.cat/asset/${result.ddo.id}`,
    ].join('\n'),
  )

  return asset.ddo.id
}
