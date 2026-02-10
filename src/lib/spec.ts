import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { join } from "node:path";
import {
  AssetBuilder,
  ConsumerParameterBuilder,
  CredentialListTypes,
  type PricingConfigWithoutOwner,
  ServiceBuilder,
} from "@deltadao/nautilus";
import Ajv from "ajv";
import { Wallet } from "ethers";
import { parse, stringify } from "yaml";

import { getAccountByAddress } from "@/lib/manifest";
import { getPrivateKey } from "@/lib/wallet";
import type { Manifest } from "@/types/manifest";
import type PublishConfig from "@/types/publish";
import schema from "@/types/schema";
import type { Connection } from "@/utils/connection";

function getFiles(
  rootPath: string,
  preference: string[] = ["spec.yaml", "spec.json", "index.ts"],
): string[] {
  const specifications: string[] = [];

  const walkDir = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true });

    // Find the first preferred file that exists in this directory
    const preferredFile = preference.find((pref) =>
      entries.some((entry) => entry.isFile() && entry.name === pref),
    );

    if (preferredFile) {
      specifications.push(join(dir, preferredFile));
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walkDir(join(dir, entry.name));
      }
    }
  };

  walkDir(rootPath);
  return specifications;
}

export function getFilesFromPaths(
  paths: string[],
  preference?: string[],
): string[] {
  return paths.flatMap((path) => getFiles(path, preference));
}

export async function getEnvironmentConfig(
  file: string,
  config: PublishConfig,
  manifest: Manifest,
) {
  const network = config.metadata.network || process.env.NETWORK;
  if (!network) {
    console.error(
      `No network specified for file ${file}. Please add it to the metadata or set the NETWORK environment variable.`,
    );
    return null;
  }

  let privateKey = process.env.PRIVATE_KEY;
  let { owner } = config.metadata;

  if (!privateKey && !owner) {
    console.error(
      `No owner or private key specified for file ${file}. Please add owner to the metadata or set the PRIVATE_KEY environment variable.`,
    );
    return null;
  }

  if (privateKey && !owner) {
    owner = new Wallet(privateKey).address;
  }

  if (owner && !privateKey) {
    const account = getAccountByAddress(manifest, owner);
    const password = process.env[account?.passwordEnvKey || ""] || "";
    try {
      privateKey = await getPrivateKey(account?.privateKeyPath || "", password);
    } catch (error) {
      console.error(
        `Failed to retrieve private key for owner ${owner}:`,
        error,
      );
      console.error("Password used:", password);
      return null;
    }
  }

  if (!privateKey) {
    console.error(
      `Unable to retrieve private key for file ${file}. Please check the manifest and environment variables.`,
    );
    return null;
  }

  return { network, owner, privateKey };
}

export function parseConfig(filePath: string): PublishConfig {
  const raw = readFileSync(filePath, "utf8");
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".json") {
    return JSON.parse(raw);
  }

  if (ext === ".yaml") {
    return parse(raw) as PublishConfig;
  }

  throw new Error(`Unsupported file extension: ${ext}`);
}

export function writeConfig(config: PublishConfig, filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();

  let content: string;
  if (ext === ".json") {
    content = JSON.stringify(config, null, 2);
  } else if (ext === ".yaml") {
    content = stringify(config);
  } else {
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  writeFileSync(filePath, content, "utf8");
}

function getPricing(
  connection: Connection,
  type: PublishConfig["service"]["pricing"]["type"],
  currency: PublishConfig["service"]["pricing"]["currency"],
  amount: PublishConfig["service"]["pricing"]["amount"],
): PricingConfigWithoutOwner {
  if (type === "free" || !amount) {
    return { type: "free" };
  }

  const pricingMap = {
    EURAU: connection.pricingConfig.fixedRateEURAU,
    EUROe: connection.pricingConfig.fixedRateEUROe,
    OCEAN: connection.pricingConfig.fixedRateOCEAN,
  } as const;

  const pricingFn =
    pricingMap[currency as keyof typeof pricingMap] ?? pricingMap.OCEAN;

  return pricingFn(amount);
}

export async function publishFromFile(
  filePath: string,
  providerUrl: string,
  connection: Connection,
  dryRun: boolean,
) {
  const config: PublishConfig = parseConfig(filePath);

  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(config);

  if (!valid) {
    console.error("❌ Invalid publish config file:");
    console.error(validate.errors);
    throw new Error(`Publish config validation failed for file ${filePath}`);
  }

  const folder = path.dirname(filePath);

  const assetBuilder = new AssetBuilder()
    .setType(config.metadata.type)
    .setName(config.metadata.name)
    .setOwner(connection.wallet.address)
    .setDescription(
      readFileSync(path.resolve(folder, config.metadata.description), "utf8"),
    )
    .setLicense(config.metadata.license)
    .setNftData(config.nftData);

  if (config.metadata.author) {
    assetBuilder.setAuthor(config.metadata.author);
  }

  if (config.metadata.tags) {
    assetBuilder.addTags(config.metadata.tags);
  }

  if (config.metadata.links) {
    assetBuilder.addLinks(config.metadata.links);
  }

  if (config.credentials) {
    if (config.credentials.allow) {
      assetBuilder.addCredentialAddresses(
        CredentialListTypes.ALLOW,
        config.credentials.allow,
      );
    }

    if (config.credentials.deny) {
      assetBuilder.addCredentialAddresses(
        CredentialListTypes.DENY,
        config.credentials.deny,
      );
    }
  }

  if (config.metadata.additionalInformation) {
    assetBuilder.addAdditionalInformation(
      config.metadata.additionalInformation,
    );
  }

  if (config.metadata.type === "algorithm" && config.metadata.algorithm) {
    const consumerParameters = [];
    for (const param of config.metadata.algorithm.consumerParameters || []) {
      const consumerParameter = new ConsumerParameterBuilder()
        .setType(param.type)
        .setName(param.name)
        .setLabel(param.label)
        .setDescription(param.description)
        .setRequired(param.required)
        .setDefault(
          typeof param.default === "object"
            ? JSON.stringify(param.default)
            : param.default,
        );

      for (const option of param.options || []) {
        consumerParameter.addOption(option);
      }

      consumerParameters.push(consumerParameter.build());
    }

    const algorithm = {
      container: config.metadata.algorithm.container,
      language: config.metadata.algorithm.language,
      version: config.metadata.algorithm.version,
    };

    assetBuilder.setAlgorithm(
      consumerParameters.length > 0
        ? { ...algorithm, consumerParameters }
        : algorithm,
    );
  }

  const serviceBuilder = new ServiceBuilder({
    fileType: config.service.fileType,
    serviceType: config.service.serviceType,
  });

  for (const file of config.service.files) {
    serviceBuilder.addFile(file);
  }

  for (const param of config.service.consumerParameters || []) {
    // Stringify param.default if it's an object
    const defaultValue =
      typeof param.default === "object"
        ? JSON.stringify(param.default)
        : param.default;

    const consumerParam = new ConsumerParameterBuilder()
      .setType(param.type)
      .setName(param.name)
      .setLabel(param.label)
      .setDescription(param.description)
      .setRequired(param.required)
      .setDefault(defaultValue)
      .build();

    serviceBuilder.addConsumerParameter(consumerParam);
  }

  if (config.trustedAlgorithms) {
    serviceBuilder.addTrustedAlgorithms(config.trustedAlgorithms);
  }

  for (const trustedAlgorithmPublisher of config.trustedAlgorithmPublishers ||
    []) {
    serviceBuilder.addTrustedAlgorithmPublisher(trustedAlgorithmPublisher);
  }

  if (config.trustOwnerAlgorithms) {
    serviceBuilder.addTrustedAlgorithmPublisher(connection.wallet.address);
  }

  if (config.allowAlgorithmNetworkAccess !== undefined) {
    serviceBuilder.allowAlgorithmNetworkAccess(
      config.allowAlgorithmNetworkAccess,
    );
  }

  serviceBuilder
    .setServiceEndpoint(providerUrl)
    .setTimeout(config.service.timeout)
    .setDatatokenNameAndSymbol(
      config.service.datatoken.name,
      config.service.datatoken.symbol,
    )
    .setPricing(
      getPricing(
        connection,
        config.service.pricing.type,
        config.service.pricing.currency,
        config.service.pricing.amount,
      ),
    );

  const service = serviceBuilder.build();

  assetBuilder.addService(service);

  const asset = assetBuilder.build();

  console.log(`\n✅ Asset metadata:\n${JSON.stringify(asset, null, 2)}\n`);

  if (dryRun) {
    console.log("⚠️  Dry run enabled. Asset not published.\n");
    return;
  }

  console.log(`🚀 Publishing asset...`);

  const result = await connection.nautilus.publish(asset);
  console.log(
    [
      "✅ Asset published.",
      `🔗 Transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}`,
      `🌐 Asset: https://portal.agrospai.udl.cat/asset/${result.ddo.id}`,
    ].join("\n"),
  );

  return asset.ddo.id;
}
