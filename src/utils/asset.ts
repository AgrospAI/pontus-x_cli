import { checkbox, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { type AssetInfo, getOwnerName, searchAssets } from "@/lib/aquarius";

type Choice<Value> = {
  value: Value;
  name?: string;
  checkedName?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  checked?: boolean;
  type?: never;
};

const defaultChainIds = [
  { name: "PONTUSXDEV", value: 32_456 },
  { name: "PONTUSXTEST", value: 32_457 },
] as Choice<number>[];

const defaultAssetTypes = [
  { name: "Dataset", value: "dataset" },
  { name: "Algorithm", value: "algorithm" },
] as Choice<string>[];

const defaultAccessTypes = [
  { name: "Download", value: "access" },
  { name: "Compute", value: "compute" },
] as Choice<string>[];

interface PromptProps {
  chainIds?: number[];
  assetTypes?: string[];
  accessTypes?: string[];
  owners?: string[];
  tagSets?: string[][];

  networkChoices?: Choice<number>[];
  assetTypeChoices?: Choice<string>[];
  accessTypeChoices?: Choice<string>[];
  ownerChoices?: Choice<string>[];

  promptType?: "checkbox" | "select";
}

export async function PromptForAssets({
  chainIds,
  assetTypes,
  accessTypes,
  owners,
  tagSets,
  networkChoices = defaultChainIds,
  assetTypeChoices = defaultAssetTypes,
  accessTypeChoices = defaultAccessTypes,
  ownerChoices = [],
  promptType = "checkbox",
}: PromptProps = {}): Promise<AssetInfo[]> {
  const selectedChainIds =
    chainIds ||
    (await checkbox({
      message: "Select networks:",
      choices: networkChoices,
    }));

  const selectedAssetTypes =
    assetTypes ||
    (await checkbox({
      message: "Select asset types:",
      choices: assetTypeChoices,
    }));

  const selectedAccessTypes =
    accessTypes ||
    (await checkbox({
      message: "Select access types:",
      choices: accessTypeChoices,
    }));

  const selectedOwners =
    owners || ownerChoices.length > 0
      ? await checkbox({
          message: "Select owners:",
          choices: ownerChoices,
        })
      : undefined;

  const selectedTagSets =
    tagSets ||
    (await (async () => {
      const tagSets = [];
      while (true) {
        const tagSet = await input({
          message:
            "Enter a tag set (comma-separated), or leave blank to finish:",
        });
        if (!tagSet) {
          break;
        }
        tagSets.push(tagSet.split(",").map((tag) => tag.trim()));
      }
      return tagSets;
    })());

  const assets = await searchAssets({
    chainIds: selectedChainIds,
    assetTypes: selectedAssetTypes,
    accessTypes: selectedAccessTypes,
    tagSets: selectedTagSets,
    owners: selectedOwners,
  });

  const sortedAssets = assets.sort((a, b) =>
    b.created.localeCompare(a.created),
  );

  const assetChoices = [];
  for (const [index, asset] of sortedAssets.entries()) {
    const ownerName = await getOwnerName(asset.owner);

    assetChoices.push({
      name: `${(index + 1).toString().padStart(2, "0")}. ${chalk.blue(asset.did)} | ${chalk.green(asset.created.split("T")[0])} | ${chalk.yellow(
        ownerName,
      )} | ${chalk.magenta(asset.name)}`,
      value: asset,
    });
  }

  if (assetChoices.length === 0) {
    console.log(chalk.red("No assets found matching the criteria."));
    return [];
  }

  if (promptType === "checkbox") {
    return await checkbox({
      message: "Select assets to edit:",
      choices: assetChoices,
      loop: false,
      pageSize: 10,
      theme: {
        style: {
          answer: (text: string) => `\n ${text.split(",").join("\n")}\n`,
        },
      },
    });
  }

  if (promptType === "select") {
    return [
      await select({
        message: "Select an asset to edit:",
        choices: assetChoices,
        loop: false,
        pageSize: 10,
        theme: {
          style: {
            answer: (text: string) => `\n ${text}\n`,
          },
        },
      }),
    ];
  }

  return [];
}
