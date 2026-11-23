import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Wallet } from "ethers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async () => vi.importActual("node:fs"));
vi.mock("@/lib/wallet", async () => ({
  ...(await vi.importActual<typeof import("@/lib/wallet")>("@/lib/wallet")),
  readPrivateKey: vi.fn(),
}));
vi.mock("@/lib/aquarius", () => ({ getOwnerName: vi.fn(async () => "-") }));
vi.mock("@inquirer/prompts", () => ({ select: vi.fn() }));
vi.mock("@deltadao/nautilus", () => ({
  Nautilus: { create: vi.fn() },
  IpfsRemoteStore: vi.fn(),
}));

import { Nautilus } from "@deltadao/nautilus";
import { select } from "@inquirer/prompts";
import { readOptionalManifest } from "@/lib/manifest";
import { getEnvironmentConfig } from "@/lib/spec";
import { readPrivateKey } from "@/lib/wallet";
import type PublishConfig from "@/types/publish";
import { Connection } from "@/utils/connection";
import { getLoginInfo, getLoginInfos } from "@/utils/login";

const manifestKey = `0x${"11".repeat(32)}`;
const envKey = `0x${"22".repeat(32)}`;
const owner = new Wallet(manifestKey).address;
const manifest = {
  accounts: [
    {
      address: owner,
      privateKeyPath: "account.json",
      passwordEnvKey: "TEST_PASSWORD",
    },
  ],
};
const config = { metadata: { owner, network: "PONTUSXTEST" } } as PublishConfig;
let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "authentication-"));
  vi.stubEnv("PRIVATE_KEY", envKey);
  vi.stubEnv("NETWORK", "PONTUSXTEST");
  vi.stubEnv("TEST_PASSWORD", "test-password");
  vi.mocked(readPrivateKey).mockResolvedValue(manifestKey);
  vi.mocked(Nautilus.create).mockResolvedValue({
    publish: vi.fn(),
    completePublish: vi.fn(),
    edit: vi.fn(),
    setAssetLifecycleState: vi.fn(),
    setServicePrice: vi.fn(),
  } as any);
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  rmSync(directory, { recursive: true, force: true });
});

function writeManifest(name = "manifest.yaml") {
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify(manifest));
  return path;
}

describe("manifest authentication", () => {
  it("uses the default manifest before PRIVATE_KEY, including unnamed accounts", async () => {
    writeManifest();
    const cwd = process.cwd();
    process.chdir(directory);
    try {
      expect((await getLoginInfos())[0].privateKey).toBe(manifestKey);
      expect((await Connection.connect()).wallet.address).toBe(owner);
    } finally {
      process.chdir(cwd);
    }
    expect(select).not.toHaveBeenCalled();
  });

  it("uses a custom manifest path", async () => {
    const path = writeManifest("custom.yaml");
    expect((await getLoginInfo(path)).privateKey).toBe(manifestKey);
    expect((await Connection.connect(undefined, path)).wallet.address).toBe(
      owner,
    );
    expect(readPrivateKey).toHaveBeenCalledWith(
      "account.json",
      "test-password",
    );
  });

  it("falls back to PRIVATE_KEY when the default manifest is missing", async () => {
    const cwd = process.cwd();
    process.chdir(directory);
    try {
      expect(readOptionalManifest()).toBeUndefined();
      expect((await getLoginInfo()).privateKey).toBe(envKey);
    } finally {
      process.chdir(cwd);
    }
  });

  it("falls back to PRIVATE_KEY when a custom manifest is missing", async () => {
    const path = join(directory, "missing.yaml");
    expect(readOptionalManifest(path)).toBeUndefined();
    expect((await Connection.connect(undefined, path)).wallet.address).toBe(
      new Wallet(envKey).address,
    );
    expect(readPrivateKey).not.toHaveBeenCalled();
  });

  it("reports a missing login before connecting to the network", async () => {
    vi.stubEnv("PRIVATE_KEY", "");
    await expect(
      Connection.connect(undefined, join(directory, "missing.yaml")),
    ).rejects.toThrow("You are not logged in");
    expect(Nautilus.create).not.toHaveBeenCalled();
  });

  it("reports an empty manifest without prompting", async () => {
    const path = writeManifest();
    writeFileSync(path, '{"accounts":[]}');
    await expect(getLoginInfo(path)).rejects.toThrow("No login accounts found");
    expect(select).not.toHaveBeenCalled();
  });

  it("reports malformed manifests rather than silently using another account", async () => {
    const path = writeManifest();
    writeFileSync(path, '{"accounts":"invalid"}');
    await expect(getLoginInfo(path)).rejects.toThrow("Invalid manifest file");
  });

  it("preserves an explicitly resolved account when creating a connection", async () => {
    expect(
      (await Connection.connect({ PRIVATE_KEY: envKey }, writeManifest()))
        .wallet.address,
    ).toBe(new Wallet(envKey).address);
    expect(readPrivateKey).not.toHaveBeenCalled();
  });
});

describe("asset owner authentication", () => {
  it("prefers the owner's manifest key over PRIVATE_KEY", async () => {
    expect(await getEnvironmentConfig("spec.yaml", config, manifest)).toEqual({
      network: "PONTUSXTEST",
      owner,
      privateKey: manifestKey,
    });
  });

  it("uses a manifest account when no owner is specified", async () => {
    const withoutOwner = {
      metadata: { network: "PONTUSXTEST" },
    } as PublishConfig;
    expect(
      (await getEnvironmentConfig("spec.yaml", withoutOwner, manifest))
        ?.privateKey,
    ).toBe(manifestKey);
  });

  it("uses the environment account when it matches the declared owner", async () => {
    vi.stubEnv("PRIVATE_KEY", manifestKey);
    expect(await getEnvironmentConfig("spec.yaml", config)).toEqual({
      network: "PONTUSXTEST",
      owner,
      privateKey: manifestKey,
    });
  });

  it("rejects an environment key that overrides the declared owner", async () => {
    await expect(getEnvironmentConfig("spec.yaml", config)).rejects.toThrow(
      "does not match owner",
    );
  });

  it("reports a missing login", async () => {
    vi.stubEnv("PRIVATE_KEY", "");
    await expect(getEnvironmentConfig("spec.yaml", config)).rejects.toThrow(
      "You are not logged in",
    );
  });

  it("reports an owner missing from the manifest", async () => {
    await expect(
      getEnvironmentConfig("spec.yaml", config, { accounts: [] }),
    ).rejects.toThrow("No login account found in the manifest for owner");
  });

  it("rejects a key belonging to a different owner", async () => {
    vi.mocked(readPrivateKey).mockResolvedValue(envKey);
    await expect(
      getEnvironmentConfig("spec.yaml", config, manifest),
    ).rejects.toThrow("does not match owner");
  });

  it("reports keystore errors without exposing the password", async () => {
    vi.mocked(readPrivateKey).mockRejectedValue(
      new Error("bad password: test-password"),
    );
    await expect(
      getEnvironmentConfig("spec.yaml", config, manifest),
    ).rejects.toThrow(
      "Check the manifest key path and password environment variable",
    );
  });
});
