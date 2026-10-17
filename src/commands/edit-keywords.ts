import { AssetBuilder } from "@deltadao/nautilus";
import { Args, Command, Flags } from "@oclif/core";
import readlineSync from "readline-sync";

import { Connection } from "@/utils/connection";

export default class EditKeywords extends Command {
  static args = {
    did: Args.string({ description: "Algorithm DID", required: true }),
    keywords: Args.string({
      description: "Comma separated list of keywords",
      required: true,
    }),
  };
  static description = "Change the list of keywords of the indicated DID";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:op:dcdb747f8feff3122c6d6c0f45a339a6e09415e721f98f61cc2c1d62ab35a21f agrospai,agriculture,data",
  ];
  static flags = {
    yes: Flags.boolean({
      char: "y",
      default: false,
      description: "Skip confirmation prompt",
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(EditKeywords);
    const { did, keywords } = args;
    const connection = await Connection.connect();
    if (
      flags.yes ||
      readlineSync.keyInYNStrict(
        `Update the list of keyword a for asset ${did} to "${keywords}? `,
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
        const asset = assetBuilder
          .addTags(keywords.split(",").map((k) => k.trim()))
          .build();
        const result = await connection.nautilus.edit(asset);
        const txHash =
          (result.setMetadataTxReceipt as any).hash ||
          (result.setMetadataTxReceipt as any).transactionHash;

        this.log(
          `Asset keywords updated, transaction: ${connection.networkConfig.explorerUri}/tx/${txHash}\n`,
        );
      } catch (error) {
        this.error(`Error editing keywords: ${error}`);
      }
    }
  }
}
