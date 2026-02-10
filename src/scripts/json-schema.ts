import fs from "node:fs";

import { manifestSchema } from "../types/manifest";

export function generateManifestJsonSchema() {
  console.log("Generating manifest JSON schema...");
  const jsonSchema = manifestSchema.toJSONSchema();
  const path = "src/types/manifest-schema.json";
  fs.writeFileSync(path, JSON.stringify(jsonSchema, null, 2));
}

if (typeof require !== "undefined" && require.main === module) {
  const cmd = process.argv[2];
  if (cmd === "generateManifestJsonSchema") {
    generateManifestJsonSchema();
  } else {
    console.error("Usage: npx ts-node src/scripts/json-schema.ts <command>");
  }
}
