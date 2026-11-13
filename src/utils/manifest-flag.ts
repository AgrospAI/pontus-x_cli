import { Flags } from "@oclif/core";
import { DEFAULT_MANIFEST_PATH } from "@/lib/manifest";

export const manifestFlag = Flags.string({
  char: "m",
  default: DEFAULT_MANIFEST_PATH,
  description:
    "Path to the authentication manifest (falls back to PRIVATE_KEY if missing)",
});
