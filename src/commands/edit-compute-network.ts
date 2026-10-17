import { AssetBuilder, getServices, ServiceBuilder } from "@deltadao/nautilus";
import { Args, Command, Flags } from "@oclif/core";
import readlineSync from "readline-sync";

import { Connection } from "@/utils/connection";

export default class EditComputeNetwork extends Command {
  static args = {
    did: Args.string({ description: "DID of the asset", required: true }),
  };
  static description =
    "Enable or disable algorithm network access for an asset's compute service";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:ope:37d12a459bed3461cb4553aeac7e8484a7ff144e618fd5a604fb01d73b965d40 --enable",
    "<%= config.bin %> <%= command.id %> did:ope:37d12a459bed3461cb4553aeac7e8484a7ff144e618fd5a604fb01d73b965d40 --disable",
  ];
  static flags = {
    enable: Flags.boolean({
      char: "e",
      default: true,
      description: "Enable algorithm network access",
      allowNo: true,
    }),
    disable: Flags.boolean({
      char: "d",
      description: "Disable algorithm network access",
      exclusive: ["enable"],
    }),
    yes: Flags.boolean({
      char: "y",
      default: false,
      description: "Skip confirmation prompt",
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(EditComputeNetwork);
    const { did } = args;
    const enable = flags.disable ? false : flags.enable;
    const action = enable ? "enable" : "disable";

    const connection = await Connection.connect();
    if (
      flags.yes ||
      readlineSync.keyInYNStrict(
        `${enable ? "Enable" : "Disable"} network access for asset ${did}? `,
      )
    ) {
      try {
        if (!connection.remoteStore) {
          throw new Error(
            "Editing requires a remote store. Please set PINATA_JWT or IPFS_UPLOAD_URL in your environment.",
          );
        }

        const published = await connection.nautilus.getAsset(did);
        const assetBuilder = new AssetBuilder(published);
        assetBuilder.setIssuer(connection.wallet.address);

        const computeServices = getServices(published).filter(
          (s) => s.type === "compute",
        );

        if (computeServices.length === 0) {
          this.error(`Asset ${did} has no compute service.`);
        }

        for (const s of computeServices) {
          const serviceBuilder = new ServiceBuilder({
            asset: published,
            serviceId: s.id,
          });
          serviceBuilder.allowAlgorithmNetworkAccess(enable);
          assetBuilder.addService(serviceBuilder.build());
        }

        const asset = assetBuilder.build();
        const result = await connection.nautilus.edit(asset);
        const txHash =
          (result.setMetadataTxReceipt as any).hash ||
          (result.setMetadataTxReceipt as any).transactionHash;

        this.log(
          `Compute network access ${action}d for asset, transaction: ${connection.networkConfig.explorerUri}/tx/${txHash}\n`,
        );
      } catch (error) {
        this.error(`Error updating compute network access: ${error}`);
      }
    }
  }
}
