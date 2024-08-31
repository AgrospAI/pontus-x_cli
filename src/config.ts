import { PricingConfigWithoutOwner } from '@deltadao/nautilus'

export enum Network {
    GENX = 'GENX',
    PONTUSXDEV = 'PONTUSXDEV',
    PONTUSXTEST = 'PONTUSXTEST'
}

export const NETWORK_CONFIGS: { [key in Network]: NetworkConfig } = {
    [Network.GENX]: {
        chainId: 100,
        network: 'genx',
        metadataCacheUri: 'https://aquarius510.v4.delta-dao.com',
        nodeUri: 'https://rpc.genx.minimal-gaia-x.eu',
        providerUri: 'https://provider.v4.genx.delta-dao.com',
        subgraphUri: 'https://subgraph.v4.genx.minimal-gaia-x.eu',
        oceanTokenAddress: '0x0995527d3473b3a98c471f1ed8787acd77fbf009',
        oceanTokenSymbol: 'OCEAN',
        fixedRateExchangeAddress: '0xAD8E7d2aFf5F5ae7c2645a52110851914eE6664b',
        dispenserAddress: '0x94cb8FC8719Ed09bE3D9c696d2037EA95ef68d3e',
        nftFactoryAddress: '0x6cb85858183B82154921f68b434299EC4281da53',
        providerAddress: '0x68C24FA5b2319C81b34f248d1f928601D2E5246B',
        explorerUri: 'https://logging.genx.minimal-gaia-x.eu',
    },
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
    }
}

// These are example pricing configurations with prefilled contract addresses of the payment tokens
export const PRICING_CONFIGS: { [key in Network]: PricingConfigGenerators } = {
    [Network.GENX]: {
        fixedRateOcean: (rate: number) => {
            if (rate <= 0) {
                return {type: 'free'}
            } else {
                return {
                    type: 'fixed',
                    freCreationParams: {
                        fixedRateAddress: '0xAD8E7d2aFf5F5ae7c2645a52110851914eE6664b',
                        baseTokenAddress: '0x0995527d3473b3a98c471f1ed8787acd77fbf009',
                        baseTokenDecimals: 18,
                        datatokenDecimals: 18,
                        fixedRate: `${rate}`,
                        marketFee: '0',
                        marketFeeCollector: '0x0000000000000000000000000000000000000000'
                    }
                }
            }
        },
        fixedRateEUROe: (rate: number) => {
            if (rate <= 0) {
                return {type: 'free'}
            } else {
                return {
                    type: 'fixed',
                    freCreationParams: {
                        fixedRateAddress: '0xAD8E7d2aFf5F5ae7c2645a52110851914eE6664b',
                        baseTokenAddress: '0xe974c4894996E012399dEDbda0bE7314a73BBff1',
                        baseTokenDecimals: 6, // adapted for EUROe decimals
                        datatokenDecimals: 18,
                        fixedRate: `${rate}`,
                        marketFee: '0',
                        marketFeeCollector: '0x0000000000000000000000000000000000000000'
                    }
                }
            }
        }
    },
    [Network.PONTUSXDEV]: {
        fixedRateOcean: (rate: number) => {
            if (rate <= 0) {
                return {type: 'free'}
            } else {
                return {
                    type: 'fixed',
                    freCreationParams: {
                        fixedRateAddress: '0x8372715D834d286c9aECE1AcD51Da5755B32D505',
                        baseTokenAddress: '0xdF171F74a8d3f4e2A789A566Dce9Fa4945196112',
                        baseTokenDecimals: 18,
                        datatokenDecimals: 18,
                        fixedRate: `${rate}`,
                        marketFee: '0',
                        marketFeeCollector: '0x0000000000000000000000000000000000000000'
                    }
                }
            }
        },
        fixedRateEUROe: (rate: number) => {
            if (rate <= 0) {
                return {type: 'free'}
            } else {
                return {
                    type: 'fixed',
                    freCreationParams: {
                        fixedRateAddress: '0x8372715D834d286c9aECE1AcD51Da5755B32D505',
                        baseTokenAddress: '0x8A4826071983655805bF4f29828577Cd6b1aC0cB',
                        baseTokenDecimals: 18, // adapted for EUROe decimals
                        datatokenDecimals: 18,
                        fixedRate: `${rate}`,
                        marketFee: '0',
                        marketFeeCollector: '0x0000000000000000000000000000000000000000'
                    }
                }
            }
        }
    },
    [Network.PONTUSXTEST]: {
        fixedRateOcean: (rate: number) => {
            if (rate <= 0) {
                return {type: 'free'}
            } else {
                return {
                    type: 'fixed',
                    freCreationParams: {
                        fixedRateAddress: '0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E',
                        baseTokenAddress: '0x5B190F9E2E721f8c811E4d584383E3d57b865C69',
                        baseTokenDecimals: 18,
                        datatokenDecimals: 18,
                        fixedRate: `${rate}`,
                        marketFee: '0',
                        marketFeeCollector: '0x0000000000000000000000000000000000000000'
                    }
                }
            }
        },
        fixedRateEUROe: (rate: number) => {
            if (rate <= 0) {
                return {type: 'free'}
            } else {
                return {
                    type: 'fixed',
                    freCreationParams: {
                        fixedRateAddress: '0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E',
                        baseTokenAddress: '0xdd0a0278f6BAF167999ccd8Aa6C11A9e2fA37F0a',
                        baseTokenDecimals: 6, // adapted for EUROe decimals
                        datatokenDecimals: 18,
                        fixedRate: `${rate}`,
                        marketFee: '0',
                        marketFeeCollector: '0x0000000000000000000000000000000000000000'
                    }
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
    fixedRateOcean: FixedRatePricingConfigGenerator,
    fixedRateEUROe: FixedRatePricingConfigGenerator
}
