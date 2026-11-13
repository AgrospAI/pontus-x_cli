import { existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type PublishConfig from "@/types/publish";
import { getFilesFromPaths, parseConfig, writeConfig } from "./spec";
import { deleteKeyFromYaml, setKeyInYaml } from "./yaml";

const preference = ["spec.yaml", "spec.json", "index.ts"];

/** Use the same file preference and recursion rules for publish and revoke. */
export function resolveAssetFiles(path: string, recursive: boolean): string[] {
  if (!existsSync(path)) {
    throw new Error(`The provided path does not exist: ${path}`);
  }
  if (!lstatSync(path).isDirectory()) return [path];
  if (recursive) return getFilesFromPaths([path], preference);
  const file = preference.map((name) => join(path, name)).find(existsSync);
  if (!file) {
    throw new Error(
      `No spec.yaml, spec.json or index.ts file found in the provided directory: ${path}`,
    );
  }
  return [file];
}

// Scripts cannot be edited as specs; keep their publication metadata alongside them.
export function readAssetConfig(file: string): PublishConfig {
  if (!file.endsWith(".ts")) return parseConfig(file);
  const receipt = `${file}.published.json`;
  return existsSync(receipt)
    ? JSON.parse(readFileSync(receipt, "utf8"))
    : ({ metadata: {} } as PublishConfig);
}

export function updatePublication(
  file: string,
  metadata: { did?: string; owner?: string; network?: string },
): void {
  if (file.endsWith(".yaml")) {
    if (metadata.did) {
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== undefined) setKeyInYaml(file, `metadata.${key}`, value);
      }
    } else {
      deleteKeyFromYaml(file, "metadata.did");
    }
    return;
  }
  const config = readAssetConfig(file);
  if (metadata.did) Object.assign(config.metadata, metadata);
  else delete config.metadata.did;
  if (file.endsWith(".ts")) {
    writeFileSync(`${file}.published.json`, JSON.stringify(config, null, 2));
  } else {
    writeConfig(config, file);
  }
}
