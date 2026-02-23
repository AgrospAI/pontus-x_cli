import { AssetBuilder, ServiceBuilder } from "@deltadao/nautilus";
import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import readlineSync from "readline-sync";
import { NETWORK_CONFIGS, type Network } from "@/config";
import {
  type AssetInfo,
  getAddressesNames,
  getAssetsFromDids,
  getOwnerName,
  type Publisher,
} from "@/lib/aquarius";
import { PromptForPublishers } from "@/utils/account";
import { PromptForAssets } from "@/utils/asset";
import { Connection } from "@/utils/connection";
import {
  askForNetwork,
  getEnvNetwork,
  getLoginInfos,
  getPrivateKeyForOwner,
  type LoginInfo,
  printLoginInfos,
} from "@/utils/login";

export default class EditTrustedPublishers extends Command {
  static description = "Overwrite datasets trusted publishers";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> -d <datasetDid1> <datasetDid2> ... -p <publisherDid1> <publisherDid2> ...",
  ];
  static flags = {
    datasets: Flags.string({
      char: "d",
      description: "Dataset DIDs (did:op:...)",
      multiple: true,
    }),
    publishers: Flags.string({
      char: "p",
      description: "Trusted publisher DIDs (did:op:...)",
      multiple: true,
    }),
    yes: Flags.boolean({
      char: "y",
      description: "Skip confirmation prompt",
    }),
    manifest: Flags.string({
      char: "m",
      description:
        "Path to manifest file with the accounts to use for authentication",
    }),
    network: Flags.string({
      char: "n",
      description: "Network to use (env: NETWORK)",
      options: Object.keys(NETWORK_CONFIGS),
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(EditTrustedPublishers);

    // Network selection
    const network =
      (flags.network as Network) || getEnvNetwork() || (await askForNetwork());
    console.log(`${chalk.green("Using network:")} ${network}\n`);
    const chainId = NETWORK_CONFIGS[network].chainId;

    // Authentication selection
    const loginInfos = await getLoginInfos(flags.manifest);
    printLoginInfos(loginInfos);

    // Datasets selection
    const assets: AssetInfo[] = flags.dids
      ? await getAssetsFromDids(flags.dids)
      : await askForDatasets(loginInfos, chainId);

    if (flags.dids) {
      console.log("\nThe following assets will be edited:");
      for (const asset of assets) {
        const ownerName = await getOwnerName(asset.owner);
        console.log(
          `${chalk.blue(asset.did)} | ${chalk.green(asset.created.split("T")[0])} | ${chalk.yellow(
            ownerName,
          )} | ${chalk.magenta(asset.name)}`,
        );
      }
    }

    // Publishers selection
    const publishers: Publisher[] = flags.publishers
      ? await getAddressesNames(flags.publishers || [])
      : !flags.public
        ? await askForPublishers()
        : [];

    if (flags.publishers) {
      console.log("\nThe following publishers will be set as trusted:");
      for (const publisher of publishers) {
        console.log(
          `${chalk.blue(publisher.address)} (${chalk.magenta(publisher.name)})`,
        );
      }
    }

    // Confirmation prompt
    if (
      !flags.yes &&
      !readlineSync.keyInYNStrict(
        "\nDo you want to proceed with editing the trusted publishers for the selected datasets?",
      )
    ) {
      console.log("Operation cancelled by the user.");
      return;
    }

    // Edit trusted publishers for each selected dataset
    for (const asset of assets) {
      console.log(
        `Editing trusted publishers for asset ${chalk.gray(asset.did)} (${chalk.magenta(asset.name)})...`,
      );
      try {
        // Create connection and builders
        const envOverrides = {
          NETWORK: network,
          PRIVATE_KEY: getPrivateKeyForOwner(loginInfos, asset.owner),
        };
        const connection = await Connection.connect(envOverrides);
        const aquariusAsset = await connection.nautilus.getAquariusAsset(
          asset.did,
        );
        const assetBuilder = new AssetBuilder(aquariusAsset);
        const serviceBuilder = new ServiceBuilder({
          aquariusAsset,
          serviceId: aquariusAsset.services[0].id,
        });

        for (const publisher of publishers) {
          serviceBuilder.addTrustedAlgorithmPublisher(publisher.address);
        }

        // Apply changes
        const service = serviceBuilder.build();
        const nautilusAsset = assetBuilder.addService(service).build();
        const result = await connection.nautilus.edit(nautilusAsset);

        this.log(
          `Edited the trusted publishers, transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
        );
      } catch (error) {
        this.error(`Error editing trusted publishers: ${error}`);
      }
    }
  }
}

async function askForDatasets(
  loginInfos: LoginInfo[],
  chainId: number,
): Promise<AssetInfo[]> {
  console.log(
    "\nPlease select the filters to find the datasets you want to edit:",
  );
  return PromptForAssets({
    assetTypes: ["dataset"],
    accessTypes: ["compute"],
    chainIds: [chainId],
    ownerChoices: loginInfos.map((info) => ({
      name: info.ownerName,
      value: info.ownerAddress,
    })),
  });
}

async function askForPublishers(): Promise<Publisher[]> {
  console.log("\nPlease select the publishers you want to set as trusted:");
  return PromptForPublishers();
}
