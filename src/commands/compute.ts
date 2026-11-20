import fs from "node:fs";
import { setTimeout } from "node:timers/promises";
import type { ComputeEnvironment, NodeComputeJob } from "@deltadao/nautilus";
import { search, select } from "@inquirer/prompts";
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
import { manifestFlag } from "@/utils/manifest-flag";
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
    manifest: manifestFlag,
    algoParams: Flags.string({
      char: "a",
      description:
        "Path to algorithm parameters file with the algorithm execution parameters",
    }),
    network: Flags.string({
      char: "n",
      description: "Network to use (env: NETWORK)",
      options: Object.keys(NETWORK_CONFIGS),
    }),
  };

  async run(): Promise<NodeComputeJob[] | undefined> {
    const { args, flags } = await this.parse(Compute);

    const loginInfos = await getLoginInfos(flags.manifest);

    // Network selection
    const network =
      (flags.network as Network) || getEnvNetwork() || (await askForNetwork());
    const chainId = NETWORK_CONFIGS[network].chainId;
    console.log(`${chalk.green("Using network:")} ${network}\n`);

    var algoParams = {};
    if (flags.algoParams) {
      try {
        const jsonString = fs.readFileSync(flags.algoParams, "utf-8");
        algoParams = JSON.parse(jsonString);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.error(`Error reading file: ${message}`);
      }
    }

    this.log(`Algorithm parameters: ${JSON.stringify(algoParams)}`);

    // Authentication selection
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
      ? await getAssetInfo(args.algorithm, undefined, flags.manifest)
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
      ? await getAssetsFromDids(flags.datasets, flags.manifest)
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

    const computeConfig = {
      algorithm: { did: algorithm.did, algocustomdata: algoParams },
      dataset: { did: datasets[0].did },
      additionalDatasets: datasets
        .filter((_, i) => i > 0)
        .map((dataset) => ({ did: dataset.did })),
    };

    try {
      const environments = await connection.nautilus.getComputeEnvironments();
      const freeEnv = pickComputeEnvironment(environments, "free", chainId);

      let computeResult: { jobs: NodeComputeJob[] };
      try {
        computeResult = await connection.nautilus.freeCompute({
          ...computeConfig,
          computeEnv: freeEnv,
        });
      } catch (freeError) {
        const freeMessage = errorMessage(freeError);

        // `freeCompute()` only fails with this message when the environment
        // genuinely has no `free` configuration. Any other failure (the node
        // could not pull the algorithm image, the policy server refused, ...)
        // is a real error: retrying it as a paid job hides the cause and often
        // cannot succeed anyway, because a free environment usually publishes
        // no fees.
        if (!/does not offer free jobs/i.test(freeMessage)) {
          throw new Error(computeErrorMessage(freeError));
        }

        const paidEnv = pickComputeEnvironment(environments, "paid", chainId);
        if (!paidEnv) {
          throw new Error(
            `No compute environment offers free jobs or publishes fees for chain ${chainId}.`,
          );
        }

        this.warn(
          `Free compute is unavailable (${freeMessage}). Retrying as a paid job...`,
        );
        computeResult = await connection.nautilus.compute({
          ...computeConfig,
          computeEnv: paidEnv,
          confirmEscrowPayment: async (quote) => {
            console.log(
              `Compute escrow quote: ${quote.amount} base units of token ${quote.token}`,
            );
            return true;
          },
          confirmProviderFees: async () => true,
        });
      }

      const jobs = computeResult.jobs;

      for (const job of jobs) {
        this.log(
          `Compute started, check status using command:\n pontus-x_cli compute-status ${job.jobId}\n`,
        );
      }

      return jobs;
    } catch (error) {
      this.error(`Error starting compute: ${error}`);
    }
  }
}

type ComputeMode = "free" | "paid";

/**
 * Picks the node's environment that can run the requested kind of job.
 *
 * Both `freeCompute()` and `compute()` default to the node's *first*
 * environment. A node often advertises a free environment without fees and a
 * separate paid one that publishes them, so letting the default decide makes a
 * paid job fail with "publishes no fees for chain ...".
 */
function pickComputeEnvironment(
  environments: ComputeEnvironment[],
  mode: ComputeMode,
  chainId: number,
): string | undefined {
  const environment = environments.find((candidate) =>
    mode === "free"
      ? Boolean(candidate.free)
      : Boolean(candidate.fees?.[String(chainId)]?.length),
  );
  return environment?.id;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Turns a node error into something actionable. In particular, an algorithm
 * image published for only one CPU architecture fails on a node running the
 * other one, and the node's message does not say what to do about it.
 */
function computeErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  if (
    /Cannot find image .* for (aarch64|arm64|x86_64|amd64)\b/i.test(message)
  ) {
    return (
      `${message}\n\n` +
      "The compute node cannot run this algorithm image on its CPU architecture. " +
      "Rebuild and publish the image for the node's architecture " +
      "(for example `docker buildx build --platform linux/amd64,linux/arm64 -t <image>:<tag> --push .`) " +
      "and update the algorithm's container checksum with `pontus-x_cli edit-algo`."
    );
  }
  return message;
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
