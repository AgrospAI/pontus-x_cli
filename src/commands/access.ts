import { OrderCheckError, PolicyDeniedError } from "@deltadao/nautilus";
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
    try {
      const { url } = await nautilus.access({ assetDid: did });
      this.log(`Download URL: ${url}\n`);
    } catch (error) {
      if (error instanceof OrderCheckError) {
        const costs = error.costs
          .map((c) => `${c.amount} ${c.symbol}`)
          .join(" + ");
        this.error(
          `Previous order check failed: ${error.message}\n` +
            (costs ? `Potential duplicate cost: ${costs}\n` : "") +
            `Please check your RPC connection or retry later.`,
        );
      } else if (error instanceof PolicyDeniedError) {
        this.error(
          `Policy denied access to asset: ${error.reason || error.message} (code: ${error.code || "unknown"})`,
        );
      }
      throw error;
    }
  }
}
