import { Args, Command, Flags } from "@oclif/core";

import { exportAssetSpec, isSupportedDid } from "@/lib/export-spec";

export default class ExportSpec extends Command {
  static args = {
    did: Args.string({
      description: "DID of the asset to export (did:op:... or did:ope:...)",
      required: true,
    }),
  };
  static description =
    "Export an asset's metadata as a spec.yaml and description.md. " +
    "ECIES-encrypted files are decrypted when NODE_PRIVATE_KEY is set, and exported as-is otherwise.";
  static examples: Command.Example[] = [
    "<%= config.bin %> <%= command.id %> did:ope:fc865184afc5a091b5a86be9fba1138a777ff8db0126dcff7e8aa19b77e7eb1c --out ./specs",
    "<%= config.bin %> <%= command.id %> did:op:1d73aa2b0d5bc9b0c624dcd01e319d868f7bb75815e48e292d44308370508591 -o ./specs",
  ];
  static flags = {
    out: Flags.string({
      char: "o",
      default: ".",
      description:
        "Parent folder where the asset folder (named after the asset) is created",
      required: false,
    }),
    node: Flags.string({
      description:
        "Metadata service base URL to query instead of the ones from .env",
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ExportSpec);
    const did = args.did.trim();

    if (!isSupportedDid(did)) {
      this.error(
        `Unsupported DID: ${did}. Expected did:op:<64 hex chars> or did:ope:<64 hex chars>.`,
      );
    }

    const result = await exportAssetSpec(did, {
      outDir: flags.out,
      nodeUri: flags.node,
    });

    const spec = result.spec;
    const container = spec.metadata.algorithm?.container;
    const files = spec.service.files as any;
    const urls = Array.isArray(files)
      ? files.map((file) => file.url).filter(Boolean)
      : [];
    const encrypted = !Array.isArray(files) && typeof files === "string";

    if (encrypted) {
      this.warn(
        "NODE_PRIVATE_KEY is not set: service.files was exported as the encrypted payload.",
      );
    }

    this.log(`DID      : ${result.did}`);
    this.log(`Source   : ${result.source}`);
    this.log(
      `Format   : ${
        result.format === "new-stack"
          ? "Verifiable Credential (new data space stack)"
          : "legacy DDO"
      }`,
    );
    this.log(`Name     : ${spec.metadata.name}`);
    this.log(
      `Type     : ${spec.metadata.type}${
        spec.service.serviceType ? ` (${spec.service.serviceType})` : ""
      }`,
    );
    if (spec.metadata.network) this.log(`Network  : ${spec.metadata.network}`);
    if (container) {
      this.log(
        `Container: ${container.image}${
          container.tag ? `:${container.tag}` : ""
        }`,
      );
      if (container.checksum) this.log(`Checksum : ${container.checksum}`);
    }
    this.log(
      `Files    : ${
        encrypted
          ? "(encrypted — set NODE_PRIVATE_KEY to export the clear URLs)"
          : urls.join(", ") || "(none)"
      }`,
    );
    this.log(`Pricing  : ${spec.service.pricing.type}`);
    this.log("");
    this.log(
      `${result.overwritten ? "Overwrote" : "Created"}: ${result.folder}`,
    );
    this.log(`  - spec.yaml (metadata.did: ${spec.metadata.did})`);
    this.log("  - description.md");
  }
}
