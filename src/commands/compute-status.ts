import { Args, Command, Flags } from "@oclif/core";
import { Connection } from "@/utils/connection";

export default class ComputeStatus extends Command {
  static args = {
    jobId: Args.string({ description: "Compute job ID", required: true }),
  };
  static description = "Check compute job status.";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> 0x1234...-215bae450c8f40f59bfc5d1ccada3931",
  ];
  static flags = {
    provider: Flags.string({
      char: "p",
      description: "Ocean Node URL (defaults to configured oceanNodeUri)",
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ComputeStatus);
    const connection = await Connection.connect();
    try {
      const computeJobStatus = await connection.nautilus.getComputeStatus({
        jobId: args.jobId,
        nodeUri: flags.provider,
      });

      if (!computeJobStatus) {
        this.log(`No status found for job ${args.jobId}\n`);
        return;
      }

      this.log(`Compute status: ${computeJobStatus.statusText}\n`);
      if (
        computeJobStatus.dateFinished ||
        computeJobStatus.statusText === "Job finished"
      ) {
        this.log(
          `Get results using command:\n ${this.config.bin} compute-results ${args.jobId}\n`,
        );
      }
    } catch (error) {
      this.error(`Error checking compute status: ${error}`);
    }
  }
}
