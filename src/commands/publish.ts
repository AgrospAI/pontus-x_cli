import * as fs from "node:fs";
import * as vm from "node:vm";
import { Args, Command, Flags } from "@oclif/core";
import chalk from "chalk";
import * as ts from "typescript";
import { setKeyInYaml } from "@/lib/yaml";
import { Connection } from "@/utils/connection";
import { readManifest } from "../lib/manifest";
import {
  getEnvironmentConfig,
  getFilesFromPaths,
  parseConfig,
  publishFromFile,
} from "../lib/spec";

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
  const context = vm.createContext({ console, exports, module, require });

  // Run the script in the context
  script.runInContext(context);

  // Invoke the function by name
  if (typeof context[functionName] === "function") {
    return context[functionName](...args);
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
    return invokeFunctionFromFile(
      path,
      "publish",
      dirPath,
      connection,
      provider,
      dryRun,
    );
  }

  if (path.endsWith(".json") || path.endsWith(".yaml")) {
    return publishFromFile(path, provider, connection, dryRun);
  }

  throw new Error("The provided file must be a .json/.yaml or .ts file");
}

export default class Publish extends Command {
  static args = {
    path: Args.directory({
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
    manifest: Flags.string({
      char: "m",
      default: "./manifest.yaml",
      description: "Path to the manifest file",
    }),
    provider: Flags.string({
      char: "p",
      default: "https://provider.agrospai.udl.cat",
      description: "The Provider URL",
    }),
    recursive: Flags.boolean({
      char: "r",
      default: false,
      description:
        "Recursively publish assets in a directory (only for JSON/YAML files)",
    }),
  };

  async run(): Promise<string | undefined> {
    const { args, flags } = await this.parse(Publish);

    if (!fs.existsSync(args.path)) {
      this.error(`The provided path does not exist: ${args.path}`);
    }

    const isDirectory = fs.lstatSync(args.path).isDirectory();

    if (!flags.recursive) {
      let { path } = args;
      if (isDirectory) {
        path =
          ["spec.yaml", "spec.json", "index.ts"]
            .map((file) => `${args.path}/${file}`)
            .find((file) => fs.existsSync(file)) || "";
        if (!path) {
          this.error(
            `No spec.yaml, spec.json or index.ts file found in the provided directory: ${args.path}`,
          );
        }
      }

      try {
        const connection = await Connection.connect();
        await publish(path, flags.provider, flags["dry-run"], connection);
      } catch (error) {
        console.error(error as string);
        this.error(
          "Please, login before running this command with a TypeScript file",
        );
      }

      return;
    }

    const filesToPublish = getFilesFromPaths(
      [args.path],
      ["spec.yaml", "spec.json", "index.ts"],
    );

    const manifest = readManifest(flags.manifest);

    for (const file of filesToPublish) {
      const config = parseConfig(file);
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
          flags.provider,
          flags["dry-run"],
          connection,
        );

        setKeyInYaml(file, "metadata.did", publishedDid);
        setKeyInYaml(file, "metadata.owner", owner);
        setKeyInYaml(file, "metadata.network", network);

        console.log(
          chalk.green(`Published file ${file} with DID: ${publishedDid}`),
        );
      } catch (error) {
        console.error(error as string);
        this.error(`Error publishing file ${file}`);
      }
    }
  }
}
