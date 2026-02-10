import { Args, Command, Flags } from "@oclif/core";
import { Connection } from "@/utils/connection";

export default class ComputeStatus extends Command {
  static args = {
    jobId: Args.string({ description: "Compute job ID", required: true }),
  };
  static description = "Check compute job status.";
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
    const { args, flags } = await this.parse(ComputeStatus);
    const connection = await Connection.connect();
    try {
      const computeJobStatus = await connection.nautilus.getComputeStatus({
        jobId: args.jobId,
        providerUri: flags.provider,
      });
      this.log(`Compute status: ${computeJobStatus.statusText}\n`);
      if (computeJobStatus.statusText === "Job finished") {
        this.log(
          `Get results using command:\n ${this.config.bin} ${this.id} ${args.jobId} -p ${flags.provider}\n`,
        );
      }
    } catch (error) {
      this.error(`Error starting compute: ${error}`);
    }
  }
}
