#! /usr/bin/env NODE_NO_WARNINGS=1 node
import dotenv from 'dotenv';
dotenv.config()
import { readFileSync, writeFileSync } from 'fs';
import { textSync } from 'figlet';
import readlineSync from 'readline-sync';
import { Command } from 'commander';
import { exportKeyAsJson } from './export-key-as-json';
import { Connection, invokeFunctionFromFile, packageVersion } from './utils';
import Wallet from 'ethereumjs-wallet';
import { AssetBuilder, LifecycleStates, ServiceBuilder } from '@deltadao/nautilus';

const program = new Command();

program
    .name("pontus-x_cli")
    .version(packageVersion())
    .description("CLI for managing the Pontus-X ecosystem");

program.command("export-private-key")
    .description("Export your private key as a JSON file," +
        " to use latter with the login command or for Pontus-X portals automation")
    .action(() => {
        exportKeyAsJson();
    });

program.command("login <keyFile.json>")
    .description("Login to retrieve your private key from a JSON key store and store it in .env")
    .action((keyFileName) => {
        const keyStore = JSON.parse(readFileSync(keyFileName, 'utf8'));
        const password = readlineSync.question(`Enter the password to decrypt the key file ${keyFileName}: `,
            {hideEchoBack: true});
        Wallet.fromV3(keyStore, password).then((wallet) => {
            console.log(`Storing your private key for this session with Pontus-X CLI, do not forget to logout.\n`);
            const envConfig = dotenv.parse(readFileSync('.env', 'utf8'));
            envConfig.PRIVATE_KEY = wallet.getPrivateKeyString();
            const updatedEnvConfig = Object.entries(envConfig)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');
            writeFileSync('.env', updatedEnvConfig, 'utf8');
            process.exit(0);
        }).catch((error) => {
            console.error(`Error decrypting the key file. ${error}\n`);
            process.exit(1);
        });
    });

program.command("logout")
    .description("Logout to remove your private key from .env file")
    .action(() => {
        const envConfig = dotenv.parse(readFileSync('.env', 'utf8'));
        delete envConfig.PRIVATE_KEY;
        const updatedEnvConfig = Object.entries(envConfig)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        writeFileSync('.env', updatedEnvConfig, 'utf8');
        process.exit(0);
    });

program.command("get <did>")
    .description("Get the available metadata to the asset with the given DID")
    .action(async (did) => {
        console.log(`Retrieving asset metadata for DID: ${did}`);
        const { nautilus } = await Connection.connect();
        const aquariusAsset = await nautilus.getAquariusAsset(did);
        console.log(`Asset ${did} metadata: \n\n ${JSON.stringify(aquariusAsset, null, 2)} \n`);
        process.exit(0);
    });

program.command("access <did>")
    .description("Access an asset that can be downloaded given its DID")
    .action(async (did) => {
        const { nautilus } = await Connection.connect();
        console.log(`Getting access to downloadable asset: ${did}`);
        const accessUrl = await nautilus.access({ assetDid: did });
        console.log(`Download URL: ${accessUrl}\n`);
        process.exit(0);
    });

program.command("revoke <did>")
    .description("Publisher revocation of an owned DID ")
    .action(async (did) => {
        const connection = await Connection.connect();
        if (readlineSync.keyInYNStrict(`Revoke asset ${did}? `)) {
            try {
                const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
                console.log('Sending transaction to revoke asset...');
                const tx = await connection.nautilus.setAssetLifecycleState(aquariusAsset,
                    LifecycleStates.REVOKED_BY_PUBLISHER);
                console.log(`Asset revoked, ` +
                    `transaction: ${connection.networkConfig.explorerUri}/tx/${tx.transactionHash}\n`);
            } catch (e) {
                console.error(`Error revoking asset: ${e}`);
            }
        }
        process.exit(0);
    });

program.command("self-description <did> <sdurl>")
    .description("Associate Gaia-X Self-Description to the asset with the given DID")
    .action(async (did, sdurl) => {
        const connection = await Connection.connect();
        if (readlineSync.keyInYNStrict(`Attach self description at ${sdurl} to asset ${did}? `)) {
            try {
                const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
                const assetBuilder = new AssetBuilder(aquariusAsset);
                const asset = assetBuilder.addAdditionalInformation({
                    "gaiaXInformation": {
                        "serviceSD": {
                            "url": sdurl,
                            "isVerified": true
                        }
                    }
                }).build();
                const result = await connection.nautilus.edit(asset);
                console.log(`Self-description associated to the asset, ` +
                    `transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`);
            } catch (e) {
                console.error(`Error attaching self description: ${e}`);
            }
        }
        process.exit(0);
    });

program.command("change-price <did> <newPrice>")
    .description("Change the price keeping the existing currency for an asset with the given DID")
    .action(async (did, newPrice) => {
        const connection = await Connection.connect();
        const newPriceNumber: number = parseFloat(newPrice.replace(',', '.'));
        if (readlineSync.keyInYNStrict(`Set the price to ${newPriceNumber.toString()} for asset ${did}? `)) {
            try {
                const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
                const serviceId = aquariusAsset.services?.[0]?.id
                const tx = await connection.nautilus.setServicePrice(aquariusAsset, serviceId, newPriceNumber.toString());
                console.log(`Price updated for asset, ` +
                    `transaction: ${connection.networkConfig.explorerUri}/tx/${tx.transactionHash}\n`);
            } catch (e) {
                console.error(`Error changing the price: ${e}`);
            }
        }
        process.exit(0);
    });

program.command("edit-algo <did> <image> <tag> <checksum>")
    .description("Change the container metadata for a given algorithm DID")
    .action(async (did, image, tag, checksum) => {
        const connection = await Connection.connect();
        if (readlineSync.keyInYNStrict(`Change the container metadata for asset ${did}` +
            `to ${image}:${tag} and image checksum ${checksum}? `)) {
            try {
                const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
                const assetBuilder = new AssetBuilder(aquariusAsset);
                const asset = assetBuilder.setAlgorithm({
                    ...aquariusAsset.metadata.algorithm, // Start with existing algorithm metadata
                    container: {
                        // @ts-ignore
                        ...aquariusAsset.metadata.algorithm.container, // Start with existing container metadata
                        image,
                        tag,
                        checksum,
                    }
                }).build()
                const result = await connection.nautilus.edit(asset);
                console.log(`Container metadata updated for the algorithm, ` +
                    `transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`);
            } catch (e) {
                console.error(`Error editing container metadata: ${e}`);
            }
        }
        process.exit(0);
    });

program.command("edit-trusted-algos <did> <algos...>")
    .description("Overwrite the trusted algorithms for a data asset to the provided algorithm DIDs")
    .action(async (did, algos: string[]) => {
        const connection = await Connection.connect();
        if (readlineSync.keyInYNStrict(`Changing the trusted algorithms for ${did} ` +
            `to [${algos.join(', ')}]? `)) {
            try {
                const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
                const assetBuilder = new AssetBuilder(aquariusAsset);
                const serviceBuilder =
                    new ServiceBuilder({ aquariusAsset, serviceId: aquariusAsset.services[0].id });
                serviceBuilder.addTrustedAlgorithms(algos.map(algo => ({ did: algo })));
                const service = serviceBuilder.build();
                const asset = assetBuilder.addService(service).build();
                const result = await connection.nautilus.edit(asset);
                console.log(`Edited the trusted algorithms, ` +
                    `transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`);
            } catch (e) {
                console.error(`Error editing the trusted algorithms: ${e}`);
            }
        }
        process.exit(0);
    });

program.command("edit-dataset-url <did> <url>")
    .description("Change the URL of a dataset DID")
    .action(async (did, url) => {
        const connection = await Connection.connect();
        if (readlineSync.keyInYNStrict(`Changing the URL for ${did} ` +
            `to ${url}? `)) {
            try {
                const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
                const assetBuilder = new AssetBuilder(aquariusAsset);
                const serviceBuilder =
                    new ServiceBuilder({ aquariusAsset, serviceId: aquariusAsset.services[0].id });
                serviceBuilder.addFile({ type: 'url', url, method: 'GET' });
                const service = serviceBuilder.build();
                const asset = assetBuilder.addService(service).build();
                const result = await connection.nautilus.edit(asset);
                console.log(`Changed dataset URL, ` +
                    `transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`);
            } catch (e) {
                console.error(`Error changing dataset URL: ${e}`);
            }
        }
        process.exit(0);
    });

program
    .command("publish <script-folder>")
    .description("Publish the asset as instructed in the provided script, " +
        "for instance the sample scripts in https://github.com/rhizomik/pontus-x_cli/tree/master/src/publish/samples'")
    .requiredOption("-p, --provider <provider>", "The Provider URL")
    .option("--dry-run", "Dry run the publishing process")
    .action(async (scriptFolder, options, ) => {
        const connection = await Connection.connect();
        console.log(`Publishing asset ${scriptFolder} in provider ${options.provider} from wallet ${connection.wallet.address}`);
        try {
            await invokeFunctionFromFile(`${scriptFolder}/index.ts`, 'publish',
                scriptFolder, connection, options.provider, options.dryRun);
            process.exit(0);
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    });

try {
    program.addHelpText('beforeAll', textSync("Pontus-X CLI", 'Doom'));
    program.parse(process.argv);
} catch (e) {
    if (e instanceof Error) {
        console.error(e.message + '\n');
    } else {
        console.error(e)
    }
    process.exit(1);
}
