import { LifecycleStates } from "@deltadao/nautilus";
import { Args, Command, Flags } from "@oclif/core";
import chalk from "chalk";
import readlineSync from "readline-sync";

import {
  readAssetConfig,
  resolveAssetFiles,
  updatePublication,
} from "@/lib/asset-files";
import { Connection } from "@/utils/connection";
import { readManifest } from "../lib/manifest";
import { getEnvironmentConfig } from "../lib/spec";

export default class Revoke extends Command {
  static args = {
    path: Args.string({
      description:
        "Path to a JSON/YAML or TS file or asset directory to revoke",
      required: false,
    }),
  };
  static description = "Publisher revocation of one or more owned assets";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> samples/publish/algo/",
    "<%= config.bin %> <%= command.id %> samples/publish/algo/spec.yaml",
    "<%= config.bin %> <%= command.id %> samples/publish/ --recursive",
    "<%= config.bin %> <%= command.id %> -d did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a",
  ];
  static flags = {
    dids: Flags.string({
      char: "d",
      description: "DID to revoke",
      multiple: true,
    }),
    "dry-run": Flags.boolean({
      default: false,
      description: "Preview revocation without changing assets or files",
    }),
    manifest: Flags.string({
      char: "m",
      default: "./manifest.yaml",
      description: "Path to the manifest file",
    }),
    paths: Flags.string({
      description: "Paths to assets to revoke (alias for the positional path)",
      multiple: true,
    }),
    provider: Flags.string({
      char: "p",
      description: "The Ocean Node URL (defaults to OCEAN_NODE_URI from .env)",
    }),
    recursive: Flags.boolean({
      char: "r",
      default: false,
      description: "Recursively revoke assets in a directory",
    }),
    yes: Flags.boolean({
      char: "y",
      default: false,
      description: "Skip confirmation prompt",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Revoke);
    const dids = flags.dids || [];
    const paths = [...(args.path ? [args.path] : []), ...(flags.paths || [])];
    if (!dids.length && !paths.length) {
      this.error(
        "Please provide an asset path or at least one DID with --dids",
      );
    }
    if (dids.length && paths.length) {
      this.error("Provide either asset paths or --dids in a single invocation");
    }

    if (paths.length) {
      const files = [
        ...new Set(
          paths.flatMap((path) => resolveAssetFiles(path, flags.recursive)),
        ),
      ];
      // Match publish: single assets use the current login, recursive batches use the manifest.
      const manifest = flags.recursive
        ? readManifest(flags.manifest)
        : undefined;
      for (const file of files) {
        const config = readAssetConfig(file);
        const { did } = config.metadata;
        if (!did) {
          this.log(
            chalk.yellow(`Skipping file ${file} as it is not published.`),
          );
          continue;
        }
        if (flags["dry-run"]) {
          this.log(`Would revoke asset ${did} from ${file}`);
          continue;
        }
        let envOverrides: Record<string, string> = {};
        if (manifest) {
          const environment = await getEnvironmentConfig(
            file,
            config,
            manifest,
          );
          if (!environment) {
            this.log(
              chalk.red(
                `Skipping file ${file} due to missing environment configuration`,
              ),
            );
            continue;
          }
          envOverrides = {
            NETWORK: environment.network,
            PRIVATE_KEY: environment.privateKey,
          };
        }
        if (flags.provider) envOverrides.OCEAN_NODE_URI = flags.provider;
        try {
          const connection = await Connection.connect(envOverrides);
          const asset = await connection.nautilus.getAsset(did);
          await connection.nautilus.setAssetLifecycleState(
            asset,
            LifecycleStates.REVOKED_BY_PUBLISHER,
          );
          updatePublication(file, {});
          this.log(`Asset ${did} revoked from ${file}`);
        } catch (error) {
          this.error(`Error revoking file ${file}: ${error}`);
        }
      }
      return;
    }

    if (flags["dry-run"]) {
      this.log(`Would revoke assets ${dids.join(", ")}`);
      return;
    }
    if (
      !flags.yes &&
      !readlineSync.keyInYNStrict(`Revoke assets ${dids.join(", ")}? `)
    ) {
      this.log("Revocation cancelled by user.");
      return;
    }
    const connection = await Connection.connect(
      flags.provider ? { OCEAN_NODE_URI: flags.provider } : undefined,
    );
    for (const did of dids) {
      try {
        const asset = await connection.nautilus.getAsset(did);
        this.log("Sending transaction to revoke asset...");
        const tx = await connection.nautilus.setAssetLifecycleState(
          asset,
          LifecycleStates.REVOKED_BY_PUBLISHER,
        );
        const txHash = (tx as any)?.hash || (tx as any)?.transactionHash;
        this.log(
          txHash
            ? `Asset revoked, transaction: ${connection.networkConfig.explorerUri}/tx/${txHash}\n`
            : `Asset ${did} is already revoked.\n`,
        );
      } catch (error) {
        this.log(`Error revoking asset: ${error}`);
      }
    }
  }
}
