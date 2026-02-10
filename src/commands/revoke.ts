import { LifecycleStates } from "@deltadao/nautilus";
import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import readlineSync from "readline-sync";

import { Connection } from "@/utils/connection";
import { readManifest } from "../lib/manifest";
import {
  getEnvironmentConfig,
  getFilesFromPaths,
  parseConfig,
} from "../lib/spec";
import { deleteKeyFromYaml } from "../lib/yaml";

export default class Revoke extends Command {
  static description = "Publisher revocation of one or more owned DIDs";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a did:op:abcee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7b",
  ];
  static flags = {
    dids: Flags.string({
      char: "d",
      description: "DID to revoke",
      multiple: true,
      required: false,
    }),
    manifest: Flags.string({
      char: "m",
      default: "./manifest.yaml",
      description: "Path to the manifest file",
    }),
    paths: Flags.string({
      char: "p",
      description:
        "Path to find a JSON/YAML file describing the assets to revoke",
      multiple: true,
      required: false,
    }),
    recursive: Flags.boolean({
      char: "r",
      default: false,
      description:
        "Recursively revoke assets in a directory (only for JSON/YAML files)",
    }),
    yes: Flags.boolean({
      char: "y",
      default: false,
      description: "Skip confirmation prompt",
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Revoke);
    const dids = flags.dids || [];
    const paths = flags.paths || [];

    if (dids.length === 0 && paths.length === 0) {
      this.error(
        "Please provide at least one DID or a path to a JSON/YAML file describing the assets to revoke",
      );
    }

    if (paths.length > 0) {
      const filesToRevoke = getFilesFromPaths(paths, [
        "spec.yaml",
        "spec.json",
      ]);
      const manifest = readManifest(flags.manifest);

      for (const file of filesToRevoke) {
        const config = parseConfig(file);

        const { did } = config.metadata;
        if (!did) {
          console.log(
            chalk.yellow(`Skipping file ${file} as it is not published.`),
          );
          continue;
        }

        console.log(chalk.blue(`Processing file: ${file}`));

        const environmentConfig = await getEnvironmentConfig(
          file,
          config,
          manifest,
        );

        if (!environmentConfig) {
          console.error(
            chalk.red(
              `Skipping file ${file} due to missing environment configuration`,
            ),
          );
          continue;
        }

        const { network, owner, privateKey } = environmentConfig;

        console.log(
          chalk.green(
            `Revoking file ${file} with owner ${owner} on network ${network}`,
          ),
        );

        try {
          const envOverrides = {
            NETWORK: network,
            PRIVATE_KEY: privateKey,
          };
          const connection = await Connection.connect(envOverrides);
          const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
          await connection.nautilus.setAssetLifecycleState(
            aquariusAsset,
            LifecycleStates.REVOKED_BY_PUBLISHER,
          );

          deleteKeyFromYaml(file, "metadata.did");
        } catch (error) {
          console.error(error as string);
          this.error(`Error revoking file ${file}`);
        }
      }

      return;
    }

    if (dids.length > 0) {
      if (!flags.yes) {
        const confirmation = readlineSync.keyInYNStrict(
          `Revoke assets ${dids.join(", ")}? `,
        );
        if (!confirmation) {
          this.log("Revocation cancelled by user.");
          return;
        }
      }

      const connection = await Connection.connect();

      for (const did of dids) {
        try {
          const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
          this.log("Sending transaction to revoke asset...");
          const tx = await connection.nautilus.setAssetLifecycleState(
            aquariusAsset,
            LifecycleStates.REVOKED_BY_PUBLISHER,
          );
          this.log(
            `Asset revoked, transaction: ${connection.networkConfig.explorerUri}/tx/${tx.transactionHash}\n`,
          );
        } catch (error) {
          this.log(`Error revoking asset: ${error}`);
        }
      }
      return;
    }
  }
}
