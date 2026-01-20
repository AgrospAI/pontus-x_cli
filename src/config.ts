import { PricingConfigWithoutOwner } from '@deltadao/nautilus'

export enum Network {
  PONTUSXDEV = 'PONTUSXDEV',
  PONTUSXTEST = 'PONTUSXTEST',
}

export const NETWORK_CONFIGS: {
    [key in Network]: NetworkConfig
} = {
    [Network.PONTUSXDEV]: {
        chainId: 32456,
        network: 'pontusxdev',
        metadataCacheUri: 'https://aquarius.pontus-x.eu',
        nodeUri: 'https://rpc.dev.pontus-x.eu',
        providerUri: 'https://provider.dev.pontus-x.eu',
        subgraphUri: 'https://subgraph.dev.pontus-x.eu',
        oceanTokenAddress: '0xdF171F74a8d3f4e2A789A566Dce9Fa4945196112',
        oceanTokenSymbol: 'OCEAN',
        fixedRateExchangeAddress: '0x8372715D834d286c9aECE1AcD51Da5755B32D505',
        dispenserAddress: '0x5461b629E01f72E0A468931A36e039Eea394f9eA',
        nftFactoryAddress: '0xFdC4a5DEaCDfc6D82F66e894539461a269900E13',
        providerAddress: '0x68C24FA5b2319C81b34f248d1f928601D2E5246B',
        explorerUri: 'https://explorer.pontus-x.eu/pontusx/dev'
    },[Network.PONTUSXTEST]: {
        chainId: 32457,
        network: 'pontusxtest',
        metadataCacheUri: 'https://aquarius.pontus-x.eu',
        nodeUri: 'https://rpc.test.pontus-x.eu',
        providerUri: 'https://provider.test.pontus-x.eu',
        subgraphUri: 'https://subgraph.test.pontus-x.eu',
        oceanTokenAddress: '0x5B190F9E2E721f8c811E4d584383E3d57b865C69',
        oceanTokenSymbol: 'OCEAN',
        fixedRateExchangeAddress: '0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E',
        dispenserAddress: '0xaB5B68F88Bc881CAA427007559E9bbF8818026dE',
        nftFactoryAddress: '0x2C4d542ff791890D9290Eec89C9348A4891A6Fd2',
        providerAddress: '0x9546d39CE3E48BC942f0be4AA9652cBe0Aff3592',
        explorerUri: 'https://explorer.pontus-x.eu/pontusx/test'
    },
}

// These are example pricing configurations with prefilled contract addresses of the payment tokens
export const PRICING_CONFIGS: {[key in Network]: PricingConfigGenerators} = {
  [Network.PONTUSXDEV]: {
    fixedRateEUROe(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        type: 'fixed',
        freCreationParams: {
            fixedRateAddress: '0x8372715D834d286c9aECE1AcD51Da5755B32D505',
            baseTokenAddress: '0x8A4826071983655805bF4f29828577Cd6b1aC0cB',
            baseTokenDecimals: 18, // adapted for EUROe decimals
            datatokenDecimals: 18,
            fixedRate: `${rate}`,
            marketFee: '0.05',
            marketFeeCollector: '0x94549951623dd6c3265dbbb1b032d6cf48ba7811',
        }
      }
    },
    fixedRateEURAU(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        type: 'fixed',
        freCreationParams: {
          fixedRateAddress: '0x8372715D834d286c9aECE1AcD51Da5755B32D505',
          baseTokenAddress: '0x852381bB887d3Cf4AEB9e1E9De3eB033AF82fBeE',
          baseTokenDecimals: 6, // adapted for EURAU decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          marketFee: '0.05',
          marketFeeCollector: '0x94549951623dd6c3265dbbb1b032d6cf48ba7811',
        }
      }
    },
  },
  [Network.PONTUSXTEST]: {
    fixedRateEUROe(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        type: 'fixed',
        freCreationParams: {
          fixedRateAddress: '0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E',
          baseTokenAddress: '0xdd0a0278f6BAF167999ccd8Aa6C11A9e2fA37F0a',
          baseTokenDecimals: 6, // adapted for EUROe decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          marketFee: '0.05',
          marketFeeCollector: '0x94549951623dd6c3265dbbb1b032d6cf48ba7811',
        },

      }
    },
    fixedRateEURAU(rate: number) {
      if (rate <= 0) {
        return {type: 'free'}
      }

      return {
        type: 'fixed',
        freCreationParams: {
          fixedRateAddress: '0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E',
          baseTokenAddress: '0xE158265FD2be5BCc208621f2c0f8AfCF11aC8408',
          baseTokenDecimals: 6, // adapted for EURAU decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          marketFee: '0.05',
          marketFeeCollector: '0x94549951623dd6c3265dbbb1b032d6cf48ba7811',
        }
      }
    }
  }
}

export type NetworkConfig = {
    chainId: number
    network: string
    metadataCacheUri: string
    nodeUri: string
    providerUri: string
    subgraphUri: string
    oceanTokenAddress: string
    oceanTokenSymbol: string
    fixedRateExchangeAddress: string
    dispenserAddress: string
    nftFactoryAddress: string
    providerAddress?: string
    explorerUri?: string
    startBlock?: number
    transactionBlockTimeout?: number
    transactionConfirmationBlocks?: number
    transactionPollingTimeout?: number
    gasFeeMultiplier?: number
    opfCommunityFeeCollector?: string
    veAllocate?: string
    veOCEAN?: string
    veDelegation?: string
    veFeeDistributor?: string
    veDelegationProxy?: string
    DFRewards?: string
    DFStrategyV1?: string
    veFeeEstimate?: string
}

export interface FixedRatePricingConfigGenerator {
  (rate: number): PricingConfigWithoutOwner
}

export type PricingConfigGenerators = {
  fixedRateEUROe: FixedRatePricingConfigGenerator
  fixedRateEURAU: FixedRatePricingConfigGenerator
}
