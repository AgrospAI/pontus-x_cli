import {
  AssetBuilder,
  CredentialListTypes,
  getServices,
  ServiceBuilder,
} from "@deltadao/nautilus";
import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import readlineSync from "readline-sync";
import { NETWORK_CONFIGS, type Network } from "@/config";
import {
  type AssetInfo,
  getAssetsFromDids,
  getOwnerName,
} from "@/lib/aquarius";
import { PromptForAssets } from "@/utils/asset";
import { Connection } from "@/utils/connection";
import {
  askForNetwork,
  getEnvNetwork,
  getLoginInfos,
  getPrivateKeyForOwner,
  type LoginInfo,
  printLoginInfos,
} from "@/utils/login";

export default class EditAssetAllowed extends Command {
  static description = "Overwrite the list of allowed users for assets";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> -u 0xAbc123... 0xDef456... -d <assetDid1> <assetDid2>",
    "<%= config.bin %> <%= command.id %> -u 0xAbc123... --public",
  ];
  static flags = {
    users: Flags.string({
      char: "u",
      description: "Ethereum addresses of users to allow (0x...)",
      multiple: true,
      required: false,
    }),
    datasets: Flags.string({
      char: "d",
      description: "Asset DIDs to edit (did:op:...)",
      multiple: true,
    }),
    yes: Flags.boolean({
      char: "y",
      description: "Skip confirmation prompt",
    }),
    manifest: Flags.string({
      char: "m",
      description:
        "Path to manifest file with the accounts to use for authentication",
    }),
    public: Flags.boolean({
      char: "p",
      description: "Make assets public (remove all address restrictions)",
    }),
    network: Flags.string({
      char: "n",
      description: "Network to use (env: NETWORK)",
      options: Object.keys(NETWORK_CONFIGS),
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(EditAssetAllowed);

    // Validation
    if (flags.public && flags.users?.length) {
      this.error(
        "You cannot specify user addresses and set the asset as public at the same time.",
      );
    }
    if (!flags.public && !flags.users?.length) {
      this.error(
        "You must either specify user addresses with -u or use --public to remove all restrictions.",
      );
    }

    // Network selection
    const network =
      (flags.network as Network) || getEnvNetwork() || (await askForNetwork());
    console.log(`${chalk.green("Using network:")} ${network}\n`);
    const chainId = NETWORK_CONFIGS[network].chainId;

    // Authentication selection
    const loginInfos = await getLoginInfos(flags.manifest);
    printLoginInfos(loginInfos);

    // Asset selection
    const assets: AssetInfo[] = flags.datasets
      ? await getAssetsFromDids(flags.datasets)
      : await askForAssets(loginInfos, chainId);

    console.log("\nThe following assets will be edited:");
    for (const asset of assets) {
      const ownerName = await getOwnerName(asset.owner);
      console.log(
        `${chalk.blue(asset.did)} | ${chalk.green(asset.created.split("T")[0])} | ${chalk.yellow(ownerName)} | ${chalk.magenta(asset.name)}`,
      );
    }

    // Summary of what will change
    if (flags.public) {
      console.log(
        "\nAssets will be set as public (all address restrictions removed).",
      );
    } else if (flags.users?.length) {
      console.log("\nThe following addresses will be set as allowed users:");
      for (const address of flags.users) {
        console.log(`  ${chalk.cyan(address)}`);
      }
    } else {
      console.log(
        "\nNo users specified — assets will be set to deny all (empty allow list).",
      );
    }

    // Confirmation prompt
    if (
      !flags.yes &&
      !readlineSync.keyInYNStrict(
        "\nDo you want to proceed with editing the allowed users for the selected assets?",
      )
    ) {
      console.log("Operation cancelled by the user.");
      return;
    }

    // Edit each asset
    for (const asset of assets) {
      console.log(
        `Editing allowed users for asset ${chalk.gray(asset.did)} (${chalk.magenta(asset.name)})...`,
      );
      try {
        const envOverrides = {
          NETWORK: network,
          PRIVATE_KEY: getPrivateKeyForOwner(loginInfos, asset.owner),
        };
        const connection = await Connection.connect(envOverrides);
        if (!connection.remoteStore) {
          throw new Error(
            "Editing requires a remote store. Please set PINATA_JWT or IPFS_UPLOAD_URL in your environment.",
          );
        }

        const published = await connection.nautilus.getAsset(asset.did);
        const assetBuilder = new AssetBuilder(published);
        assetBuilder.setIssuer(connection.wallet.address);

        if (flags.public) {
          [CredentialListTypes.ALLOW, CredentialListTypes.DENY].forEach(
            (type) => {
              // Delete current allowed addresses
              const rawExisting =
                (published as any).credentials?.[type]?.find(
                  (c: any) => c.type === "address",
                )?.values ?? [];
              const existing = rawExisting.map((v: any) =>
                typeof v === "string" ? v : v.address,
              );
              if (existing.length > 0) {
                assetBuilder.removeCredentialAddresses(type, existing);
              }
            },
          );
        } else {
          [CredentialListTypes.ALLOW].forEach((type) => {
            assetBuilder.addCredentialAddresses(type, [
              asset.owner,
              ...(flags.users ?? []),
            ]);
          });
        }

        const services = getServices(published);
        for (const s of services) {
          const serviceBuilder = new ServiceBuilder({
            asset: published,
            serviceId: s.id,
          });
          if (flags.public) {
            (serviceBuilder as any).service.credentials = {};
          } else {
            serviceBuilder.addCredentialAddresses(CredentialListTypes.ALLOW, [
              asset.owner,
              ...(flags.users ?? []),
            ]);
          }
          assetBuilder.addService(serviceBuilder.build());
        }

        const nautilusAsset = assetBuilder.build();
        const result = await connection.nautilus.edit(nautilusAsset);

        const txHash =
          (result.setMetadataTxReceipt as any).hash ||
          (result.setMetadataTxReceipt as any).transactionHash;

        this.log(
          `Allowed users updated for asset, transaction: ${connection.networkConfig.explorerUri}/tx/${txHash}\n`,
        );
      } catch (error) {
        this.warn(
          `Error editing allowed users for asset ${asset.did}: ${error}`,
        );
      }
    }
  }
}

async function askForAssets(
  loginInfos: LoginInfo[],
  chainId: number,
): Promise<AssetInfo[]> {
  console.log(
    "\nPlease select the filters to find the assets you want to edit:",
  );
  return PromptForAssets({
    assetTypes: ["dataset", "algorithm"],
    accessTypes: ["access", "compute"],
    chainIds: [chainId],
    ownerChoices: loginInfos.map((info) => ({
      name: info.ownerName,
      value: info.ownerAddress,
    })),
  });
}
