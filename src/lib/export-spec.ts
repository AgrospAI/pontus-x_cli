import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decrypt } from "eciesjs";
import { stringify } from "yaml";

import { DEFAULT_OCEAN_NODE_URI, NETWORK_CONFIGS, Network } from "@/config";
import type PublishConfig from "@/types/publish";

/**
 * Metadata services used as a last resort when neither `--node` nor the
 * environment (`AQUARIUS_URL`, `OCEAN_NODE_URI`, `NETWORK`) points to one.
 */
const FALLBACK_METADATA_SERVICES: Record<DidFormat, string[]> = {
  legacy: [
    "https://aquarius.agrospai.udl.cat",
    "https://aquarius.pontus-x.eu",
    "https://ocean-node.agrospai.udl.cat",
  ],
  "new-stack": [
    "https://ocean-node.agrospai.udl.cat",
    "https://aquarius.agrospai.udl.cat",
    "https://aquarius.pontus-x.eu",
  ],
};

// Chain id -> CLI `metadata.network` name.
const NETWORK_BY_CHAIN: Record<number, string> = {
  32456: Network.PONTUSXDEV,
  32457: Network.PONTUSXTEST,
  11155111: "SEPOLIA",
  11155420: Network.OP_SEPOLIA,
};

const CURRENCIES = new Set(["EURAU", "EUROe", "OCEAN", "devEURAU"]);

export type DidFormat = "legacy" | "new-stack";

export function didFormat(did: string): DidFormat {
  return did.startsWith("did:ope:") ? "new-stack" : "legacy";
}

export function isSupportedDid(did: string): boolean {
  return /^did:o(pe|p):[0-9a-fA-F]{64}$/.test(did);
}

/** Asset name -> folder name (lowercase, ASCII kebab-case). */
export function slugify(name: unknown): string {
  const slug =
    String(name || "unnamed")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100)
      .replace(/-+$/g, "") || "unnamed";

  return slug;
}

function trimBase(value?: string): string {
  return (value || "").trim().replace(/\/+$/, "");
}

/**
 * Metadata service base URLs to try, most appropriate first for the DID format.
 * Each one is queried as `<base>/api/aquarius/assets/ddo/<did>`.
 */
function candidateMetadataServices(did: string, nodeUri?: string): string[] {
  if (nodeUri) return [trimBase(nodeUri)];

  const services: string[] = [];
  const add = (value?: string) => {
    const base = trimBase(value);
    if (base && !services.includes(base)) services.push(base);
  };

  const envNetwork = (process.env.NETWORK || "").toUpperCase();
  const networkConfig =
    envNetwork in Network ? NETWORK_CONFIGS[envNetwork as Network] : undefined;

  const oceanNode =
    process.env.OCEAN_NODE_URI ||
    networkConfig?.oceanNodeUri ||
    DEFAULT_OCEAN_NODE_URI;
  const aquarius = process.env.AQUARIUS_URL || networkConfig?.metadataCacheUri;
  const format = didFormat(did);

  // Prefer the service family that matches the DID format, then the fallbacks.
  const preferred = format === "new-stack" ? [oceanNode, aquarius] : [aquarius];
  for (const service of preferred) add(service);
  for (const fallback of FALLBACK_METADATA_SERVICES[format]) add(fallback);

  // Make sure both configured endpoints are tried even if they were not the
  // preferred family for this DID format.
  add(oceanNode);
  add(aquarius);

  return services;
}

export type ResolvedDdo = {
  ddo: any;
  source: string;
  url: string;
  format: DidFormat;
};

/**
 * Resolves a DDO from the metadata service. Works without a wallet, so it can
 * be used from anywhere once the CLI is installed globally.
 */
export async function resolveDdo(
  did: string,
  nodeUri?: string,
): Promise<ResolvedDdo> {
  const services = candidateMetadataServices(did, nodeUri);
  const errors: string[] = [];

  for (const service of services) {
    const url = `${service}/api/aquarius/assets/ddo/${encodeURIComponent(did)}`;
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        errors.push(`${url} -> HTTP ${response.status}`);
        continue;
      }
      const ddo = await response.json();
      if (!ddo || (ddo.error && !ddo.credentialSubject && !ddo.services)) {
        errors.push(`${url} -> ${ddo?.error || "unexpected payload"}`);
        continue;
      }
      return { ddo, source: service, url, format: didFormat(did) };
    } catch (error: any) {
      errors.push(`${url} -> ${error?.message || error}`);
    }
  }

  throw new Error(
    `Could not resolve ${did}.\n  Tried:\n    ${
      errors.join("\n    ") || "(no metadata service configured)"
    }`,
  );
}

// ---- New data space stack (Verifiable Credential) -> legacy DDO -----------

export function isVcDdo(raw: any): boolean {
  return !!(
    raw &&
    typeof raw === "object" &&
    raw.credentialSubject &&
    typeof raw.credentialSubject === "object"
  );
}

function localizedText(value: any): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if (typeof value["@value"] === "string") return value["@value"];
    if (typeof value.value === "string") return value.value;
  }
  return "";
}

function licenseString(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.name === "string") return value.name;
    if (typeof value.url === "string") return value.url;
    if (typeof value["@id"] === "string") return value["@id"];
  }
  return undefined;
}

function nonEmptyObject(value: any): Record<string, any> | undefined {
  return value && typeof value === "object" && Object.keys(value).length
    ? value
    : undefined;
}

// Credential lists differ between stacks: legacy uses { values: ["0x.."] },
// the new stack uses { values: [{ address: "0x.." }] }.
function flattenCredentialValues(list: any): string[] {
  const out: string[] = [];
  for (const entry of Array.isArray(list) ? list : []) {
    if (typeof entry === "string") {
      out.push(entry);
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    if (Array.isArray(entry.values)) {
      for (const value of entry.values) {
        if (typeof value === "string") out.push(value);
        else if (value && typeof value === "object") {
          if (typeof value.address === "string") out.push(value.address);
          else
            for (const nested of Object.values(value)) {
              if (typeof nested === "string") out.push(nested);
            }
        }
      }
    } else if (typeof entry.value === "string") out.push(entry.value);
    else if (typeof entry.address === "string") out.push(entry.address);
  }
  return [...new Set(out)];
}

export function normalizeVcDdo(raw: any): any {
  const cs = raw.credentialSubject;
  const md = cs.metadata || {};
  const indexed = raw.indexedMetadata || {};
  const nft = indexed.nft || {};
  const services = Array.isArray(cs.services) ? cs.services : [];
  const datatokens = Array.isArray(cs.datatokens) ? cs.datatokens : [];
  const service = services[0] || {};

  const stats = Array.isArray(indexed.stats) ? indexed.stats : [];
  const stat =
    stats.find(
      (entry: any) => entry.datatokenAddress === service.datatokenAddress,
    ) ||
    stats[0] ||
    {};
  const price = (Array.isArray(stat.prices) && stat.prices[0]) || {};

  return {
    id: raw.id || cs.id,
    chainId: cs.chainId,
    metadata: {
      type: md.type,
      name: md.name,
      author: md.author,
      providedBy: md.providedBy,
      tags: md.tags,
      license: licenseString(md.license),
      description: localizedText(md.description),
      links: nonEmptyObject(md.links),
      additionalInformation: nonEmptyObject(md.additionalInformation),
      algorithm: md.algorithm,
    },
    nft: {
      name: nft.name,
      symbol: nft.symbol,
      tokenURI: nft.tokenURI,
      owner: nft.owner,
    },
    datatokens,
    // Map indexed on-chain pricing onto the legacy `stats.price` shape.
    stats: {
      price: {
        value: Number(price.price ?? price.value ?? 0) || 0,
        tokenSymbol: price.tokenSymbol || stat.symbol,
      },
    },
    credentials: {
      allow: flattenCredentialValues(cs.credentials && cs.credentials.allow),
      deny: flattenCredentialValues(cs.credentials && cs.credentials.deny),
    },
    services: services.map((entry: any) => ({
      ...entry,
      // The new stack does not expose this flag; assume the legacy default.
      compute:
        entry.compute ||
        (entry.type === "compute" ? { allowNetworkAccess: false } : undefined),
    })),
  };
}

// ---- File decryption ------------------------------------------------------

function isEncryptedFiles(value: any): boolean {
  return typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value.trim());
}

/**
 * `service.files` is ECIES-encrypted by the provider / Ocean Node. Decrypt it
 * with the node private key so the exported spec carries the clear URL(s).
 *
 * Without a node private key the ciphertext is returned untouched, so the
 * export still succeeds and keeps the encrypted file payload.
 */
export function decodeFiles(
  filesField: any,
  nodePrivateKey?: string,
): any | null {
  if (filesField === null || filesField === undefined) return null;
  if (typeof filesField === "object") return filesField;

  const value = String(filesField).trim();
  if (isEncryptedFiles(value)) {
    // No key: export the asset file exactly as published, still encrypted.
    if (!nodePrivateKey) return value;

    let plain: string;
    try {
      plain = Buffer.from(
        decrypt(nodePrivateKey, Buffer.from(value.slice(2), "hex")),
      ).toString("utf8");
    } catch (error: any) {
      throw new Error(
        `Could not decrypt the asset's files with NODE_PRIVATE_KEY (${
          error?.message || error
        }). The asset may belong to a different provider.`,
      );
    }

    return JSON.parse(plain);
  }

  try {
    return JSON.parse(value);
  } catch {
    return filesField;
  }
}

// ---- DDO -> publish spec mapping ------------------------------------------

// The DDO stores consumer-parameter `options` as an array of single-key objects,
// e.g. [{"geojson":"GeoJSON"},{"json":"JSON"}]. Some DDOs carry the same array
// JSON-encoded inside a string, so decode it before mapping.
// The CLI schema expects [{ "key": "...", "value": "..." }].
function parseOptions(options: any): any {
  if (typeof options !== "string") return options;
  const trimmed = options.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function mapOptions(
  options: any,
): { key: string; value: string }[] | undefined {
  const raw = parseOptions(options);
  if (raw === undefined || raw === null) return undefined;
  const out: { key: string; value: string }[] = [];

  const addOption = (entry: any) => {
    if (entry === undefined || entry === null) return;
    if (typeof entry !== "object") {
      out.push({ key: String(entry), value: String(entry) });
      return;
    }
    if (Array.isArray(entry)) {
      if (entry.length >= 2)
        out.push({ key: String(entry[0]), value: String(entry[1]) });
      else if (entry.length === 1)
        out.push({ key: String(entry[0]), value: String(entry[0]) });
      return;
    }
    if ("key" in entry && "value" in entry) {
      out.push({ key: String(entry.key), value: String(entry.value) });
      return;
    }
    for (const [key, value] of Object.entries(entry)) {
      out.push({ key, value: String(value) });
    }
  };

  if (Array.isArray(raw)) raw.forEach(addOption);
  else if (typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      out.push({ key, value: String(value) });
    }
  }

  return out.length ? out : undefined;
}

function mapConsumerParameters(cps: any): any[] | undefined {
  if (!Array.isArray(cps)) return undefined;
  return cps.map((cp) => {
    const out: any = {
      name: cp.name,
      type: cp.type,
      label: cp.label,
      required: cp.required,
      description: cp.description,
      default:
        typeof cp.default === "object"
          ? JSON.stringify(cp.default)
          : cp.default,
    };
    if (cp.options !== undefined) {
      const options = mapOptions(cp.options);
      if (options) out.options = options;
    }
    return out;
  });
}

function flattenCredentialList(list: any): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const entry of list) {
    if (typeof entry === "string") out.push(entry);
    else if (entry && Array.isArray(entry.values)) out.push(...entry.values);
    else if (entry && entry.value) out.push(entry.value);
  }
  return out;
}

function mapPricing(ddo: any): PublishConfig["service"]["pricing"] {
  const price = ddo.stats?.price || {};
  const value = Number(price.value || 0);
  if (value > 0) {
    const currency = CURRENCIES.has(price.tokenSymbol)
      ? price.tokenSymbol
      : "OCEAN";
    return { type: "fixed", amount: value, currency };
  }
  return { type: "free" };
}

function extractFiles(service: any): any[] {
  const files = service?.files;
  if (Array.isArray(files)) return files;
  if (files && typeof files === "object" && Array.isArray(files.files)) {
    return files.files;
  }
  return [];
}

function mapServiceFiles(service: any): {
  files: any;
  fileType: PublishConfig["service"]["fileType"];
} {
  // Without NODE_PRIVATE_KEY the payload is still the DDO's ciphertext. Keep it
  // verbatim instead of turning it into an empty (and silently wrong) list.
  if (isEncryptedFiles(service?.files)) {
    return {
      files: String(service.files).trim(),
      fileType: "url" as PublishConfig["service"]["fileType"],
    };
  }

  const raw = extractFiles(service);
  const files = raw.map((file) => {
    const out = { ...file };
    if (!out.method) out.method = "GET";
    if (!out.type) out.type = "url";
    delete out.index; // not part of the CLI UrlFileObject schema
    return out;
  });

  let fileType = files[0]?.type || "url";
  if (
    !["url", "ipfs", "arweave", "s3", "ftp", "nodePersistentStorage"].includes(
      fileType,
    )
  ) {
    fileType = "url";
  }

  return {
    files,
    fileType: fileType as PublishConfig["service"]["fileType"],
  };
}

function mapAlgorithm(algorithm: any): any {
  if (!algorithm) return undefined;
  const out: any = {};
  if (algorithm.container) out.container = algorithm.container;
  if (algorithm.language) out.language = algorithm.language;
  if (algorithm.version) out.version = algorithm.version;
  if (
    Array.isArray(algorithm.consumerParameters) &&
    algorithm.consumerParameters.length
  ) {
    out.consumerParameters = mapConsumerParameters(
      algorithm.consumerParameters,
    );
  }
  return out;
}

/**
 * Maps a legacy-shaped DDO to the CLI publish spec. New-stack assets must be
 * normalised first with {@link normalizeVcDdo}.
 */
export function ddoToSpec(ddo: any): {
  spec: PublishConfig;
  description: string;
} {
  const md = ddo.metadata || {};
  const nft = ddo.nft || {};
  const service = (ddo.services || [])[0] || {};
  const serviceDtAddress = service.datatokenAddress;
  const dt =
    (ddo.datatokens || []).find((d: any) => d.address === serviceDtAddress) ||
    (ddo.datatokens || [])[0] ||
    {};
  const compute = service.compute || {};

  const { files, fileType } = mapServiceFiles(service);
  const network = NETWORK_BY_CHAIN[ddo.chainId];

  const metadata: any = {
    type: md.type,
    name: md.name,
  };
  if (md.author) metadata.author = md.author;
  metadata.description = "description.md";
  if (Array.isArray(md.tags) && md.tags.length) metadata.tags = md.tags;
  if (md.license) metadata.license = md.license;
  if (md.links) metadata.links = md.links;
  if (md.additionalInformation)
    metadata.additionalInformation = md.additionalInformation;
  if (md.providedBy) metadata.providedBy = md.providedBy;
  if (ddo.id) metadata.did = ddo.id;
  if (nft.owner) metadata.owner = nft.owner;
  if (network) metadata.network = network;

  if (md.type === "algorithm") {
    const algorithm = mapAlgorithm(md.algorithm);
    if (algorithm) metadata.algorithm = algorithm;
  }

  const spec: any = {
    metadata,
    nftData: {
      name: nft.name,
      symbol: nft.symbol,
      templateIndex: 1,
      tokenURI: nft.tokenURI,
      transferable: false,
    },
    service: {
      serviceType: service.type,
      fileType,
      serviceEndpoint: service.serviceEndpoint,
      timeout: service.timeout,
      files,
      pricing: mapPricing(ddo),
      datatoken: { name: dt.name, symbol: dt.symbol },
    },
  };

  if (
    Array.isArray(service.consumerParameters) &&
    service.consumerParameters.length
  ) {
    const cps = mapConsumerParameters(service.consumerParameters);
    if (cps) spec.service.consumerParameters = cps;
  }

  if (ddo.credentials && typeof ddo.credentials === "object") {
    const allow = flattenCredentialList(ddo.credentials.allow);
    const deny = flattenCredentialList(ddo.credentials.deny);
    if (allow.length || deny.length) {
      spec.credentials = {
        ...(allow.length ? { allow } : {}),
        ...(deny.length ? { deny } : {}),
      };
    }
  }

  if (service.type === "compute") {
    if (typeof compute.allowNetworkAccess === "boolean") {
      spec.allowAlgorithmNetworkAccess = compute.allowNetworkAccess;
    }
    if (
      Array.isArray(compute.publisherTrustedAlgorithmPublishers) &&
      compute.publisherTrustedAlgorithmPublishers.length
    ) {
      spec.trustedAlgorithmPublishers =
        compute.publisherTrustedAlgorithmPublishers;
    }
    if (
      Array.isArray(compute.publisherTrustedAlgorithms) &&
      compute.publisherTrustedAlgorithms.length
    ) {
      spec.trustedAlgorithms = compute.publisherTrustedAlgorithms.map(
        (entry: any) => ({
          did: entry.did,
          ...(entry.serviceId ? { serviceIds: [entry.serviceId] } : {}),
        }),
      );
    }
    // trustOwnerAlgorithms is not stored explicitly in the DDO; infer it when
    // the owner itself is listed among the trusted algorithm publishers.
    if (
      nft.owner &&
      Array.isArray(compute.publisherTrustedAlgorithmPublishers) &&
      compute.publisherTrustedAlgorithmPublishers.includes(nft.owner)
    ) {
      spec.trustOwnerAlgorithms = true;
      spec.trustedAlgorithmPublishers =
        compute.publisherTrustedAlgorithmPublishers.filter(
          (address: string) => address !== nft.owner,
        );
    }
  }

  return { spec: spec as PublishConfig, description: md.description || "" };
}

// ---- Export ---------------------------------------------------------------

export type ExportSpecOptions = {
  /** Parent folder where the asset folder (named after the asset) is created. */
  outDir: string;
  /** Metadata service base URL override (`--node`). */
  nodeUri?: string;
  /** Node/provider private key used to decrypt `service.files`. */
  nodePrivateKey?: string;
};

export type ExportSpecResult = {
  did: string;
  folder: string;
  overwritten: boolean;
  source: string;
  format: DidFormat;
  spec: PublishConfig;
};

/**
 * Downloads an asset's DDO and writes `<outDir>/<asset-name>/spec.yaml` plus
 * `description.md`. An existing folder with the same name is replaced.
 *
 * When `service.files` is encrypted and no node private key is available, the
 * ciphertext is written verbatim so the metadata export still succeeds.
 */
export async function exportAssetSpec(
  did: string,
  options: ExportSpecOptions,
): Promise<ExportSpecResult> {
  const resolved = await resolveDdo(did, options.nodeUri);
  const ddo = isVcDdo(resolved.ddo)
    ? normalizeVcDdo(resolved.ddo)
    : resolved.ddo;

  const nodePrivateKey = options.nodePrivateKey ?? process.env.NODE_PRIVATE_KEY;
  for (const service of ddo.services || []) {
    const decoded = decodeFiles(service.files, nodePrivateKey);
    if (decoded !== null) service.files = decoded;
  }

  const { spec, description } = ddoToSpec(ddo);

  // Always link the spec back to the DID that was requested.
  spec.metadata.did = did;

  const folderName = slugify(spec.metadata.name);
  const targetDir = path.join(options.outDir, folderName);
  const resolvedOut = path.resolve(options.outDir);
  const resolvedTarget = path.resolve(targetDir);

  if (
    resolvedTarget !== resolvedOut &&
    !resolvedTarget.startsWith(resolvedOut + path.sep)
  ) {
    throw new Error(
      `Refusing to write outside the output folder: ${targetDir}`,
    );
  }

  const overwritten = existsSync(targetDir);
  if (overwritten) rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  // Curated specs end with exactly one newline (yaml.stringify adds one).
  writeFileSync(
    path.join(targetDir, "spec.yaml"),
    `${stringify(spec).replace(/\n+$/, "")}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(targetDir, "description.md"),
    `${String(description).trimEnd()}\n`,
    "utf8",
  );

  return {
    did,
    folder: targetDir,
    overwritten,
    source: resolved.source,
    format: resolved.format,
    spec,
  };
}
