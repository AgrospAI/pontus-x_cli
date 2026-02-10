import fs from "node:fs";
import dotenv from "dotenv";

import Publish from "@/commands/publish";
import Revoke from "@/commands/revoke";
import { parseConfig } from "@/lib/spec";

dotenv.config();

interface Assets {
  algorithm1Did: string;
  algorithm2Did: string;
  dataset1Did: string;
  dataset2Did: string;
  dataset3Did: string;
}

export const assetPaths = {
  algorithm1: "test/assets/algorithm1/spec.yaml",
  algorithm2: "test/assets/algorithm2/spec.yaml",
  dataset1: "test/assets/dataset1/spec.yaml",
  dataset2: "test/assets/dataset2/spec.yaml",
  dataset3: "test/assets/dataset3/spec.yaml",
};

export async function initializeAssets() {
  console.log("🚀 Publishing assets for integration tests...");
  await Publish.run(["./test/assets", "-r"]);
}

export async function revokeAssets() {
  console.log("🛑 Revoking assets used in integration tests...");
  await Revoke.run(["-p", "./test/assets", "-r", "-y"]);
}

export function getAssets(): Assets {
  const dids = {} as any;
  for (const [assetKey, assetPath] of Object.entries(assetPaths)) {
    if (!fs.existsSync(assetPath)) {
      throw new Error(`Asset file not found: ${assetPath}`);
    }

    const config = parseConfig(assetPath);

    if (!config.metadata || !config.metadata.did) {
      throw new Error(`Missing DID in asset config: ${assetPath}`);
    }

    dids[`${assetKey}Did`] = config.metadata.did;
  }

  return dids as Assets;
}

if (typeof require !== "undefined" && require.main === module) {
  (async () => {
    const cmd = process.argv[2];
    if (cmd === "initializeAssets") {
      await initializeAssets();
    } else if (cmd === "revokeAssets") {
      await revokeAssets();
    } else {
      console.error("Usage: npx ts-node test/helpers/assets.ts <command>");
    }
  })();
}
