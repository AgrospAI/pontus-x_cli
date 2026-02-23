import { AssetBuilder, ServiceBuilder } from "@deltadao/nautilus";
import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import readlineSync from "readline-sync";
import { NETWORK_CONFIGS, type Network } from "@/config";
import {
  type AssetInfo,
  getAssetsFromDids,
  getOwnerName,
} from "@/lib/aquarius";
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

export default class EditTrustedAlgos extends Command {
  static description = "Overwrite datasets trusted algorithms";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> -d <datasetDid1> <datasetDid2> ... -a <algorithmDid1> <algorithmDid2> ...",
  ];
  static flags = {
    datasets: Flags.string({
      char: "d",
      description: "Dataset DIDs (did:op:...)",
      multiple: true,
    }),
    algorithms: Flags.string({
      char: "a",
      description: "Trusted algorithm DIDs (did:op:...)",
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
    public: Flags.boolean({
      char: "p",
      description: "Make dataset public (set all algorithms as trusted)",
    }),
    network: Flags.string({
      char: "n",
      description: "Network to use (env: NETWORK)",
      options: Object.keys(NETWORK_CONFIGS),
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(EditTrustedAlgos);

    // Validation
    if (flags.public && flags.algos?.length) {
      this.error(
        "You cannot specify algorithm DIDs and set the dataset as public at the same time.",
      );
    }

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

    // Trusted Algorithms selection
    const algorithms: AssetInfo[] = flags.algorithms
      ? await getAssetsFromDids(flags.algorithms || [])
      : !flags.public
        ? await askForAlgorithms(loginInfos, chainId)
        : [];

    if (flags.public) {
      console.log(
        "\nThe dataset will be set as public, all algorithms will be trusted.",
      );
    } else {
      if (algorithms.length === 0) {
        console.log(
          "\nNo algorithms selected, the dataset will be set as private (no trusted algorithms).",
        );
      } else {
        if (flags.algos) {
          console.log("\nThe following algorithms will be set as trusted:");
          for (const algo of algorithms) {
            const ownerName = await getOwnerName(algo.owner);

            console.log(
              `${chalk.blue(algo.did)} | ${chalk.green(algo.created.split("T")[0])} | ${chalk.yellow(
                ownerName,
              )} | ${chalk.magenta(algo.name)}`,
            );
          }
        }
      }
    }

    // Confirmation prompt
    if (
      !flags.yes &&
      !readlineSync.keyInYNStrict(
        "\nDo you want to proceed with editing the trusted algorithms for the selected datasets?",
      )
    ) {
      console.log("Operation cancelled by the user.");
      return;
    }

    // Edit trusted algorithms for each selected dataset
    for (const asset of assets) {
      console.log(
        `Editing trusted algorithms for asset ${chalk.gray(asset.did)} (${chalk.magenta(asset.name)})...`,
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

        if (flags.public) {
          // Public
          serviceBuilder.setAllAlgorithmsTrusted();
        } else if (algorithms.length > 0) {
          // Only selected algorithms as trusted
          serviceBuilder.setAllAlgorithmsUntrusted();
          serviceBuilder.addTrustedAlgorithms(
            algorithms.map((algo: AssetInfo) => ({ did: algo.did })),
          );
        } else {
          // Private
          serviceBuilder.setAllAlgorithmsUntrusted();
        }

        // Apply changes
        const service = serviceBuilder.build();
        const nautilusAsset = assetBuilder.addService(service).build();
        const result = await connection.nautilus.edit(nautilusAsset);

        this.log(
          `Edited the trusted algorithms, transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
        );
      } catch (error) {
        this.error(`Error editing trusted algorithms: ${error}`);
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

async function askForAlgorithms(
  loginInfos: LoginInfo[],
  chainId: number,
): Promise<AssetInfo[]> {
  console.log(
    "\nPlease select the filters to find the algorithms you want to set as trusted:",
  );
  return PromptForAssets({
    assetTypes: ["algorithm"],
    accessTypes: ["compute"],
    chainIds: [chainId],
    ownerChoices: loginInfos.map((info) => ({
      name: info.ownerName,
      value: info.ownerAddress,
    })),
  });
}
