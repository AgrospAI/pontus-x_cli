import { Args, Command, Flags } from "@oclif/core";
import { Connection } from "@/utils/connection";

export default class ComputeResults extends Command {
  static args = {
    jobId: Args.string({ description: "Compute job ID", required: true }),
  };
  static description = "Get the compute job results.";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> 215bae450c8f40f59bfc5d1ccada3931 -p https://provider.agrospai.udl.cat",
  ];
  static flags = {
    provider: Flags.string({
      char: "p",
      default: "https://provider.agrospai.udl.cat",
      description: "The Provider URL",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ComputeResults);
    const connection = await Connection.connect();
    try {
      const computeResultUrl = await connection.nautilus.getComputeResult({
        jobId: args.jobId,
        providerUri: flags.provider,
      });
      if (computeResultUrl)
        this.log(`Compute results available from: ${computeResultUrl}\n`);
      else this.log("No results available yet\n");
    } catch (error) {
      this.error(`Error starting compute: ${error}`);
    }
  }
}
