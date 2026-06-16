import fs from "node:fs";
import path from "node:path";
import { Command, Flags } from "@oclif/core";

export default class GenerateManifest extends Command {
  static description =
    "Generate a YAML manifest file from a folder of encrypted key JSON files";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> --keys-dir ./keys --password-env KEY_PASSWORD",
    "<%= config.bin %> <%= command.id %> --keys-dir ./keys --password-env KEY_PASSWORD --output manifest.yaml",
  ];
  static flags = {
    "keys-dir": Flags.string({
      char: "k",
      description: "Directory containing the encrypted key JSON files",
      required: true,
    }),
    "password-env": Flags.string({
      char: "e",
      description:
        "Environment variable name to use as passwordEnvKey for all accounts",
      required: true,
    }),
    output: Flags.string({
      char: "o",
      description: "Output YAML file path (default: manifest.yaml)",
      default: "manifest.yaml",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(GenerateManifest);

    const keysDir = flags["keys-dir"];
    const passwordEnvKey = flags["password-env"];
    const outputFile = flags.output;

    if (!fs.existsSync(keysDir)) {
      this.error(`Keys directory not found: ${keysDir}`);
    }

    const keyFiles = fs
      .readdirSync(keysDir)
      .filter((f) => f.endsWith(".json"))
      .sort();

    if (keyFiles.length === 0) {
      this.error(`No JSON key files found in ${keysDir}`);
    }

    console.log(`Found ${keyFiles.length} key file(s) in ${keysDir}\n`);

    const lines: string[] = ["accounts:", ""];

    keyFiles.forEach((file, i) => {
      const filePath = path.join(keysDir, file);
      let address: string;

      try {
        const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        address = `0x${json.address}`;
      } catch {
        this.warn(
          `Skipping ${file}: could not parse JSON or missing address field`,
        );
        return;
      }

      lines.push(`- name: "Address #${i + 1}"`);
      lines.push(`  address: '${address}'`);
      lines.push(`  privateKeyPath: ${path.join(keysDir, file)}`);
      lines.push(`  passwordEnvKey: ${passwordEnvKey}`);
      lines.push("");
    });

    fs.writeFileSync(outputFile, lines.join("\n"));
    console.log(`Manifest written to ${outputFile}`);
  }
}
