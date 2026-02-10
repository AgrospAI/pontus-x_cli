import type { ComputeJob } from "@oceanprotocol/lib";
import { Args, Command, Flags } from "@oclif/core";
import chalk from "chalk";
import readlineSync from "readline-sync";
import { GetAssetName, GetDatasetsByTags } from "@/lib/aquarius";
import { Connection } from "@/utils/connection";

export default class Compute extends Command {
  static args = {
    algo: Args.string({ description: "Algorithm DID", required: true }),
  };
  static description = "Compute the algorithm on one or more datasets.";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:op:34e2f... -d did:op:d8a36... -d did:op:12b45...",
    "<%= config.bin %> <%= command.id %> did:op:34e2f... -t tag1 -t tag2",
  ];
  static flags = {
    datasets: Flags.string({
      char: "d",
      description: "Dataset DIDs",
      multiple: true,
      required: false,
    }),
    tags: Flags.string({
      char: "t",
      description:
        "Tags to filter datasets (they must have all the provided tags)",
      multiple: true,
      required: false,
    }),
    yes: Flags.boolean({
      char: "y",
      default: false,
      description: "Automatic yes to prompts",
      required: false,
    }),
  };

  async run(): Promise<ComputeJob | ComputeJob[] | undefined> {
    const { args, flags } = await this.parse(Compute);
    const { algo } = args;
    const { datasets, tags, yes } = flags;

    if (!datasets && !tags) {
      this.error(
        "You must provide at least one dataset DID or tag to filter datasets.",
      );
    }

    const connection = await Connection.connect();

    const chainIds = [connection.networkConfig.chainId];
    const { metadataCacheUri } = connection.networkConfig;

    const algorithmName = await GetAssetName(algo, chainIds, metadataCacheUri);

    let datasetsByTags: any[] = [];

    if (tags) {
      datasetsByTags = await GetDatasetsByTags(
        tags,
        chainIds,
        metadataCacheUri,
      );
      if (datasetsByTags.length === 0) {
        this.error(
          `No datasets found with tags ${chalk.italic(tags.join(", "))}`,
        );
      }

      console.log(
        `\nFound ${datasetsByTags.length} datasets with tags ${chalk.italic(tags.join(", "))}`,
      );
      for (const dataset of datasetsByTags) {
        console.log(`- ${dataset.did} ${chalk.blue(dataset.name)}`);
      }

      console.log();
    }

    if (datasets) {
      console.log(`\nUsing ${datasets.length} provided datasets:`);

      const results = await Promise.all(
        datasets.map(async (datasetDid) => {
          const datasetName = await GetAssetName(
            datasetDid,
            chainIds,
            metadataCacheUri,
          );
          return { datasetDid, datasetName };
        }),
      );

      for (const { datasetDid, datasetName } of results) {
        console.log(`- ${datasetDid} ${chalk.blue(datasetName)}`);
      }

      console.log();
    }

    const joinedDatasets = [
      ...(datasets ?? []),
      ...(datasetsByTags?.map((d) => d.did) ?? []),
    ];

    if (
      yes ||
      readlineSync.keyInYNStrict(
        `Proceed to compute algorithm ${chalk.blue(algorithmName)} (${algo}) on ${joinedDatasets.length} datasets? `,
      )
    ) {
      try {
        const firstDatasetAsset = await connection.nautilus.getAquariusAsset(
          joinedDatasets[0],
        );
        const provider = firstDatasetAsset.services[0].serviceEndpoint;
        const dataset = {
          did: joinedDatasets[0],
        };
        const algorithm = { did: algo };
        const additionalDatasets = joinedDatasets
          .filter((_, i) => i > 0)
          .map((dataset) => ({ did: dataset }));
        const computeJob = await connection.nautilus.compute({
          additionalDatasets,
          algorithm,
          dataset,
        });

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
}
