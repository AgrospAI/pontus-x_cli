import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { createDidDocument } from "@gaia-x/did-web-generator";
import { Command, Flags } from "@oclif/core";

export default class GenerateDidWeb extends Command {
  static description =
    "Generate a did.json to set up a DID-Web source to publish Gaia-X complaint credentials";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> -d <https://compliance.agrospai.udl.cat> -c certificate-chain.crt",
  ];
  static flags = {
    certificate: Flags.string({
      char: "c",
      description:
        "Path to the file with the certificate chain for the DID domain URL",
      required: true,
    }),
    domain: Flags.string({
      char: "d",
      description: "URL where the DID-Web document will be hosted",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(GenerateDidWeb);
    try {
      const x509 = readFileSync(flags.certificate, "utf8");
      const didJson = await createDidDocument(
        flags.domain,
        basename(flags.certificate),
        x509,
      );
      const folder = dirname(flags.certificate);
      console.log(`Writing DID Web document to ${resolve(folder, "did.json")}`);
      writeFileSync(
        resolve(folder, "did.json"),
        JSON.stringify(didJson, null, 2),
      );
    } catch (error) {
      this.error(error as string);
    }
  }
}
