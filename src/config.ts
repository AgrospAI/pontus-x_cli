import type { PricingConfigWithoutOwner } from "@deltadao/nautilus";

export enum Network {
  PONTUSXDEV = "PONTUSXDEV",
  PONTUSXTEST = "PONTUSXTEST",
  OP_SEPOLIA = "OP_SEPOLIA",
}

export const DEFAULT_OCEAN_NODE_URI =
  process.env.OCEAN_NODE_URI || "https://ocean-node.agrospai.udl.cat";

export const NETWORK_CONFIGS: {
  [key in Network]: NetworkConfig;
} = {
  [Network.PONTUSXDEV]: {
    chainId: 32_456,
    dispenserAddress: "0x5461b629E01f72E0A468931A36e039Eea394f9eA",
    explorerUri: "https://explorer.pontus-x.eu/pontusx/dev",
    fixedRateExchangeAddress: "0x8372715D834d286c9aECE1AcD51Da5755B32D505",
    metadataCacheUri: "https://aquarius.agrospai.udl.cat",
    network: "pontusxdev",
    nftFactoryAddress: "0xFdC4a5DEaCDfc6D82F66e894539461a269900E13",
    nodeUri: "https://rpc.dev.pontus-x.eu",
    oceanNodeUri: process.env.OCEAN_NODE_URI || DEFAULT_OCEAN_NODE_URI,
    oceanTokenAddress: "0xdF171F74a8d3f4e2A789A566Dce9Fa4945196112",
    oceanTokenSymbol: "OCEAN",
    providerAddress: "0x68C24FA5b2319C81b34f248d1f928601D2E5246B",
    providerUri: "https://provider.agrospai.udl.cat",
    subgraphUri: "https://subgraph.dev.agrospai.udl.cat",
  },
  [Network.PONTUSXTEST]: {
    chainId: 32_457,
    dispenserAddress: "0xaB5B68F88Bc881CAA427007559E9bbF8818026dE",
    explorerUri: "https://explorer.pontus-x.eu/pontusx/test",
    fixedRateExchangeAddress: "0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E",
    metadataCacheUri: "https://aquarius.agrospai.udl.cat",
    network: "pontusxtest",
    nftFactoryAddress: "0x2C4d542ff791890D9290Eec89C9348A4891A6Fd2",
    nodeUri: "https://rpc.test.agrospai.udl.cat",
    oceanNodeUri: process.env.OCEAN_NODE_URI || DEFAULT_OCEAN_NODE_URI,
    oceanTokenAddress: "0x5B190F9E2E721f8c811E4d584383E3d57b865C69",
    oceanTokenSymbol: "OCEAN",
    providerAddress: "0x9546d39CE3E48BC942f0be4AA9652cBe0Aff3592",
    providerUri: "https://provider.agrospai.udl.cat",
    subgraphUri: "https://subgraph.test.agrospai.udl.cat",
  },
  [Network.OP_SEPOLIA]: {
    chainId: 11_155_420,
    explorerUri: "https://sepolia-optimism.etherscan.io",
    network: "op-sepolia",
    nodeUri: process.env.OP_SEPOLIA_NODE_URI || "https://sepolia.optimism.io",
    oceanNodeUri: process.env.OCEAN_NODE_URI || DEFAULT_OCEAN_NODE_URI,
    oceanTokenSymbol: "OCEAN",
  },
};

// These are example pricing configurations with prefilled contract addresses of the payment tokens
export const PRICING_CONFIGS: { [key in Network]: PricingConfigGenerators } = {
  [Network.PONTUSXDEV]: {
    fixedRateEURAU(rate: number) {
      if (rate <= 0) {
        return { type: "free" };
      }

      return {
        freCreationParams: {
          baseTokenAddress: "0x852381bB887d3Cf4AEB9e1E9De3eB033AF82fBeE",
          baseTokenDecimals: 6, // adapted for EURAU decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: "0x8372715D834d286c9aECE1AcD51Da5755B32D505",
          marketFee: "0.05",
          marketFeeCollector: "0x94549951623dd6c3265dbbb1b032d6cf48ba7811",
        },
        type: "fixed",
      };
    },
    fixedRateEUROe(rate: number) {
      if (rate <= 0) {
        return { type: "free" };
      }

      return {
        freCreationParams: {
          baseTokenAddress: "0x8A4826071983655805bF4f29828577Cd6b1aC0cB",
          baseTokenDecimals: 18, // adapted for EUROe decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: "0x8372715D834d286c9aECE1AcD51Da5755B32D505",
          marketFee: "0.05",
          marketFeeCollector: "0x94549951623dd6c3265dbbb1b032d6cf48ba7811",
        },
        type: "fixed",
      };
    },
  },
  [Network.PONTUSXTEST]: {
    fixedRateEURAU(rate: number) {
      if (rate <= 0) {
        return { type: "free" };
      }

      return {
        freCreationParams: {
          baseTokenAddress: "0xE158265FD2be5BCc208621f2c0f8AfCF11aC8408",
          baseTokenDecimals: 6, // adapted for EURAU decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: "0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E",
          marketFee: "0.05",
          marketFeeCollector: "0x94549951623dd6c3265dbbb1b032d6cf48ba7811",
        },
        type: "fixed",
      };
    },
    fixedRateEUROe(rate: number) {
      if (rate <= 0) {
        return { type: "free" };
      }

      return {
        freCreationParams: {
          baseTokenAddress: "0xdd0a0278f6BAF167999ccd8Aa6C11A9e2fA37F0a",
          baseTokenDecimals: 6, // adapted for EUROe decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: "0xcE0F39abB6DA2aE4d072DA78FA0A711cBB62764E",
          marketFee: "0.05",
          marketFeeCollector: "0x94549951623dd6c3265dbbb1b032d6cf48ba7811",
        },
        type: "fixed",
      };
    },
  },
  [Network.OP_SEPOLIA]: {
    fixedRateEURAU(rate: number) {
      if (rate <= 0) {
        return { type: "free" };
      }
      return { type: "free" };
    },
    fixedRateEUROe(rate: number) {
      if (rate <= 0) {
        return { type: "free" };
      }
      return { type: "free" };
    },
    fixedRateDevEURAU(rate: number) {
      if (rate <= 0) {
        return { type: "free" };
      }
      return {
        freCreationParams: {
          baseTokenAddress: "0xD35141583f374d401fee1BFdDc35910E1D33a588",
          baseTokenDecimals: 6, // devEURAU decimals
          datatokenDecimals: 18,
          fixedRate: `${rate}`,
          fixedRateAddress: "0x69B6E54Ad2b3c2801d11d8Ad56ea1d892555b776",
          marketFee: "0.05",
          marketFeeCollector: "0x94549951623dd6c3265dbbb1b032d6cf48ba7811",
        },
        type: "fixed",
      };
    },
  },
};

export type NetworkConfig = {
  chainId: number;
  network: string;
  nodeUri: string;
  oceanNodeUri?: string;
  explorerUri?: string;
  dispenserAddress?: string;
  fixedRateExchangeAddress?: string;
  nftFactoryAddress?: string;
  oceanTokenAddress?: string;
  oceanTokenSymbol?: string;
  metadataCacheUri?: string;
  providerAddress?: string;
  providerUri?: string;
  subgraphUri?: string;
  DFRewards?: string;
  DFStrategyV1?: string;
  gasFeeMultiplier?: number;
  opfCommunityFeeCollector?: string;
  startBlock?: number;
  transactionBlockTimeout?: number;
  transactionConfirmationBlocks?: number;
  transactionPollingTimeout?: number;
  veAllocate?: string;
  veDelegation?: string;
  veDelegationProxy?: string;
  veFeeDistributor?: string;
  veFeeEstimate?: string;
  veOCEAN?: string;
};

export type FixedRatePricingConfigGenerator = (
  rate: number,
) => PricingConfigWithoutOwner;

export type PricingConfigGenerators = {
  fixedRateEURAU: FixedRatePricingConfigGenerator;
  fixedRateEUROe: FixedRatePricingConfigGenerator;
  fixedRateDevEURAU?: FixedRatePricingConfigGenerator;
};
