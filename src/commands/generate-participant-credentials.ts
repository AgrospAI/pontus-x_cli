import { Command, Flags } from "@oclif/core";
import readlineSync from "readline-sync";

import { generateCredentials } from "@/lib/gaia-x_compliance/generate-credentials";

export default class GenerateParticipantCredentials extends Command {
  static description =
    "Generate the Gaia-X credentials for the participant including their verifiable presentation";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> -p ./CEP.data.json -d ./did.json -c certificate.key",
  ];
  static flags = {
    certificate: Flags.string({
      char: "c",
      description: "Path to the certificate.key file",
      required: true,
    }),
    didjson: Flags.string({
      char: "d",
      description: "Path to the did.json file",
      required: true,
    }),
    participant: Flags.string({
      char: "p",
      description:
        "Path to the JSON file including the required participant data",
      required: true,
    }),
    password: Flags.string({
      char: "w",
      description:
        "Password for the private key file (if not provided, it will be asked interactively)",
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(GenerateParticipantCredentials);
    try {
      const password =
        flags.password ??
        readlineSync.question(
          `Enter the password for your private key file ${flags.certificate}: `,
          {
            hideEchoBack: true,
          },
        );
      await generateCredentials(
        flags.participant,
        flags.didjson,
        flags.certificate,
        password,
      );
    } catch (error) {
      this.error(error as string);
    }
  }
}
