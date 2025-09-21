import {PricingConfigWithoutOwner} from '@deltadao/nautilus'

export enum Network {
  GENX = 'GENX',
  PONTUSXDEV = 'PONTUSXDEV',
  PONTUSXTEST = 'PONTUSXTEST',
}

export const NETWORK_CONFIGS: {[key in Network]: NetworkConfig} = {
  [Network.GENX]: {
    chainId: 100,
    dispenserAddress: '0x94cb8FC8719Ed09bE3D9c696d2037EA95ef68d3e',
    explorerUri: 'https://logging.genx.minimal-gaia-x.eu',
    fixedRateExchangeAddress: '0xAD8E7d2aFf5F5ae7c2645a52110851914eE6664b',
    metadataCacheUri: 'https://aquarius510.v4.delta-dao.com',
    network: 'genx',
    nftFactoryAddress: '0x6cb85858183B82154921f68b434299EC4281da53',
    nodeUri: 'https://rpc.genx.minimal-gaia-x.eu',
    oceanTokenAddress: '0x0995527d3473b3a98c471f1ed8787acd77fbf009',
    oceanTokenSymbol: 'OCEAN',
    providerAddress: '0x68C24FA5b2319C81b34f248d1f928601D2E5246B',
    providerUri: 'https://provider.v4.genx.delta-dao.com',
    subgraphUri: 'https://subgraph.v4.genx.minimal-gaia-x.eu',
  },
  [Network.PONTUSXDEV]: {
    chainId: 32_456,
    dispenserAddress: '0x5461b629E01f72E0A468931A36e039Eea394f9eA',
    explorerUri: 'https://explorer.pontus-x.eu/pontusx/dev',
    fixedRateExchangeAddress: '0x8372715D834d286c9aECE1AcD51Da5755B32D505',
    metadataCacheUri: 'https://aquarius.pontus-x.eu',
    network: 'pontusxdev',
    nftFactoryAddress: '0xFdC4a5DEaCDfc6D82F66e894539461a269900E13',
    nodeUri: 'https://rpc.dev.pontus-x.eu',
    oceanTokenAddress: '0xdF171F74a8d3f4e2A789A566Dce9Fa4945196112',
    oceanTokenSymbol: 'OCEAN',
    providerAddress: '0x68C24FA5b2319C81b34f248d1f928601D2E5246B',
    providerUri: 'https://provider.dev.pontus-x.eu',
    subgraphUri: 'https://subgraph.dev.pontus-x.eu',
  },
  [Network.PONTUSXTEST]: {
    chainId: 32_457,
    dispenserAddress: '0xaB5B68F88Bc881CAA427007559E9bbF8818026dE',
    explorerUri: 'https://explorer.pontus-x.eu/pontusx/test',
    fixedRateExchangeAddress: '0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E',
    metadataCacheUri: 'https://aquarius.pontus-x.eu',
    network: 'pontusxtest',
    nftFactoryAddress: '0x2C4d542ff791890D9290Eec89C9348A4891A6Fd2',
    nodeUri: 'https://rpc.test.pontus-x.eu',
    oceanTokenAddress: '0x5B190F9E2E721f8c811E4d584383E3d57b865C69',
    oceanTokenSymbol: 'OCEAN',
    providerAddress: '0x9546d39CE3E48BC942f0be4AA9652cBe0Aff3592',
    providerUri: 'https://provider.test.pontus-x.eu',
    subgraphUri: 'https://subgraph.test.pontus-x.eu',
  },
}

// These are example pricing configurations with prefilled contract addresses of the payment tokens
export const PRICING_CONFIGS: {[key in Network]: PricingConfigGenerators} = {
  [Network.GENX]: {
    fixedRateEUROe(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        freCreationParams: {
          baseTokenAddress: '0xe974c4894996E012399dEDbda0bE7314a73BBff1',
          baseTokenDecimals: 6, // adapted for EUROe decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: '0xAD8E7d2aFf5F5ae7c2645a52110851914eE6664b',
          marketFee: '0',
          marketFeeCollector: '0x0000000000000000000000000000000000000000',
        },
        type: 'fixed',
      }
    },
    fixedRateOcean(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        freCreationParams: {
          baseTokenAddress: '0x0995527d3473b3a98c471f1ed8787acd77fbf009',
          baseTokenDecimals: 18,
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: '0xAD8E7d2aFf5F5ae7c2645a52110851914eE6664b',
          marketFee: '0',
          marketFeeCollector: '0x0000000000000000000000000000000000000000',
        },
        type: 'fixed',
      }
    },
  },
  [Network.PONTUSXDEV]: {
    fixedRateEUROe(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        freCreationParams: {
          baseTokenAddress: '0x8A4826071983655805bF4f29828577Cd6b1aC0cB',
          baseTokenDecimals: 18, // adapted for EUROe decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: '0x8372715D834d286c9aECE1AcD51Da5755B32D505',
          marketFee: '0',
          marketFeeCollector: '0x0000000000000000000000000000000000000000',
        },
        type: 'fixed',
      }
    },
    fixedRateOcean(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        freCreationParams: {
          baseTokenAddress: '0xdF171F74a8d3f4e2A789A566Dce9Fa4945196112',
          baseTokenDecimals: 18,
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: '0x8372715D834d286c9aECE1AcD51Da5755B32D505',
          marketFee: '0',
          marketFeeCollector: '0x0000000000000000000000000000000000000000',
        },
        type: 'fixed',
      }
    },
  },
  [Network.PONTUSXTEST]: {
    fixedRateEUROe(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        freCreationParams: {
          baseTokenAddress: '0xdd0a0278f6BAF167999ccd8Aa6C11A9e2fA37F0a',
          baseTokenDecimals: 6, // adapted for EUROe decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: '0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E',
          marketFee: '0',
          marketFeeCollector: '0x0000000000000000000000000000000000000000',
        },
        type: 'fixed',
      }
    },
    fixedRateOcean(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        freCreationParams: {
          baseTokenAddress: '0x5B190F9E2E721f8c811E4d584383E3d57b865C69',
          baseTokenDecimals: 18,
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: '0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E',
          marketFee: '0',
          marketFeeCollector: '0x0000000000000000000000000000000000000000',
        },
        type: 'fixed',
      }
    },
  },
}

export type NetworkConfig = {
  chainId: number
  DFRewards?: string
  DFStrategyV1?: string
  dispenserAddress: string
  explorerUri?: string
  fixedRateExchangeAddress: string
  gasFeeMultiplier?: number
  metadataCacheUri: string
  network: string
  nftFactoryAddress: string
  nodeUri: string
  oceanTokenAddress: string
  oceanTokenSymbol: string
  opfCommunityFeeCollector?: string
  providerAddress?: string
  providerUri: string
  startBlock?: number
  subgraphUri: string
  transactionBlockTimeout?: number
  transactionConfirmationBlocks?: number
  transactionPollingTimeout?: number
  veAllocate?: string
  veDelegation?: string
  veDelegationProxy?: string
  veFeeDistributor?: string
  veFeeEstimate?: string
  veOCEAN?: string
}

export interface FixedRatePricingConfigGenerator {
  (rate: number): PricingConfigWithoutOwner
}

export type PricingConfigGenerators = {
  fixedRateEUROe: FixedRatePricingConfigGenerator
  fixedRateOcean: FixedRatePricingConfigGenerator
}
