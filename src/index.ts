#!/usr/bin/env node
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
import { generateDidWeb } from './gaia-x_compliance/generate-did-web';
import { checkCompliance, generateParticipantCredentials } from './gaia-x_compliance/generate-participant-credentials';
import { type ComputeJob } from '@oceanprotocol/lib';

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

program.command("revoke <dids...>")
    .description("Publisher revocation of one or more owned DIDs ")
    .action(async (dids: string[]) => {
        const connection = await Connection.connect();
        if (readlineSync.keyInYNStrict(`Revoke assets ${dids.join(', ')}? `)) {
            try {
                for(const did of dids) {
                    const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
                    console.log('Sending transaction to revoke asset...');
                    const tx = await connection.nautilus.setAssetLifecycleState(aquariusAsset,
                        LifecycleStates.REVOKED_BY_PUBLISHER);
                    console.log(`Asset revoked, ` +
                        `transaction: ${connection.networkConfig.explorerUri}/tx/${tx.transactionHash}\n`);
                }
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

program.command("edit-asset-url <did> <url>")
    .description("Change the URL of an asset DID")
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
                console.log(`Changed asset URL, ` +
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
    .action(async (scriptFolder, options) => {
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

program
    .command("compute <algo> <datasets...>")
    .description("Compute the algorith on one or more datasets'")
    .action(async (algo: string, datasets: string[]) => {
        const connection = await Connection.connect();
        if (readlineSync.keyInYNStrict(`Computing algorithm ${algo} ` +
            `on datasets [${datasets.join(', ')}]? `)) {
            try {
                const firstDatasetAsset = await connection.nautilus.getAquariusAsset(datasets[0]);
                const provider = firstDatasetAsset.services[0].serviceEndpoint;
                const dataset = { "did": datasets[0] };
                const algorithm = { "did": algo };
                const additionalDatasets = datasets
                    .filter((_, i) => i > 0)
                    .map(dataset => ({ "did": dataset }) );
                const computeJob =
                    await connection.nautilus.compute({ dataset, algorithm, additionalDatasets }) as ComputeJob[];
                console.log(`Compute started, check status using command:\n`+
                    `pontus-x_cli compute-status ${computeJob[0].jobId} -p ${provider}\n`);
            } catch (e) {
                console.error(`Error starting compute: ${e}`);
            }
        }
        process.exit(0);
    });

program
    .command("compute-status <jobId>")
    .description("Check compute job status'")
    .requiredOption("-p, --provider <provider>", "The Provider URL")
    .action(async (jobId: string, options) => {
        const connection = await Connection.connect();
        try {
            const computeJobStatus = await connection.nautilus.getComputeStatus({
                jobId, providerUri: options.provider
            });
            console.log(`Compute status: ${computeJobStatus.statusText}\n`);
            if (computeJobStatus.statusText === 'Job finished') {
                console.log(`Get results using command:\n`+
                    `pontus-x_cli compute-results ${jobId} -p ${options.provider}\n`);
            }
        } catch (e) {
            console.error(`Error starting compute: ${e}`);
        }
        process.exit(0);
    });

program
    .command("compute-results <jobId>")
    .description("Get the compute job results'")
    .requiredOption("-p, --provider <provider>", "The Provider URL")
    .action(async (jobId: string, options) => {
        const connection = await Connection.connect();
        try {
            const computeResultUrl = await connection.nautilus.getComputeResult({
                jobId, providerUri: options.provider
            });
            if (computeResultUrl)
               console.log(`Compute results available from: ${computeResultUrl}\n`);
            else
                console.log(`No results available yet\n`);
        } catch (e) {
            console.error(`Error starting compute: ${e}`);
        }
        process.exit(0);
    });

program
    .command("generate-did-web")
    .description("Generate a did.json to set up a DID-Web source to publish Gaia-X complaint credentials")
    .requiredOption("-d, --domain <url>", "URL where the DID-Web document will be hosted")
    .requiredOption("-c, --certificate <certificate-chain.crt>", "Path to the file with the certificate chain for the DID domain URL")
    .action(async (options) => {
        try {
            await generateDidWeb(options.domain, options.certificate);
            process.exit(0);
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    });

program
    .command("generate-participant-credentials")
    .description("Generate the Gaia-X credentials for the participant including their verifiable presentation and checking its compliance")
    .requiredOption("-p, --participant <participant.data.json>", "Path to the JSON file including the required participant data")
    .requiredOption("-d, --did <did.json>", "Path to the did.json file")
    .requiredOption("-c, --certificate <certificate.key>", "Path to the certificate.key file")
    .action(async (options) => {
        try {
            await generateParticipantCredentials(options.participant, options.did, options.certificate);
            process.exit(0);
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    });

program
    .command("check-compliance")
    .description("Use Gaia-X Compliance to check a participant Verifiable Presentation")
    .requiredOption("-p, --participant <participant.data.json>", "Path to the JSON file including the required participant data")
    .requiredOption("--vp <participant.vp.json>", "Path to the participant Verifiable Presentation file")
    .action(async (options) => {
        try {
            await checkCompliance(options.participant, options.vp);
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
