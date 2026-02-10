import { readFileSync } from "node:fs";
import { parse } from "yaml";

import { type Account, type Manifest, manifestSchema } from "../types/manifest";

export function readManifest(path: string): Manifest {
  const raw = readFileSync(path, "utf8");

  const manifest = parse(raw) as Manifest;

  const parseResult = manifestSchema.safeParse(manifest);

  if (!parseResult.success) {
    throw new Error(
      `Invalid manifest file: ${JSON.stringify(parseResult.error.issues, null, 2)}`,
    );
  }

  return parseResult.data;
}

export function normalizeAddress(addr: string): string {
  const lower = addr.toLowerCase();
  return lower.startsWith("0x") ? lower : `0x${lower}`;
}

export function getAccountByAddress(
  manifest: Manifest,
  address: string,
): Account | null {
  const account = manifest.accounts.find(
    (acc) => normalizeAddress(acc.address) === normalizeAddress(address),
  );
  if (!account) {
    return null;
  }

  return account;
}
