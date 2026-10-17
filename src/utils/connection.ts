import {
  IpfsRemoteStore,
  Nautilus,
  type RemoteStore,
} from "@deltadao/nautilus";
import { JsonRpcProvider, TransactionReceipt, Wallet } from "ethers";

import {
  DEFAULT_OCEAN_NODE_URI,
  type FixedRatePricingConfigGenerator,
  NETWORK_CONFIGS,
  Network,
  type NetworkConfig,
  PRICING_CONFIGS,
} from "../config";

// Backward compatibility: ethers v6 renamed `transactionHash` to `hash` on TransactionReceipt.
// Provide a getter on both CommonJS and ESM TransactionReceipt so legacy scripts accessing `receipt.transactionHash` continue to work.
if (!("transactionHash" in TransactionReceipt.prototype)) {
  Object.defineProperty(TransactionReceipt.prototype, "transactionHash", {
    get() {
      return this.hash;
    },
    configurable: true,
  });
}

function createRemoteStore(
  env: Record<string, string | undefined>,
): RemoteStore | undefined {
  if (env.PINATA_JWT) {
    return new IpfsRemoteStore({
      uploadUrl:
        env.PINATA_UPLOAD_URL ||
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
      headers: { Authorization: `Bearer ${env.PINATA_JWT}` },
      probe: "upload",
      gatewayUrl: env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud",
    });
  }

  if (env.IPFS_UPLOAD_URL) {
    return new IpfsRemoteStore({
      uploadUrl: env.IPFS_UPLOAD_URL,
      probe: "upload",
      gatewayUrl: env.IPFS_GATEWAY_URL,
      allowInsecureTransport: true,
    });
  }

  return undefined;
}

export class Connection {
  private constructor(
    public wallet: Wallet,
    public nautilus: Nautilus,
    public networkConfig: NetworkConfig,
    public pricingConfig: { [p: string]: FixedRatePricingConfigGenerator },
    public remoteStore?: RemoteStore,
  ) {}

  public static async connect(
    envOverrides?: Record<string, string>,
  ): Promise<Connection> {
    const env = { ...process.env, ...envOverrides };

    if (!env.NETWORK) {
      throw new Error(
        `Set your network in the .env file. Supported networks are ${Object.values(Network).join(", ")}.`,
      );
    }

    const selectedEnvNetwork = env.NETWORK.toUpperCase();
    if (!(selectedEnvNetwork in Network)) {
      throw new Error(
        `Invalid network selection: ${selectedEnvNetwork}. Supported networks are ${Object.values(
          Network,
        ).join(", ")}.`,
      );
    }

    console.log(
      `Your selected network is ${Network[selectedEnvNetwork as Network]}`,
    );
    const networkConfig = NETWORK_CONFIGS[selectedEnvNetwork as Network];
    const pricingConfig = PRICING_CONFIGS[selectedEnvNetwork as Network];
    if (!env.PRIVATE_KEY) {
      throw new Error(
        `Login to retrieve your private key using "pontusx-cli login keyFile.json"` +
          ` and do not forget to logout when finished.`,
      );
    }

    const provider = new JsonRpcProvider(networkConfig.nodeUri);
    const wallet = new Wallet(env.PRIVATE_KEY, provider);

    const oceanNodeUri =
      env.OCEAN_NODE_URI ||
      networkConfig.oceanNodeUri ||
      DEFAULT_OCEAN_NODE_URI;

    const remoteStore = createRemoteStore(env);

    const nautilus = await Nautilus.create(wallet, {
      config: {
        ...networkConfig,
        oceanNodeUri,
        nodeUri: networkConfig.nodeUri,
      },
      remoteStore,
    });

    const patchReceipt = (receipt: any) => {
      if (receipt && !receipt.transactionHash && receipt.hash) {
        try {
          receipt.transactionHash = receipt.hash;
        } catch {
          // ignore
        }
      }
      return receipt;
    };

    const patchResponse = (response: any) => {
      if (response?.setMetadataTxReceipt) {
        patchReceipt(response.setMetadataTxReceipt);
      }
      return response;
    };

    const originalPublish = nautilus.publish.bind(nautilus);
    nautilus.publish = (async (asset: any, options: any) => {
      const res = await originalPublish(asset, options);
      return patchResponse(res);
    }) as any;

    const originalCompletePublish = nautilus.completePublish.bind(nautilus);
    nautilus.completePublish = (async (
      nftAddress: any,
      asset: any,
      options: any,
    ) => {
      const res = await originalCompletePublish(nftAddress, asset, options);
      return patchResponse(res);
    }) as any;

    const originalEdit = nautilus.edit.bind(nautilus);
    nautilus.edit = (async (asset: any, options: any) => {
      const res = await originalEdit(asset, options);
      return patchResponse(res);
    }) as any;

    const originalSetLifecycle = nautilus.setAssetLifecycleState.bind(nautilus);
    nautilus.setAssetLifecycleState = (async (asset: any, state: any) => {
      const tx = await originalSetLifecycle(asset, state);
      return patchReceipt(tx);
    }) as any;

    const originalSetPrice = nautilus.setServicePrice.bind(nautilus);
    nautilus.setServicePrice = (async (
      asset: any,
      serviceId: any,
      price: any,
    ) => {
      const tx = await originalSetPrice(asset, serviceId, price);
      return patchReceipt(tx);
    }) as any;

    console.log(`Connected as ${wallet.address}`);
    return new Connection(
      wallet,
      nautilus,
      networkConfig,
      pricingConfig,
      remoteStore,
    );
  }
}
