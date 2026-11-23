import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("node:fs", async () => vi.importActual("node:fs"));

import { publishFromFile } from "@/lib/spec";

let folder: string;
const owner = "0x7e102ff28971be04c3ecb5b486edc94ed2b83c12";
const publish = vi.fn(async () => ({
  ddo: { id: "did:ope:test" },
  setMetadataTxReceipt: { hash: "0xtx" },
}));
const connection = {
  wallet: { address: owner },
  remoteStore: {},
  nautilus: { publish },
  networkConfig: { explorerUri: "https://explorer" },
};
function service(serviceType = "compute") {
  return {
    serviceType,
    fileType: "url",
    serviceEndpoint: `https://${serviceType}.example.org`,
    timeout: 3600,
    files: [
      { type: "url", url: "https://example.org/wine.csv", method: "GET" },
    ],
    pricing: { type: "free" },
    datatoken: { name: serviceType, symbol: serviceType.toUpperCase() },
  };
}
function config() {
  return {
    metadata: {
      type: "dataset",
      name: "Wine",
      description: "description.md",
      owner,
    },
    nftData: {
      name: "Wine",
      symbol: "RED",
      templateIndex: 1,
      tokenURI: "https://example.org/wine",
      transferable: false,
    },
    trustOwnerAlgorithms: true,
    services: [
      {
        ...service(),
        allowRawAlgorithms: true,
        credentials: { allow: [owner] },
      },
      {
        ...service("access"),
        name: "Download",
        state: 0,
        credentials: { deny: [owner] },
      },
    ],
  };
}
async function run(value: unknown, endpoint = "", dryRun = false) {
  const file = join(folder, "spec.json");
  writeFileSync(file, JSON.stringify(value));
  return publishFromFile(file, endpoint, connection as any, dryRun);
}
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "multi-service-"));
  writeFileSync(join(folder, "description.md"), "Wine dataset");
  publish.mockClear();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => rmSync(folder, { recursive: true, force: true }));
it("publishes both services with independent endpoints, tokens, credentials and compute settings", async () => {
  expect(await run(config())).toBe("did:ope:test");
  const asset = (publish.mock.calls as any)[0][0];
  expect(asset.owner.toLowerCase()).toBe(owner);
  const [compute, access] = asset.ddo.services;
  expect(compute.serviceEndpoint).toBe("https://compute.example.org");
  expect(access.serviceEndpoint).toBe("https://access.example.org");
  expect(compute.datatokenCreateParams.symbol).toBe("COMPUTE");
  expect(access.datatokenCreateParams.symbol).toBe("ACCESS");
  expect(compute.credentials.allow[0].values).toEqual([{ address: owner }]);
  expect(access.credentials.deny[0].values).toEqual([{ address: owner }]);
  expect(compute.compute.allowRawAlgorithm).toBe(true);
  expect(compute.compute.publisherTrustedAlgorithmPublishers).toContain(owner);
  expect(access.compute.publisherTrustedAlgorithmPublishers).not.toContain(
    owner,
  );
  expect(access.name).toBe("Download");
  expect(access.state).toBe(0);
});
it("keeps legacy single-service manifests working and honours explicit endpoint overrides", async () => {
  const { services, ...base } = config();
  await run({ ...base, service: services[0] }, "https://override.example.org");
  const asset = (publish.mock.calls as any)[0][0];
  expect(asset.ddo.services).toHaveLength(1);
  expect(asset.ddo.services[0].serviceEndpoint).toBe(
    "https://override.example.org",
  );
});
it("rejects ambiguous or empty service declarations", async () => {
  await expect(run({ ...config(), service: service() })).rejects.toThrow(
    "Specify either",
  );
  await expect(run({ ...config(), services: [] })).rejects.toThrow(
    "Specify either",
  );
});
it("rejects wallet-owner mismatches before publishing", async () => {
  const value = config();
  value.metadata.owner = "0x7774693ebe0352092cf1c81368afb034e4d042d1";
  await expect(run(value)).rejects.toThrow("does not match owner");
  expect(publish).not.toHaveBeenCalled();
});
it("builds both services during a dry run without publishing", async () => {
  await run(config(), "", true);
  expect(publish).not.toHaveBeenCalled();
});

it("lets compute services override inherited flags and trust lists with false and empty values", async () => {
  const value = config();
  Object.assign(value, {
    allowRawAlgorithms: true,
    allowAlgorithmNetworkAccess: true,
    trustedAlgorithmPublishers: [owner],
  });
  Object.assign(value.services[0], {
    allowRawAlgorithms: false,
    allowAlgorithmNetworkAccess: false,
    trustOwnerAlgorithms: false,
    trustedAlgorithmPublishers: [],
    trustedAlgorithms: [],
  });
  await run(value);
  const compute = (publish.mock.calls as any)[0][0].ddo.services[0].compute;
  expect(compute.allowRawAlgorithm).toBe(false);
  expect(compute.allowNetworkAccess).toBe(false);
  expect(compute.publisherTrustedAlgorithmPublishers).toEqual([]);
  expect(compute.publisherTrustedAlgorithms).toEqual([]);
});

it("preserves extended service metadata and request credentials", async () => {
  const value = config();
  Object.assign(value.services[0], {
    displayName: "Compute title",
    description: "Compute description",
    additionalInformation: { version: 1 },
    credentials: {
      requestCredentials: {
        allow: [{ type: "VerifiableId", format: "jwt_vc_json" }],
      },
    },
  });
  await run(value);
  const compute = (publish.mock.calls as any)[0][0].ddo.services[0];
  expect(compute.displayName).toBe("Compute title");
  expect(compute.description).toBe("Compute description");
  expect(compute.additionalInformation).toEqual({ version: 1 });
  expect(
    compute.credentials.allow.find((entry: any) => entry.type === "SSIpolicy")
      .values[0].request_credentials,
  ).toEqual([{ type: "VerifiableId", format: "jwt_vc_json" }]);
});
