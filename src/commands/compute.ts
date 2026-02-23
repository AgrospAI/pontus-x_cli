import { setTimeout } from "node:timers/promises";
import { search, select } from "@inquirer/prompts";
import type { ComputeJob } from "@oceanprotocol/lib";
import { Args, Command, Flags } from "@oclif/core";
import chalk from "chalk";
import readlineSync from "readline-sync";
import { NETWORK_CONFIGS, type Network } from "@/config";
import {
  type AssetInfo,
  getAssetInfo,
  getAssetsFromDids,
  getOwnerName,
  searchAssets,
} from "@/lib/aquarius";
import { PromptForAssets } from "@/utils/asset";
import { Connection } from "@/utils/connection";
import {
  askForNetwork,
  getEnvNetwork,
  getLoginInfos,
  type LoginInfo,
} from "@/utils/login";

export default class Compute extends Command {
  static args = {
    algorithm: Args.string({ description: "Algorithm DID (did:op:...)" }),
  };
  static description = "Compute the algorithm on one or more datasets.";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> <algorithmDid> -d <datasetDid1> <datasetDid2> ...",
    "<%= config.bin %> <%= command.id %> <algorithmDid> -t <tag1> -t <tag2> ...",
  ];
  static flags = {
    datasets: Flags.string({
      char: "d",
      description: "Dataset DIDs (did:op:...)",
      multiple: true,
    }),
    yes: Flags.boolean({
      char: "y",
      default: false,
      description: "Automatic yes to prompts",
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

  async run(): Promise<ComputeJob | ComputeJob[] | undefined> {
    const { args, flags } = await this.parse(Compute);

    // Network selection
    const network =
      (flags.network as Network) || getEnvNetwork() || (await askForNetwork());
    const chainId = NETWORK_CONFIGS[network].chainId;
    console.log(`${chalk.green("Using network:")} ${network}\n`);

    // Authentication selection
    const loginInfos = await getLoginInfos(flags.manifest);
    const inputLoginInfo = loginInfos.length === 1 ? loginInfos[0] : null;
    if (inputLoginInfo) {
      console.log(
        `${chalk.green("Using account:")} ${chalk.blue(inputLoginInfo.ownerAddress)} ${chalk.magenta(inputLoginInfo.ownerName)}\n`,
      );
    }
    const loginInfo =
      inputLoginInfo ?? (await askForAccountSelection(loginInfos));

    // Algorithm selection
    const inputAlgorithm = args.algorithm
      ? await getAssetInfo(args.algorithm)
      : null;
    if (inputAlgorithm) {
      console.log(
        `Algorithm to run: ${chalk.blue(inputAlgorithm.name)} (${chalk.gray(inputAlgorithm.did)})\n`,
      );
    }
    const algorithm: AssetInfo =
      inputAlgorithm ?? (await askForAlgorithm(chainId));

    // Datasets selection
    const inputDatasets = flags.datasets
      ? await getAssetsFromDids(flags.datasets)
      : null;
    if (inputDatasets) {
      console.log("\nThe following assets will be used:");
      for (const asset of inputDatasets) {
        const ownerName = await getOwnerName(asset.owner);
        console.log(
          `${chalk.blue(asset.did)} | ${chalk.green(asset.created.split("T")[0])} | ${chalk.yellow(
            ownerName,
          )} | ${chalk.magenta(asset.name)}`,
        );
      }
    }
    const datasets: AssetInfo[] =
      inputDatasets ?? (await askForDatasets(chainId));

    // Confirmation prompt
    if (
      !flags.yes &&
      !readlineSync.keyInYNStrict(
        "\nDo you want to proceed with running the algorithm on the selected datasets?",
      )
    ) {
      console.log("Operation cancelled by the user.");
      return;
    }

    // Run compute
    const envOverrides = {
      NETWORK: network,
      PRIVATE_KEY: loginInfo.privateKey,
    };
    const connection = await Connection.connect(envOverrides);

    try {
      const computeJob = await connection.nautilus.compute({
        algorithm: { did: algorithm.did },
        dataset: { did: datasets[0].did },
        additionalDatasets: datasets
          .filter((_, i) => i > 0)
          .map((dataset) => ({ did: dataset.did })),
      });

      const firstDatasetAsset = await connection.nautilus.getAquariusAsset(
        datasets[0].did,
      );
      const provider = firstDatasetAsset.services[0].serviceEndpoint;

      if (Array.isArray(computeJob)) {
        for (const job of computeJob)
          this.log(
            `Compute started, check status using command:\n pontus-x_cli compute-status ${job.jobId} -p ${provider}\n`,
          );
      } else {
        this.log(
          `Compute started, check status using command:\n pontus-x_cli compute-status ${computeJob.jobId} -p ${provider}\n`,
        );
      }

      return computeJob;
    } catch (error) {
      this.error(`Error starting compute: ${error}`);
    }
  }
}

async function askForDatasets(chainId: number): Promise<AssetInfo[]> {
  console.log("\nSelect the filters to find the datasets you want to use:");
  return PromptForAssets({
    assetTypes: ["dataset"],
    accessTypes: ["compute"],
    chainIds: [chainId],
  });
}

async function askForAlgorithm(chainId: number): Promise<AssetInfo> {
  console.log("\nSelect an algorithm to run:");
  const answer = await search({
    message: "Search for an algorithm by name:",
    pageSize: 10,
    source: async (input, { signal }) => {
      if (!input) {
        return [];
      }

      await setTimeout(300);
      if (signal.aborted) return [];

      const assets = await searchAssets({
        assetTypes: ["algorithm"],
        accessTypes: ["compute"],
        chainIds: [chainId],
        searchText: input,
        signal,
      });

      const choices = [];

      for (const asset of assets) {
        const ownerName = await getOwnerName(asset.owner);
        choices.push({
          name: `${asset.did}: ${asset.name} (${ownerName})`,
          value: asset,
        });
      }

      return choices;
    },
  });
  return answer;
}

async function askForAccountSelection(
  loginInfos: LoginInfo[],
): Promise<LoginInfo> {
  const answer = await select({
    message: "Select the account to use:",
    choices: loginInfos.map((info) => ({
      name: `${info.ownerAddress} (${info.ownerName})`,
      value: info,
    })),
  });
  return answer;
}
