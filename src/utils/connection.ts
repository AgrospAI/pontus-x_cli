import { Nautilus } from "@deltadao/nautilus";
import { providers, Wallet } from "ethers";

import {
  type FixedRatePricingConfigGenerator,
  NETWORK_CONFIGS,
  Network,
  type NetworkConfig,
  PRICING_CONFIGS,
} from "../config";

export class Connection {
  private constructor(
    public wallet: Wallet,
    public nautilus: Nautilus,
    public networkConfig: NetworkConfig,
    public pricingConfig: { [p: string]: FixedRatePricingConfigGenerator },
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

    const provider = new providers.JsonRpcProvider(networkConfig.nodeUri);
    const wallet = new Wallet(env.PRIVATE_KEY, provider);
    const nautilus = await Nautilus.create(wallet, networkConfig);
    console.log(`Connected as ${wallet.address}`);
    return new Connection(wallet, nautilus, networkConfig, pricingConfig);
  }
}
