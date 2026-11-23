import * as fs from "node:fs";
import * as vm from "node:vm";
import { PublishIncompleteError } from "@deltadao/nautilus";
import { Args, Command, Flags } from "@oclif/core";
import chalk from "chalk";
import * as ts from "typescript";
import { DEFAULT_OCEAN_NODE_URI } from "@/config";
import {
  readAssetConfig,
  resolveAssetFiles,
  updatePublication,
} from "@/lib/asset-files";
import { Connection } from "@/utils/connection";
import { manifestFlag } from "@/utils/manifest-flag";
import { readOptionalManifest } from "../lib/manifest";
import { getEnvironmentConfig, publishFromFile, updateFromFile } from "../lib/spec";

export default class Publish extends Command {
  static args = {
    path: Args.string({
      description:
        "Path to find a JSON/YAML or TS file describing the asset to publish",
      required: true,
    }),
  };
  static description =
    "Publish the asset as instructed in the provided script folder.";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> samples/publish/algo/",
    "<%= config.bin %> <%= command.id %> samples/publish/algo/spec.json",
    "<%= config.bin %> <%= command.id %> samples/publish/algo/spec.yaml",
    "<%= config.bin %> <%= command.id %> samples/publish/algo/index.ts",
  ];
  static flags = {
    "dry-run": Flags.boolean({
      default: false,
      description: "Dry run the publishing process",
    }),
    manifest: manifestFlag,
    provider: Flags.string({
      char: "p",
      description: "The Ocean Node URL (defaults to OCEAN_NODE_URI from .env)",
    }),
    resume: Flags.string({
      description: "Resume an incomplete publish on an existing NFT address",
    }),
    recursive: Flags.boolean({
      char: "r",
      default: false,
      description: "Recursively publish assets in a directory",
    }),
    update: Flags.string({
      description:
        "Update an existing asset with this spec instead of publishing a new one (DID is preserved)",
    }),
    "update-files": Flags.string({
      description:
        "With --update, replace the files of the matching service(s) from the spec. Pass a service type (e.g. compute) or service id; repeat for several. The service id changes, the DID and datatoken do not.",
      multiple: true,
    }),
  };

  async run(): Promise<string | undefined> {
    const { args, flags } = await this.parse(Publish);

    if (flags.update && flags.resume) {
      this.error("--update and --resume cannot be combined.");
    }
    if (flags["update-files"] && !flags.update) {
      this.error("--update-files only works together with --update <DID>.");
    }
    if (flags.update && flags.recursive) {
      this.error("--update works on a single spec file, not with -r.");
    }

    const files = resolveAssetFiles(args.path, flags.recursive);

    const manifest = readOptionalManifest(flags.manifest);

    if (!flags.recursive) {
      const [path] = files;

      try {
        const environment = await getEnvironmentConfig(
          path,
          readAssetConfig(path),
          manifest,
        );
        if (!environment)
          this.error(`Missing environment configuration for file ${path}`);
        const connection = await Connection.connect(
          {
            NETWORK: environment.network,
            PRIVATE_KEY: environment.privateKey,
          },
          flags.manifest,
        );

        if (flags.update) {
          const updatedDid = await updateFromFile(
            path,
            flags.update,
            connection,
            flags["dry-run"],
            flags["update-files"],
          );
          if (updatedDid && !flags["dry-run"]) {
            updatePublication(path, {
              did: updatedDid,
              owner: connection.wallet.address,
              network: environment.network,
            });
          }
          return updatedDid;
        }

        const originalPublish = connection.nautilus.publish.bind(
          connection.nautilus,
        );

        const normalizePublishResult = (res: any) => {
          if (res?.setMetadataTxReceipt) {
            const hash =
              res.setMetadataTxReceipt.hash ||
              res.setMetadataTxReceipt.transactionHash;
            if (hash && !res.setMetadataTxReceipt.transactionHash) {
              res.setMetadataTxReceipt.transactionHash = hash;
            }
          }
          return res;
        };

        if (flags.resume) {
          const resumeNft = flags.resume;
          connection.nautilus.publish = (async (asset: any, options: any) => {
            console.log(`Resuming publish on existing NFT ${resumeNft}...`);
            const res = await connection.nautilus.completePublish(
              resumeNft,
              asset,
              {
                ...options,
                waitForIndexer: true,
              },
            );
            return normalizePublishResult(res);
          }) as any;
        } else {
          connection.nautilus.publish = (async (asset: any, options: any) => {
            try {
              const res = await originalPublish(asset, options);
              return normalizePublishResult(res);
            } catch (error) {
              if (error instanceof PublishIncompleteError) {
                console.warn(
                  `⚠️  Publishing stopped after NFT ${error.nftAddress} was created. Resuming via completePublish()...`,
                );
                const res = await connection.nautilus.completePublish(
                  error.nftAddress,
                  asset,
                  {
                    ...options,
                    waitForIndexer: true,
                    metadataTxHash: error.stored?.txHash,
                  },
                );
                return normalizePublishResult(res);
              }
              throw error;
            }
          }) as any;
        }

        const did = await publish(
          path,
          flags.provider || "",
          flags["dry-run"],
          connection,
        );
        if (did && !flags["dry-run"]) {
          updatePublication(path, {
            did,
            owner: connection.wallet.address,
            network: environment.network,
          });
        }
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error));
      }

      return;
    }

    for (const file of files) {
      const config = readAssetConfig(file);
      const { did } = config.metadata;
      if (did) {
        console.log(
          chalk.yellow(
            `Skipping file ${file} as it is already published: ${did}`,
          ),
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
          `Publishing file ${file} with owner ${owner} on network ${network}`,
        ),
      );

      try {
        const envOverrides = {
          NETWORK: network,
          PRIVATE_KEY: privateKey,
        };
        const connection = await Connection.connect(envOverrides);

        const publishedDid = await publish(
          file,
          flags.provider || "",
          flags["dry-run"],
          connection,
        );

        if (publishedDid && !flags["dry-run"]) {
          updatePublication(file, { did: publishedDid, owner, network });
        }

        console.log(
          chalk.green(`Published file ${file} with DID: ${publishedDid}`),
        );
      } catch (error) {
        this.error(`Error publishing file ${file}`);
      }
    }
  }
}

async function invokeFunctionFromFile(
  filePath: string,
  functionName: string,
  ...args: any[]
) {
  // Read the TypeScript file content
  const tsContent = fs.readFileSync(filePath, "utf8");

  // Transpile TypeScript to JavaScript
  const jsContent = ts.transpileModule(tsContent, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;

  // Create a new context for the script
  const script = new vm.Script(jsContent);
  const scriptModule = { exports: {} as Record<string, any> };
  const context = vm.createContext({
    console,
    exports: scriptModule.exports,
    module: scriptModule,
    require,
  });

  // Run the script in the context
  script.runInContext(context);

  // Invoke the function by name
  const fn = scriptModule.exports[functionName] || context[functionName];
  if (typeof fn === "function") {
    return fn(...args);
  }

  throw new Error(`Function ${functionName} not found in ${filePath}`);
}

async function publish(
  path: string,
  provider: string,
  dryRun: boolean,
  connection: Connection,
): Promise<string | undefined> {
  if (path.endsWith(".ts")) {
    const dirPath = path.split("/").slice(0, -1).join("/");
    const originalPublish = connection.nautilus.publish;
    let publishedDid: string | undefined;
    connection.nautilus.publish = (async (
      ...args: Parameters<typeof originalPublish>
    ) => {
      const result = await originalPublish.apply(connection.nautilus, args);
      publishedDid =
        typeof result.ddo.id === "string" ? result.ddo.id : undefined;
      return result;
    }) as typeof originalPublish;
    try {
      const result = await invokeFunctionFromFile(
        path,
        "publish",
        dirPath,
        connection,
        provider ||
          process.env.OCEAN_NODE_URI ||
          connection.networkConfig.oceanNodeUri ||
          DEFAULT_OCEAN_NODE_URI,
        dryRun,
      );
      return typeof result === "string" ? result : publishedDid;
    } finally {
      connection.nautilus.publish = originalPublish;
    }
  }

  if (path.endsWith(".json") || path.endsWith(".yaml")) {
    return await publishFromFile(path, provider, connection, dryRun);
  }

  throw new Error("The provided file must be a .json/.yaml or .ts file");
}
