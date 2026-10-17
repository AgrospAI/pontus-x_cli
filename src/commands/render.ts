import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getDatatokens,
  getMetadata,
  getNft,
  getOwner,
  getServices,
} from "@deltadao/nautilus";
import { Args, Command, Flags } from "@oclif/core";
import { stringify } from "yaml";

import { searchAssets } from "@/lib/aquarius";
import { Connection } from "@/utils/connection";

function getSpecFromAsset(asset: any): [any, string] {
  const metadata = (getMetadata(asset) as any) || asset?.metadata;
  const services = (getServices(asset) as any[]) || asset?.services || [];
  const owner =
    getOwner(asset) ||
    asset?.nft?.owner ||
    asset?.event?.from ||
    "0x0000000000000000000000000000000000000000";
  const nft = (getNft(asset) as any) || asset?.nft;
  const datatokens = (getDatatokens(asset) as any[]) || asset?.datatokens || [];

  const firstService = services[0] || {};
  const firstDatatoken = datatokens[0] || {};

  const priceValue = asset?.stats?.price?.value ?? 0;
  const tokenSymbol = asset?.stats?.price?.tokenSymbol ?? "OCEAN";

  const priceSpec =
    priceValue > 0
      ? {
          amount: priceValue,
          currency: tokenSymbol,
          type: "fixed",
        }
      : { type: "free" };

  const rawDescription = metadata?.description;
  const descriptionStr =
    typeof rawDescription === "string"
      ? rawDescription
      : rawDescription?.text || JSON.stringify(rawDescription || "");

  const rawLicense = metadata?.license;
  const licenseStr =
    typeof rawLicense === "string" ? rawLicense : rawLicense?.name || "";

  return [
    {
      metadata: {
        author: metadata?.author,
        description: "description.md",
        license: licenseStr,
        links: metadata?.links,
        name: metadata?.name,
        owner,
        providedBy: metadata?.providedBy,
        tags: metadata?.tags,
        type: metadata?.type,
      },
      nftData: {
        name: nft?.name,
        symbol: nft?.symbol,
        templateIndex: 1, // default - could be enhanced
        tokenURI: nft?.tokenURI,
        transferable: false, // default - could be enhanced
      },
      service: {
        datatoken: {
          name: firstDatatoken?.name,
          symbol: firstDatatoken?.symbol,
        },
        files: [
          {
            method: "GET",
            type: "url",
            url: "",
          },
        ], // ⚠️ Cannot recover - encrypted in blockchain
        fileType: "url", // default - infer if possible
        pricing: priceSpec,
        serviceEndpoint: firstService?.serviceEndpoint,
        serviceType: firstService?.type,
        timeout: firstService?.timeout,
      },
    },
    descriptionStr,
  ];
}

async function getAssets(did?: string, tags?: string[]): Promise<any[]> {
  const connection = await Connection.connect();

  if (did) {
    return [await connection.nautilus.getAsset(did)];
  }

  if (!tags) return [];

  const chainIds = [connection.networkConfig.chainId];
  const { metadataCacheUri } = connection.networkConfig;
  const datasets = await searchAssets({
    tagSets: [tags],
    chainIds,
    metadataCacheUri,
  });

  const assets = await Promise.all(
    datasets.map((dataset) => connection.nautilus.getAsset(dataset.did)),
  );
  return assets;
}

export default class Render extends Command {
  static args = {
    did: Args.string({ description: "Dataset DID", required: false }),
  };
  static flags = {
    dst: Flags.string({
      char: "d",
      default: "rendered",
      description: "Destination folder to save the rendered specs",
      required: false,
    }),
    tags: Flags.string({
      char: "t",
      description:
        "Tags to filter datasets (they must have all the provided tags)",
      multiple: true,
      required: false,
    }),
    onlyAccess: Flags.boolean({
      char: "a",
      description: "Only render datasets with an access service",
      default: false,
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Render);
    const { did } = args;
    const { tags, onlyAccess } = flags;

    const assets = await getAssets(did, tags);

    for (const asset of assets) {
      const [spec, description] = getSpecFromAsset(asset);

      if (onlyAccess && spec.service.serviceType !== "access") {
        continue;
      }

      const owner = spec.metadata.owner.slice(2);

      const ownerFolder = path.join(process.cwd(), flags.dst, owner);
      const datasetFolder = path.join(ownerFolder, spec.metadata.name);
      mkdirSync(datasetFolder, { recursive: true });

      // Save spec.yaml
      const yamlStr = stringify(spec);
      const outputPath = path.join(datasetFolder, `spec.yaml`);
      writeFileSync(outputPath, yamlStr);

      // Save description.md
      const descriptionPath = path.join(datasetFolder, `description.md`);
      writeFileSync(descriptionPath, description);

      console.log(`Spec saved to ${datasetFolder}`);
    }
  }
}
