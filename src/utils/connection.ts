import dotenv from 'dotenv';
dotenv.config()
import { FixedRatePricingConfigGenerator, Network, NETWORK_CONFIGS, NetworkConfig, PRICING_CONFIGS } from '../config'
import { Wallet, providers } from 'ethers'
import { Nautilus } from '@deltadao/nautilus'

export class Connection {

    private constructor(public wallet: Wallet,
                        public nautilus: Nautilus,
                        public networkConfig: NetworkConfig,
                        public pricingConfig: { [p: string]: FixedRatePricingConfigGenerator }) {}

    public static async connect(): Promise<Connection> {
        if (!process.env.NETWORK) {
            console.error(`Set your network in the .env file. Supported networks are ` +
                `${Object.values(Network).join(', ')}.`);
            process.exit(1);
        }
        const selectedEnvNetwork = process.env.NETWORK.toUpperCase()
        if (!(selectedEnvNetwork in Network)) {
            console.error(`Invalid network selection: ${selectedEnvNetwork}. Supported networks are ${Object.values(
                    Network).join(', ')}.`);
            process.exit(1);
        }
        console.log(`Your selected network is ${Network[selectedEnvNetwork as Network]}`)
        const networkConfig = NETWORK_CONFIGS[selectedEnvNetwork as Network]
        const pricingConfig = PRICING_CONFIGS[selectedEnvNetwork as Network]
        if (!process.env.PRIVATE_KEY) {
            console.error(`Login to retrieve your private key using "pontusx-cli login keyFile.json"` +
                ` and do not forget to logout when finished.`);
            process.exit(1);
        }
        const provider = new providers.JsonRpcProvider(networkConfig.nodeUri);
        const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
        const nautilus = await Nautilus.create(wallet, networkConfig);
        console.log(`Connected as ${wallet.address}`);
        return new Connection(wallet, nautilus, networkConfig, pricingConfig);
    }
}


