import { Args, Command, Flags } from "@oclif/core";
import readlineSync from "readline-sync";

import { generateCredentials } from "@/lib/gaia-x_compliance/generate-credentials";
import { Connection } from "@/utils/connection";

export default class GenerateAssetCredentials extends Command {
  static args = {
    did: Args.string({ description: "DID of the asset", required: true }),
  };
  static description =
    "Generate the Gaia-X credentials for the input DID asset, including its verifiable presentation";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> -p ./CEP.data.json -d ./did.json -c certificate.key did:op:01f8bc1e797a854dc718bd7a802acb07c5fc39f706b03dd454bceb66be6828c6",
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
    const { args, flags } = await this.parse(GenerateAssetCredentials);
    this.log(`Retrieving asset metadata for DID: ${args.did}`);
    const { nautilus } = await Connection.connect();
    const ddo = await nautilus.getAquariusAsset(args.did);
    this.log(
      `Asset ${args.did} metadata: \n\n ${JSON.stringify(ddo, null, 2)} \n`,
    );
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
        ddo,
      );
    } catch (error) {
      this.error(error as string);
    }
  }
}
