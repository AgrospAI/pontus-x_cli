import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { join } from "node:path";
import type { PublishResponse } from "@deltadao/nautilus";
import {
  AssetBuilder,
  ConsumerParameterBuilder,
  CredentialListTypes,
  getServices,
  type PricingConfigWithoutOwner,
  PublishIncompleteError,
  ServiceBuilder,
} from "@deltadao/nautilus";
import Ajv from "ajv";
import { Wallet } from "ethers";
import { parse, stringify } from "yaml";

import { getAccountByAddress, normalizeAddress } from "@/lib/manifest";
import { readPrivateKey } from "@/lib/wallet";
import type { Manifest } from "@/types/manifest";
import type PublishConfig from "@/types/publish";
import type { ServiceConfig } from "@/types/publish";
import schema from "@/types/schema";
import {
  manifestToLoginInfos,
  selectLoginInfo,
  NOT_LOGGED_IN_MESSAGE,
} from "@/utils/login";
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
  manifest?: Manifest,
) {
  if (!manifest && !process.env.PRIVATE_KEY) {
    throw new Error(NOT_LOGGED_IN_MESSAGE);
  }

  const network = config.metadata.network || process.env.NETWORK;
  if (!network) {
    console.error(
      `No network specified for file ${file}. Please add it to the metadata or set the NETWORK environment variable.`,
    );
    return null;
  }

  let privateKey: string;
  const requestedOwner = config.metadata.owner;

  if (manifest && requestedOwner) {
    const account = getAccountByAddress(manifest, requestedOwner);
    if (!account) {
      throw new Error(
        `No login account found in the manifest for owner ${requestedOwner} (file ${file}).`,
      );
    }
    try {
      privateKey = await readPrivateKey(
        account.privateKeyPath,
        process.env[account.passwordEnvKey] || "",
      );
    } catch {
      throw new Error(
        `Failed to retrieve private key for owner ${requestedOwner}. Check the manifest key path and password environment variable.`,
      );
    }
    if (
      normalizeAddress(new Wallet(privateKey).address) !==
      normalizeAddress(requestedOwner)
    ) {
      throw new Error(
        `The manifest key does not match owner ${requestedOwner} (file ${file}).`,
      );
    }
  } else if (manifest) {
    privateKey = (await selectLoginInfo(await manifestToLoginInfos(manifest)))
      .privateKey;
  } else {
    privateKey = process.env.PRIVATE_KEY || "";
  }

  const owner = new Wallet(privateKey).address;

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
  type: ServiceConfig["pricing"]["type"],
  currency: ServiceConfig["pricing"]["currency"],
  amount: ServiceConfig["pricing"]["amount"],
): PricingConfigWithoutOwner {
  if (type === "free" || !amount) {
    return { type: "free" };
  }

  const pricingMap = {
    EURAU: connection.pricingConfig.fixedRateEURAU,
    EUROe: connection.pricingConfig.fixedRateEUROe,
    OCEAN: connection.pricingConfig.fixedRateOCEAN,
    devEURAU: connection.pricingConfig.fixedRateDevEURAU,
  } as const;

  const pricingFn =
    pricingMap[currency as keyof typeof pricingMap] ?? pricingMap.OCEAN;

  return pricingFn(amount);
}

// ---- Shared config helpers ------------------------------------------------

function resolveServiceConfigs(
  config: PublishConfig,
  filePath: string,
): ServiceConfig[] {
  // `service` is the single-service shorthand; `services` is the multi-service
  // form. Exactly one of them may be present.
  if (config.services?.length && config.service) {
    throw new Error(
      `Both \`service\` and \`services\` are defined in ${filePath}. Use one or the other.`,
    );
  }

  const serviceConfigs: ServiceConfig[] = config.services?.length
    ? config.services
    : config.service
      ? [config.service]
      : [];

  if (!serviceConfigs.length) {
    throw new Error(
      `No service defined in ${filePath}. Add a \`service\` block or a non-empty \`services\` list.`,
    );
  }

  return serviceConfigs;
}

function readConfigDescription(
  folder: string,
  config: PublishConfig,
): string {
  return readFileSync(
    path.resolve(folder, config.metadata.description),
    "utf8",
  );
}

function buildConsumerParameters(
  params: ServiceConfig["consumerParameters"],
): any[] {
  const consumerParameters: any[] = [];
  for (const param of params || []) {
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

    if (Array.isArray(param.options)) {
      for (const { key, value } of param.options) {
        consumerParameter.addOption({ [key]: value });
      }
    }

    consumerParameters.push(consumerParameter.build());
  }
  return consumerParameters;
}

/**
 * Reads the address values out of a DDO credential list. Handles both shapes:
 * legacy `{ values: ["0x.."] }` and the v5 `{ values: [{ address: "0x.." }] }`.
 */
function flattenCredentialAddresses(
  credentials: any,
  list: "allow" | "deny",
): string[] {
  const entries = Array.isArray(credentials?.[list])
    ? credentials[list]
    : [];
  const out: string[] = [];

  for (const entry of entries) {
    if (typeof entry === "string") {
      out.push(entry);
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    if (Array.isArray(entry.values)) {
      for (const value of entry.values) {
        if (typeof value === "string") out.push(value);
        else if (value && typeof value.address === "string") {
          out.push(value.address);
        }
      }
    } else if (typeof entry.address === "string") {
      out.push(entry.address);
    }
  }

  return [...new Set(out)];
}

/** Makes a spec's allow/deny lists authoritative, leaving non-address entries alone. */
function applyCredentialLists(
  builder: {
    addCredentialAddresses: (list: CredentialListTypes, addresses: string[]) => any;
    removeCredentialAddresses: (
      list: CredentialListTypes,
      addresses: string[],
    ) => any;
  },
  current: any,
  desired: { allow?: string[]; deny?: string[] },
): void {
  const lists = [
    ["allow", CredentialListTypes.ALLOW],
    ["deny", CredentialListTypes.DENY],
  ] as const;

  for (const [list, type] of lists) {
    const addresses = desired[list];
    if (!addresses) continue;

    const wanted = new Set(addresses.map((address) => address.toLowerCase()));
    const stale = flattenCredentialAddresses(current, list).filter(
      (address) => !wanted.has(address.toLowerCase()),
    );

    if (stale.length) builder.removeCredentialAddresses(type, stale);
    if (addresses.length) builder.addCredentialAddresses(type, addresses);
  }
}

/**
 * Replaces a service's address lists in the normalized v5 credential shape.
 * `ServiceBuilder` can only add addresses, so removal is done on the built
 * service's credential object.
 */
function replaceServiceCredentialLists(
  credentials: any,
  desired: { allow?: string[]; deny?: string[] },
): any {
  let next = { ...(credentials || {}) };

  for (const list of ["allow", "deny"] as const) {
    const addresses = desired[list];
    if (!addresses) continue;

    const entries = Array.isArray(next[list]) ? next[list] : [];
    const kept = entries.filter((entry: any) => entry?.type !== "address");

    // An empty allow entry means "deny everyone", so it is kept; an empty deny
    // entry denies no one, so it is dropped.
    if (addresses.length || list === "allow") {
      kept.push({
        type: "address",
        values: addresses.map((address) => ({ address })),
      });
    }

    next = { ...next, [list]: kept };
  }

  return next;
}

/**
 * Finds the published service a spec entry refers to without failing when
 * there is none. `publish --update` uses the miss to add a new service.
 */
function findPublishedService(
  publishedServices: any[],
  serviceConfig: ServiceConfig,
  usedServiceIds: Set<string>,
): any | undefined {
  if (serviceConfig.serviceId) {
    return publishedServices.find(
      (service) => service.id === serviceConfig.serviceId,
    );
  }

  return publishedServices.find(
    (service) =>
      service.type === serviceConfig.serviceType &&
      !usedServiceIds.has(service.id),
  );
}

/**
 * Turns the spec's `files` entries into the file objects the node encrypts.
 * `method` defaults to GET and `type` falls back to the service's `fileType`.
 */
function buildServiceFiles(serviceConfig: ServiceConfig): any[] {
  return serviceConfig.files.map((file) => {
    const fileObj = {
      method: "GET",
      ...file,
    } as any;
    if (!fileObj.type) {
      fileObj.type = serviceConfig.fileType || "url";
    }
    return fileObj;
  });
}

/**
 * Applies compute settings to an existing compute service. The spec is
 * authoritative: algorithms or publishers it omits are removed. Files and
 * pricing are never touched here, so the service id and datatoken survive.
 */
function applyComputeSettings(
  serviceBuilder: ServiceBuilder<any, any>,
  serviceConfig: ServiceConfig,
  config: PublishConfig,
  connection: Connection,
  publishedService: any,
): void {
  const allowNetworkAccess =
    serviceConfig.allowAlgorithmNetworkAccess ??
    config.allowAlgorithmNetworkAccess;
  if (allowNetworkAccess !== undefined) {
    serviceBuilder.allowAlgorithmNetworkAccess(allowNetworkAccess);
  }

  const trustedAlgorithms =
    serviceConfig.trustedAlgorithms ?? config.trustedAlgorithms;
  if (trustedAlgorithms) {
    const wanted = new Set(trustedAlgorithms.map((entry) => entry.did));
    const current = publishedService.compute?.publisherTrustedAlgorithms;

    for (const algorithm of Array.isArray(current) ? current : []) {
      if (!wanted.has(algorithm.did)) {
        serviceBuilder.removeTrustedAlgorithm(algorithm.did);
      }
    }

    if (trustedAlgorithms.length) {
      serviceBuilder.addTrustedAlgorithms(trustedAlgorithms);
    }
  }

  const publishers =
    serviceConfig.trustedAlgorithmPublishers ??
    config.trustedAlgorithmPublishers;
  const trustOwner =
    serviceConfig.trustOwnerAlgorithms ?? config.trustOwnerAlgorithms;

  if (publishers || trustOwner !== undefined) {
    const wanted = new Set(
      (publishers || []).map((address) => address.toLowerCase()),
    );
    if (trustOwner) wanted.add(connection.wallet.address.toLowerCase());

    const current = publishedService.compute?.publisherTrustedAlgorithmPublishers;
    for (const address of Array.isArray(current) ? current : []) {
      if (!wanted.has(address.toLowerCase())) {
        serviceBuilder.removeTrustedAlgorithmPublisher(address);
      }
    }
    for (const address of wanted) {
      serviceBuilder.addTrustedAlgorithmPublisher(address);
    }
  }
}

/**
 * Builds a brand-new service from its spec entry. Used when publishing an
 * asset and when `publish --update` adds a service the asset does not have
 * yet. A new service carries its own pricing, so nautilus mints a datatoken
 * for it and assigns the service id when the file object is encrypted.
 */
function buildNewService(
  serviceConfig: ServiceConfig,
  config: PublishConfig,
  connection: Connection,
  serviceEndpoint: string,
): any {
  const serviceBuilder = new ServiceBuilder({
    fileType: serviceConfig.fileType,
    serviceType: serviceConfig.serviceType,
  });

  serviceBuilder.setName(
    serviceConfig.name ||
      serviceConfig.datatoken?.name ||
      config.metadata.name ||
      "Access Service",
  );

  if (serviceConfig.displayName) {
    serviceBuilder.setDisplayName(serviceConfig.displayName);
  }

  for (const fileObj of buildServiceFiles(serviceConfig)) {
    serviceBuilder.addFile(fileObj);
  }

  for (const consumerParameter of buildConsumerParameters(
    serviceConfig.consumerParameters,
  )) {
    serviceBuilder.addConsumerParameter(consumerParameter);
  }

  // Per-service compute settings win over the spec-level defaults, so a
  // multi-service asset can trust different algorithms on each service.
  const trustedAlgorithms =
    serviceConfig.trustedAlgorithms ?? config.trustedAlgorithms;
  if (trustedAlgorithms) {
    serviceBuilder.addTrustedAlgorithms(trustedAlgorithms);
  }

  const trustedAlgorithmPublishers = [
    ...(serviceConfig.trustedAlgorithmPublishers ??
      config.trustedAlgorithmPublishers ??
      []),
  ];
  if (serviceConfig.trustOwnerAlgorithms ?? config.trustOwnerAlgorithms) {
    trustedAlgorithmPublishers.push(connection.wallet.address);
  }
  for (const trustedAlgorithmPublisher of trustedAlgorithmPublishers) {
    serviceBuilder.addTrustedAlgorithmPublisher(trustedAlgorithmPublisher);
  }

  const allowAlgorithmNetworkAccess =
    serviceConfig.allowAlgorithmNetworkAccess ??
    config.allowAlgorithmNetworkAccess;
  if (allowAlgorithmNetworkAccess !== undefined) {
    serviceBuilder.allowAlgorithmNetworkAccess(allowAlgorithmNetworkAccess);
  }

  if (serviceConfig.credentials) {
    if (serviceConfig.credentials.allow) {
      serviceBuilder.addCredentialAddresses(
        CredentialListTypes.ALLOW,
        serviceConfig.credentials.allow,
      );
    }

    if (serviceConfig.credentials.deny) {
      serviceBuilder.addCredentialAddresses(
        CredentialListTypes.DENY,
        serviceConfig.credentials.deny,
      );
    }
  }

  return serviceBuilder
    .setServiceEndpoint(serviceEndpoint)
    .setTimeout(serviceConfig.timeout)
    .setDatatokenNameAndSymbol(
      serviceConfig.datatoken.name,
      serviceConfig.datatoken.symbol,
    )
    .setPricing(
      getPricing(
        connection,
        serviceConfig.pricing.type,
        serviceConfig.pricing.currency,
        serviceConfig.pricing.amount,
      ),
    )
    .build();
}

export async function publishFromFile(
  filePath: string,
  providerUrl: string,
  connection: Connection,
  dryRun: boolean,
): Promise<string | undefined> {
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
  const owner = config.metadata.owner || connection.wallet.address;

  // Nautilus refuses to publish an asset whose owner differs from the signer.
  // Fail early with an actionable message instead of silently using the
  // connected wallet as the owner.
  if (
    config.metadata.owner &&
    normalizeAddress(config.metadata.owner) !==
      normalizeAddress(connection.wallet.address)
  ) {
    throw new Error(
      `The connected account ${connection.wallet.address} does not match the asset owner ${config.metadata.owner} declared in ${filePath}. ` +
        `Use the owner's private key, or run the publish command recursively (-r) with the manifest that contains the owner's account.`,
    );
  }

  const assetBuilder = new AssetBuilder()
    .setType(config.metadata.type)
    .setName(config.metadata.name)
    .setOwner(owner)
    .setDescription(
      readFileSync(path.resolve(folder, config.metadata.description), "utf8"),
    )
    .setProvidedBy(
      config.metadata.providedBy || config.metadata.author || "AgrospAI",
    )
    .setNftData(config.nftData);

  if (config.metadata.license) {
    assetBuilder.setLicense(config.metadata.license);
  }

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
      config.metadata.additionalInformation as any,
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

      if (Array.isArray(param.options)) {
        for (const { key, value } of param.options) {
          consumerParameter.addOption({ [key]: value });
        }
      }

      consumerParameters.push(consumerParameter.build());
    }

    assetBuilder.setAlgorithm({
      container: {
        ...config.metadata.algorithm.container,
        consumerParameters: undefined,
      },
      language: config.metadata.algorithm.language,
      version: config.metadata.algorithm.version,
      ...(consumerParameters.length > 0 && { consumerParameters }),
    } as any);
  }

  const serviceConfigs = resolveServiceConfigs(config, filePath);

  for (const serviceConfig of serviceConfigs) {
    assetBuilder.addService(
      buildNewService(serviceConfig, config, connection, providerUrl),
    );
  }

  const asset = assetBuilder.build();

  console.log(`\n✅ Asset metadata:\n${JSON.stringify(asset, null, 2)}\n`);

  if (dryRun) {
    console.log("⚠️  Dry run enabled. Asset not published.\n");
    return;
  }

  if (!connection.remoteStore) {
    throw new Error(
      "Publishing requires a remote store. Please set PINATA_JWT or IPFS_UPLOAD_URL in your environment.",
    );
  }

  console.log(`🚀 Publishing asset...`);

  let result: PublishResponse;
  try {
    result = await connection.nautilus.publish(asset, {
      waitForIndexer: true,
    });
  } catch (error) {
    if (error instanceof PublishIncompleteError) {
      console.warn(
        `⚠️  Publishing stopped after NFT ${error.nftAddress} was created. Resuming via completePublish()...`,
      );
      result = await connection.nautilus.completePublish(
        error.nftAddress,
        asset,
        {
          waitForIndexer: true,
          metadataTxHash: error.stored?.txHash,
        },
      );
    } else {
      throw error;
    }
  }

  const txHash =
    (result.setMetadataTxReceipt as any).hash ||
    (result.setMetadataTxReceipt as any).transactionHash;

  console.log(
    [
      "✅ Asset published.",
      `🔗 Transaction: ${connection.networkConfig.explorerUri}/tx/${txHash}`,
      `🌐 Asset: https://portal.agrospai.udl.cat/asset/${result.ddo.id}`,
    ].join("\n"),
  );

  return result.ddo.id as string;
}

/**
 * Replaces the published tag list with the spec's.
 *
 * nautilus only exposes `addTags()` (additive), while `--update` treats the
 * spec as authoritative for every metadata field it sets, so the list is
 * written directly. The DDO builder keeps its metadata in this state and
 * projects it over the published document on `edit()`.
 */
function replaceAssetTags(assetBuilder: AssetBuilder, tags: string[]): void {
  const builder = assetBuilder as unknown as {
    asset: { ddo: { metadata: { tags?: string[] } } };
  };
  builder.asset.ddo.metadata.tags = [...tags];
}

/**
 * Applies an existing spec to an already-published asset, keeping its DID.
 *
 * Services that exist are updated in place: description, tags (replaced), asset
 * credentials, service name/timeout/credentials/consumer parameters and, for
 * compute services, network access and trusted algorithms/publishers. Files,
 * endpoints, pricing and datatoken names are ignored for those — changing any
 * of them would re-encrypt the service (new service id) or mint a new
 * datatoken. Services the asset does not have yet are created from the spec,
 * with their own files, pricing and datatoken.
 */
export async function updateFromFile(
  filePath: string,
  did: string,
  connection: Connection,
  dryRun: boolean,
  updateFiles: string[] = [],
): Promise<string | undefined> {
  const config: PublishConfig = parseConfig(filePath);

  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  if (!validate(config)) {
    console.error("❌ Invalid publish config file:");
    console.error(validate.errors);
    throw new Error(`Publish config validation failed for file ${filePath}`);
  }

  const folder = path.dirname(filePath);
  const owner = config.metadata.owner || connection.wallet.address;

  if (
    config.metadata.owner &&
    normalizeAddress(config.metadata.owner) !==
      normalizeAddress(connection.wallet.address)
  ) {
    throw new Error(
      `The connected account ${connection.wallet.address} does not match the asset owner ${config.metadata.owner} declared in ${filePath}. ` +
        `Use the owner's private key, or run the publish command recursively (-r) with the manifest that contains the owner's account.`,
    );
  }

  if (config.metadata.did && config.metadata.did !== did) {
    throw new Error(
      `The spec targets ${config.metadata.did}, but --update was given ${did}.`,
    );
  }

  const serviceConfigs = resolveServiceConfigs(config, filePath);

  const published: any = await connection.nautilus.getAsset(did);
  if (!published) {
    throw new Error(`Could not resolve asset ${did}.`);
  }

  const publishedServices = getServices(published) as any[];
  const assetBuilder = new AssetBuilder(published);
  assetBuilder.setIssuer(connection.wallet.address);
  assetBuilder.setOwner(owner);
  assetBuilder.setDescription(readConfigDescription(folder, config));

  // The spec is authoritative for tags: replace the published list instead of
  // merging the new tags into it.
  if (config.metadata.tags) {
    replaceAssetTags(assetBuilder, config.metadata.tags);
  }

  if (config.credentials) {
    const current =
      published.credentialSubject?.credentials ?? published.credentials;
    applyCredentialLists(assetBuilder, current, config.credentials);
  }

  const usedServiceIds = new Set<string>();
  const matchedFileSelectors = new Set<string>();
  const plan: string[] = [];

  for (const serviceConfig of serviceConfigs) {
    const publishedService = findPublishedService(
      publishedServices,
      serviceConfig,
      usedServiceIds,
    );

    if (!publishedService) {
      if (serviceConfig.serviceId) {
        throw new Error(
          `Service ${serviceConfig.serviceId} does not exist on ${did}.`,
        );
      }

      // The asset does not have this service yet. Building it with a pricing
      // config makes nautilus mint its datatoken and assign the new service id.
      const built = buildNewService(
        serviceConfig,
        config,
        connection,
        serviceConfig.serviceEndpoint,
      );
      assetBuilder.addService(built);

      for (const selector of updateFiles) {
        if (
          selector === serviceConfig.serviceType ||
          selector === serviceConfig.serviceId
        ) {
          matchedFileSelectors.add(selector);
        }
      }

      plan.push(
        `   • ${serviceConfig.serviceType} → new service (${
          serviceConfig.name || built.name || "unnamed"
        }), ${built.consumerParameters.length} consumer parameter(s), datatoken will be minted`,
      );
      continue;
    }

    usedServiceIds.add(publishedService.id);

    const serviceBuilder = new ServiceBuilder({
      asset: published,
      serviceId: publishedService.id,
    });

    if (serviceConfig.name) serviceBuilder.setName(serviceConfig.name);
    if (serviceConfig.displayName) {
      serviceBuilder.setDisplayName(serviceConfig.displayName);
    }
    serviceBuilder.setTimeout(serviceConfig.timeout);

    // Files are only replaced when explicitly selected: re-encrypting them
    // changes the service id (it is the hash of the encrypted file object),
    // while the DID and the datatoken address stay the same.
    const fileSelectors = updateFiles.filter(
      (selector) =>
        selector === publishedService.id ||
        selector === serviceConfig.serviceType ||
        selector === serviceConfig.serviceId,
    );
    if (fileSelectors.length > 0) {
      for (const fileObj of buildServiceFiles(serviceConfig)) {
        serviceBuilder.addFile(fileObj);
      }
      for (const selector of fileSelectors) matchedFileSelectors.add(selector);
    }

    if (serviceConfig.serviceType === "compute") {
      applyComputeSettings(
        serviceBuilder,
        serviceConfig,
        config,
        connection,
        publishedService,
      );
    }

    const built = serviceBuilder.build();
    if (serviceConfig.credentials) {
      built.credentials = replaceServiceCredentialLists(
        built.credentials,
        serviceConfig.credentials,
      );
    }
    // The spec is authoritative for consumer parameters, so replace the list
    // instead of appending to it.
    if (serviceConfig.consumerParameters) {
      built.consumerParameters = buildConsumerParameters(
        serviceConfig.consumerParameters,
      );
    }

    assetBuilder.addService(built);
    plan.push(
      `   • ${serviceConfig.serviceType} → ${publishedService.id} (${
        serviceConfig.name || publishedService.name || "unnamed"
      }), ${built.consumerParameters.length} consumer parameter(s)${
        fileSelectors.length > 0
          ? ", files replaced (service id will change)"
          : ""
      }`,
    );
  }

  const unmatchedFileSelectors = updateFiles.filter(
    (selector) => !matchedFileSelectors.has(selector),
  );
  if (unmatchedFileSelectors.length > 0) {
    throw new Error(
      `--update-files did not match any service on ${did}: ${unmatchedFileSelectors.join(
        ", ",
      )}. Use a service type (${publishedServices
        .map((service) => service.type)
        .join(", ")}) or a service id.`,
    );
  }

  const asset = assetBuilder.build();

  console.log(`✅ Update plan for ${did}:`);
  console.log(plan.join("\n"));
  console.log(
    `   • description: "${config.metadata.description}" (${readConfigDescription(folder, config).length} chars)`,
  );
  if (config.metadata.tags) {
    console.log(
      `   • tags (replaced): ${config.metadata.tags.join(", ") || "(none)"}`,
    );
  }

  if (dryRun) {
    console.log(
      `\n⚠️  Dry run enabled. Asset not updated. DID stays ${did}.\n`,
    );
    return did;
  }

  if (!connection.remoteStore) {
    throw new Error(
      "Updating requires a remote store. Please set PINATA_JWT or IPFS_UPLOAD_URL in your environment.",
    );
  }

  console.log(`🚀 Updating asset ${did}...`);

  const result = await connection.nautilus.edit(asset, {
    waitForIndexer: true,
  });

  const txHash =
    (result.setMetadataTxReceipt as any).hash ||
    (result.setMetadataTxReceipt as any).transactionHash;

  console.log(
    [
      "✅ Asset updated (DID unchanged).",
      `🔗 Transaction: ${connection.networkConfig.explorerUri}/tx/${txHash}`,
      `🌐 Asset: https://portal.agrospai.udl.cat/asset/${result.ddo.id}`,
    ].join("\n"),
  );

  return result.ddo.id as string;
}
