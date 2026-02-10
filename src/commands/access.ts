import { Args, Command } from "@oclif/core";
import { Connection } from "@/utils/connection";

export default class Access extends Command {
  static args = {
    did: Args.string({ description: "DID of the asset", required: true }),
  };
  static description = "Access an asset that can be downloaded given its DID";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:op:af3e93c4f18903f91b108e7204b8a752e7605f4547ed507212bd6aca63af5686",
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(Access);
    const { did } = args;
    this.log(`Getting access to downloadable asset: ${did}`);
    const { nautilus } = await Connection.connect();
    const accessUrl = await nautilus.access({ assetDid: did });
    this.log(`Download URL: ${accessUrl}\n`);
  }
}
