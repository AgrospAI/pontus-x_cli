import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// These tests use real temporary files rather than the login suite's .env mock.
vi.mock("node:fs", async () => vi.importActual("node:fs"));
vi.mock("@/utils/connection", () => ({ Connection: { connect: vi.fn() } }));
vi.mock("@/lib/manifest", () => ({
  readManifest: vi.fn(() => ({ accounts: [] })),
}));
vi.mock("@/lib/spec", async () => ({
  ...(await vi.importActual<typeof import("@/lib/spec")>("@/lib/spec")),
  publishFromFile: vi.fn(),
  getEnvironmentConfig: vi.fn(async () => ({
    network: "PONTUSXTEST",
    owner: "owner",
    privateKey: "key",
  })),
}));

import Publish from "@/commands/publish";
import Revoke from "@/commands/revoke";
import { readAssetConfig, resolveAssetFiles } from "@/lib/asset-files";
import { publishFromFile } from "@/lib/spec";
import { Connection } from "@/utils/connection";

let folder: string;
const did = "did:op:test";
const publishMock = vi.fn();
const nautilus = {
  publish: publishMock,
  getAsset: vi.fn(),
  setAssetLifecycleState: vi.fn(),
};
const connection = {
  nautilus,
  wallet: { address: "owner" },
  networkConfig: {
    oceanNodeUri: "http://provider",
    explorerUri: "http://explorer",
  },
};

function spec(directory = folder, extension = "yaml", published = false) {
  mkdirSync(directory, { recursive: true });
  const file = join(directory, `spec.${extension}`);
  const metadata = {
    name: "asset",
    type: "dataset",
    ...(published ? { did } : {}),
  };
  writeFileSync(
    file,
    extension === "json"
      ? JSON.stringify({ metadata })
      : `metadata:\n  name: asset\n  type: dataset\n${published ? `  did: ${did}\n` : ""}`,
  );
  return file;
}

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "publish-revoke-"));
  vi.mocked(Connection.connect).mockResolvedValue(connection as any);
  vi.mocked(publishFromFile).mockResolvedValue(did);
  nautilus.publish = publishMock;
  publishMock.mockResolvedValue({ ddo: { id: did } });
  nautilus.getAsset.mockResolvedValue({ id: did });
  nautilus.setAssetLifecycleState.mockResolvedValue({ hash: "tx" });
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("matching publish and revoke paths", () => {
  for (const extension of ["yaml", "json"]) {
    for (const directory of [false, true]) {
      it(`round trips a ${extension} ${directory ? "directory" : "file"}`, async () => {
        const file = spec(folder, extension);
        const path = directory ? folder : file;
        await Publish.run([path]);
        expect(readAssetConfig(file).metadata.did).toBe(did);
        await Revoke.run([path]);
        expect(nautilus.getAsset).toHaveBeenCalledWith(did);
        expect(readAssetConfig(file).metadata.did).toBeUndefined();
        if (extension === "json")
          expect(JSON.parse(readFileSync(file, "utf8")).metadata.name).toBe(
            "asset",
          );
      });
    }
  }

  it("uses the same preference and does not traverse subdirectories by default", async () => {
    const root = spec(folder, "yaml", true);
    spec(folder, "json", true);
    spec(join(folder, "child"), "yaml", true);
    expect(resolveAssetFiles(folder, false)).toEqual([root]);
    await Revoke.run([folder]);
    expect(nautilus.getAsset).toHaveBeenCalledTimes(1);
  });

  it("round trips a recursive batch and skips unpublished assets", async () => {
    const root = spec();
    const child = spec(join(folder, "child"), "json");
    await Publish.run([folder, "-r", "-m", "manifest.yaml"]);
    expect(readAssetConfig(root).metadata.did).toBe(did);
    expect(readAssetConfig(child).metadata.did).toBe(did);
    const unpublished = spec(join(folder, "unpublished"));
    await Revoke.run([folder, "-r", "-m", "manifest.yaml"]);
    expect(nautilus.getAsset).toHaveBeenCalledTimes(2);
    for (const file of [root, child, unpublished])
      expect(readAssetConfig(file).metadata.did).toBeUndefined();
  });

  it("accepts individual files with --recursive", async () => {
    const file = spec();
    await Publish.run([file, "-r"]);
    await Revoke.run([file, "-r"]);
    expect(nautilus.getAsset).toHaveBeenCalledWith(did);
  });

  it("records and revokes TypeScript publications without executing the script again", async () => {
    const file = join(folder, "index.ts");
    writeFileSync(
      file,
      "export const publish = async (_folder: string, connection: any) => { await connection.nautilus.publish({}); };",
    );
    await Publish.run([file]);
    expect(readAssetConfig(file).metadata.did).toBe(did);
    expect(existsSync(`${file}.published.json`)).toBe(true);
    await Revoke.run([file]);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(nautilus.getAsset).toHaveBeenCalledWith(did);
    expect(readAssetConfig(file).metadata.did).toBeUndefined();
  });

  it("round trips scripts in recursive batches", async () => {
    const file = join(folder, "index.ts");
    writeFileSync(
      file,
      "export async function publish(_folder: string, connection: any) { await connection.nautilus.publish({}); }",
    );
    await Publish.run([folder, "--recursive"]);
    expect(readAssetConfig(file).metadata.did).toBe(did);
    await Revoke.run([folder, "--recursive"]);
    expect(readAssetConfig(file).metadata.did).toBeUndefined();
  });

  it("keeps recursive dry runs from writing DID, owner or network metadata", async () => {
    const file = spec();
    const original = readFileSync(file, "utf8");
    await Publish.run([folder, "-r", "--dry-run"]);
    expect(readFileSync(file, "utf8")).toBe(original);
    await Revoke.run([folder, "-r", "--dry-run"]);
    expect(nautilus.setAssetLifecycleState).not.toHaveBeenCalled();
  });

  it("retains the long --paths option", async () => {
    const file = spec(folder, "yaml", true);
    await Revoke.run(["--paths", file]);
    expect(nautilus.getAsset).toHaveBeenCalledWith(did);
  });

  it("does not edit publication records during dry runs", async () => {
    const file = spec(folder, "json", true);
    const original = readFileSync(file, "utf8");
    await Publish.run([file, "--dry-run"]);
    await Revoke.run([file, "--dry-run"]);
    expect(readFileSync(file, "utf8")).toBe(original);
    expect(nautilus.setAssetLifecycleState).not.toHaveBeenCalled();
  });

  it("does not remove the DID after a failed revocation", async () => {
    const file = spec(folder, "json", true);
    nautilus.setAssetLifecycleState.mockRejectedValueOnce(
      new Error("transaction failed"),
    );
    await expect(Revoke.run([file])).rejects.toThrow("transaction failed");
    expect(readAssetConfig(file).metadata.did).toBe(did);
  });

  it("uses publish's provider flag and retains direct DID revocation", async () => {
    await Revoke.run(["-d", did, "-y", "-p", "http://custom-provider"]);
    expect(Connection.connect).toHaveBeenCalledWith({
      OCEAN_NODE_URI: "http://custom-provider",
    });
    expect(nautilus.getAsset).toHaveBeenCalledWith(did);
  });

  it("reports missing paths before connecting", async () => {
    await expect(Revoke.run([join(folder, "missing")])).rejects.toThrow(
      "does not exist",
    );
    expect(Connection.connect).not.toHaveBeenCalled();
  });
});
