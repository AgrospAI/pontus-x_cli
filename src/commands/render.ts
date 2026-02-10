import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Args, Command, Flags } from "@oclif/core";
import { stringify } from "yaml";

import { GetDatasetsByTags } from "@/lib/aquarius";
import { Connection } from "@/utils/connection";

function getSpecFromAsset(asset: any): [any, string] {
  let priceSpec = {};
  priceSpec =
    asset.stats.price.value > 0
      ? {
          amount: asset.stats.price.value,
          currency: asset.stats.price.tokenSymbol,
          type: "fixed",
        }
      : { type: "free" };

  return [
    {
      metadata: {
        author: asset.metadata.author,
        description: "description.md",
        license: asset.metadata.license,
        links: asset.metadata.links,
        name: asset.metadata.name,
        owner: asset.event.from,
        tags: asset.metadata.tags,
        type: asset.metadata.type,
      },
      nftData: {
        name: asset.nft.name,
        symbol: asset.nft.symbol,
        templateIndex: 1, // default - could be enhanced
        tokenURI: asset.nft.tokenURI,
        transferable: false, // default - could be enhanced
      },
      service: {
        datatoken: {
          name: asset.datatokens[0].name,
          symbol: asset.datatokens[0].symbol,
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
        serviceEndpoint: asset.services[0].serviceEndpoint,
        serviceType: asset.services[0].type,
        timeout: asset.services[0].timeout,
      },
    },
    asset.metadata.description,
  ];
}

async function getAssets(did?: string, tags?: string[]): Promise<any[]> {
  const connection = await Connection.connect();

  if (did) {
    return [await connection.nautilus.getAquariusAsset(did)];
  }

  if (!tags) return [];

  const chainIds = [connection.networkConfig.chainId];
  const { metadataCacheUri } = connection.networkConfig;
  const datasets = await GetDatasetsByTags(tags, chainIds, metadataCacheUri);

  const assets = await Promise.all(
    datasets.map((dataset) =>
      connection.nautilus.getAquariusAsset(dataset.did),
    ),
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
