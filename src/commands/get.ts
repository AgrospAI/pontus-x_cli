import { Args, Command } from "@oclif/core";

import { Connection } from "@/utils/connection";

export default class Get extends Command {
  static args = {
    did: Args.string({ description: "DID of the asset", required: true }),
  };
  static description =
    "Get the available metadata to the asset with the given DID";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a",
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(Get);
    const { did } = args;
    this.log(`Retrieving asset metadata for DID: ${did}`);
    const { nautilus } = await Connection.connect();
    const aquariusAsset = await nautilus.getAquariusAsset(did);
    this.log(
      `Asset ${did} metadata: \n\n ${JSON.stringify(aquariusAsset, null, 2)} \n`,
    );
  }
}
