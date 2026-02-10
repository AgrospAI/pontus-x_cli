import { AssetBuilder } from "@deltadao/nautilus";
import { Args, Command, Flags } from "@oclif/core";
import readlineSync from "readline-sync";

import { Connection } from "@/utils/connection";

export default class SelfDescription extends Command {
  static args = {
    did: Args.string({ description: "DID of the asset", required: true }),
    sdurl: Args.string({
      description: "URL of the Self-Description",
      required: true,
    }),
  };
  static description =
    "Associate Gaia-X Self-Description to the asset with the given DID";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:op:d22954f2cbf6a85c897ce605c275cc786e099592cc59e3b7dd66b93e784bed8c https://example.com/self-description.json",
  ];
  static flags = {
    yes: Flags.boolean({
      char: "y",
      default: false,
      description: "Skip confirmation prompt",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SelfDescription);
    const { did, sdurl } = args;
    const connection = await Connection.connect();
    if (
      flags.yes ||
      readlineSync.keyInYNStrict(
        `Attach self description at ${sdurl} to asset ${did}? `,
      )
    ) {
      try {
        const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
        const assetBuilder = new AssetBuilder(aquariusAsset);
        const asset = assetBuilder
          .addAdditionalInformation({
            gaiaXInformation: {
              serviceSD: {
                isVerified: true,
                url: sdurl,
              },
            },
          })
          .build();
        const result = await connection.nautilus.edit(asset);
        this.log(
          `Self-description associated to the asset, transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
        );
      } catch (error) {
        this.error(`Error attaching self description: ${error}`);
      }
    }
  }
}
