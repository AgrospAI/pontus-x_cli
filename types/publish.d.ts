import type {
  FileTypes,
  NftCreateDataWithoutOwner,
  PricingConfig,
  ServiceFileType,
  ServiceTypes,
  TrustedAlgorithmAsset,
} from '@deltadao/nautilus'
import type {Metadata, MetadataAlgorithm, ConsumerParameter} from '@oceanprotocol/ddo-js'

type ExtendedConsumerParameter = Omit<ConsumerParameter, 'options'> & {
  options?: {[value: string]: string}[]
}

type MetadataConfig = Omit<Metadata, 'created' | 'updated' | 'algorithm'> & {
  algorithm?: MetadataAlgorithm & {
    consumerParameters?: ExtendedConsumerParameter[]
  }
}

export type PricingType = PricingConfig['type']

export default interface PublishConfig {
  metadata: MetadataConfig
  nftData: NftCreateDataWithoutOwner
  credentials?: {
    allow?: string[]
    deny?: string[]
  }
  trustedAlgorithms?: TrustedAlgorithmAsset[]
  trustedAlgorithmPublishers?: string[]
  trustOwnerAlgorithms?: boolean
  allowAlgorithmNetworkAccess?: boolean
  service: {
    serviceType: ServiceTypes
    fileType: FileTypes
    serviceEndpoint: string
    timeout: number
    files: ServiceFileType<FileTypes>[]
    pricing: {
      type: 'free' | 'fixed'
      currency?: 'OCEAN' | 'EUROe'
      amount?: number
    }
    datatoken: {
      name: string
      symbol: string
    }
    consumerParameters?: ExtendedConsumerParameter[]
  }
}
