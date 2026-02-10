import { AssetBuilder, ServiceBuilder } from "@deltadao/nautilus";
import { Args, Command, Flags } from "@oclif/core";
import readlineSync from "readline-sync";

import { Connection } from "@/utils/connection";

export default class EditAssetUrl extends Command {
  static args = {
    did: Args.string({ description: "DID of the asset", required: true }),
    url: Args.string({
      description: "New URL for the asset",
      required: true,
    }),
  };
  static description = "Change the URL of an asset DID";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:op:af3e93c4f18903f91b108e7204b8a752e7605f4547ed507212bd6aca63af5686 https://raw.githubusercontent.com/plotly/datasets/refs/heads/master/titanic.csv",
  ];
  static flags = {
    yes: Flags.boolean({
      char: "y",
      default: false,
      description: "Automatic yes to prompts",
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(EditAssetUrl);
    const { did, url } = args;
    const connection = await Connection.connect();
    if (
      flags.yes ||
      readlineSync.keyInYNStrict(`Changing the URL for ${did} to ${url}? `)
    ) {
      try {
        const aquariusAsset = await connection.nautilus.getAquariusAsset(did);
        const assetBuilder = new AssetBuilder(aquariusAsset);
        const serviceBuilder = new ServiceBuilder({
          aquariusAsset,
          serviceId: aquariusAsset.services[0].id,
        });
        serviceBuilder.addFile({ method: "GET", type: "url", url });
        const service = serviceBuilder.build();
        const asset = assetBuilder.addService(service).build();
        const result = await connection.nautilus.edit(asset);
        this.log(
          `Changed asset URL, transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
        );
      } catch (error) {
        this.error(`Error changing dataset URL: ${error}`);
      }
    }
  }
}
