import { describe, expect, it } from "vitest";

import {
  ddoToSpec,
  decodeFiles,
  normalizeVcDdo,
  slugify,
} from "@/lib/export-spec";

describe("export-spec", () => {
  it("builds a filesystem-safe folder name from the asset name", () => {
    expect(slugify("Enhanced Exploratory Data Analysis")).toBe(
      "enhanced-exploratory-data-analysis",
    );
    expect(slugify("  Ñandú / Dataset #1 ")).toBe("nandu-dataset-1");
    expect(slugify("")).toBe("unnamed");
  });

  it("keeps the encrypted files payload when NODE_PRIVATE_KEY is missing", () => {
    const encrypted = `0x${"ab".repeat(48)}`;

    expect(decodeFiles(encrypted)).toBe(encrypted);
    expect(decodeFiles(encrypted, undefined)).toBe(encrypted);
  });

  it("exports encrypted service files verbatim instead of an empty list", () => {
    const encrypted = `0x${"cd".repeat(48)}`;
    const ddo = {
      id: "did:ope:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      chainId: 11_155_420,
      metadata: {
        type: "dataset",
        name: "Encrypted Dataset",
        description: "Encrypted description",
      },
      nft: {
        name: "Encrypted NFT",
        symbol: "ENC",
        tokenURI: "https://example.com/nft.json",
        owner: "0x0000000000000000000000000000000000000001",
      },
      datatokens: [{ address: "0xdatatoken", name: "ENC", symbol: "ENC" }],
      stats: { price: { value: 0 } },
      services: [
        {
          type: "access",
          datatokenAddress: "0xdatatoken",
          serviceEndpoint: "https://ocean-node.example.com",
          timeout: 0,
          files: encrypted,
        },
      ],
    };

    const { spec } = ddoToSpec(ddo);

    expect(spec.service.files).toBe(encrypted);
  });

  it("maps a legacy DDO and decodes JSON-encoded consumer parameter options", () => {
    const ddo = {
      id: "did:op:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      chainId: 32_456,
      metadata: {
        type: "algorithm",
        name: "Test Algorithm",
        author: "AgrospAI",
        description: "A test algorithm",
        tags: ["test"],
        license: "MIT",
        algorithm: {
          container: {
            image: "example/image",
            tag: "1.0.0",
            checksum: "sha256:abc",
            entrypoint: "python main.py",
          },
          language: "python",
          version: "1.0",
          consumerParameters: [
            {
              name: "format",
              type: "select",
              label: "Format",
              required: false,
              description: "Output format",
              default: "json",
              options: '[{"geojson":"GeoJSON"},{"json":"JSON"}]',
            },
          ],
        },
      },
      nft: {
        name: "Test NFT",
        symbol: "TEST",
        tokenURI: "https://example.com/nft.json",
        owner: "0x0000000000000000000000000000000000000001",
      },
      datatokens: [{ address: "0xdatatoken", name: "Test DT", symbol: "TDT" }],
      stats: { price: { value: 0 } },
      services: [
        {
          type: "compute",
          datatokenAddress: "0xdatatoken",
          serviceEndpoint: "https://provider.example.com",
          timeout: 0,
          files: [{ type: "url", url: "https://example.com/algorithm.py" }],
          compute: { allowNetworkAccess: false },
        },
      ],
    };

    const { spec, description } = ddoToSpec(ddo);

    expect(description).toBe("A test algorithm");
    expect(spec.metadata.did).toBe(ddo.id);
    expect(spec.metadata.network).toBe("PONTUSXDEV");
    expect(spec.metadata.algorithm?.consumerParameters?.[0].options).toEqual([
      { key: "geojson", value: "GeoJSON" },
      { key: "json", value: "JSON" },
    ]);
    expect(spec.service.files).toEqual([
      { method: "GET", type: "url", url: "https://example.com/algorithm.py" },
    ]);
    expect(spec.service.pricing).toEqual({ type: "free" });
    expect(spec.allowAlgorithmNetworkAccess).toBe(false);
  });

  it("normalizes a new data space stack Verifiable Credential", () => {
    const did =
      "did:ope:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const vc = {
      id: did,
      credentialSubject: {
        id: did,
        chainId: 11_155_420,
        nftAddress: "0xnft",
        metadata: {
          type: "algorithm",
          name: "Enhanced EDA",
          author: "Universitat de Lleida (UdL)",
          tags: ["agrospai", "eda"],
          description: {
            "@value": "Description from the VC",
            "@language": "en",
            "@direction": "ltr",
          },
          license: { name: "MIT" },
          links: {},
          additionalInformation: {},
          algorithm: {
            container: {
              image: "registry.example.com/eda",
              tag: "0.0.8",
              checksum: "sha256:abc",
              entrypoint: "ocean-execute --base-dir /data",
            },
            language: "python",
            version: "0.5",
            consumerParameters: [
              {
                name: "sensitive",
                type: "boolean",
                label: "Sensitive Data",
                required: true,
                description: "Whether to display sensitive data",
                default: "false",
              },
            ],
          },
        },
        services: [
          {
            id: "service-1",
            type: "compute",
            name: "Compute",
            datatokenAddress: "0xdatatoken",
            serviceEndpoint: "https://ocean-node.example.com",
            timeout: 0,
            state: 0,
            files: {
              files: [{ type: "url", url: "https://example.com/run.py" }],
            },
          },
        ],
        credentials: {
          allow: [{ type: "address", values: [{ address: "*" }] }],
          deny: [],
        },
        datatokens: [
          { address: "0xdatatoken", name: "Enhanced EDA", symbol: "E-EDA" },
        ],
      },
      indexedMetadata: {
        nft: {
          name: "Enhanced EDA",
          symbol: "E-EDA",
          tokenURI: "https://example.com/nft.json",
          owner: "0xD999bAaE98AC5246568FD726be8832c49626867D",
        },
        stats: [
          {
            datatokenAddress: "0xdatatoken",
            symbol: "E-EDA",
            prices: [{ type: "dispenser", price: "0" }],
          },
        ],
      },
    };

    const { spec, description } = ddoToSpec(normalizeVcDdo(vc));

    expect(description).toBe("Description from the VC");
    expect(spec.metadata.did).toBe(did);
    expect(spec.metadata.network).toBe("OP_SEPOLIA");
    expect(spec.metadata.license).toBe("MIT");
    expect(spec.metadata.owner).toBe(
      "0xD999bAaE98AC5246568FD726be8832c49626867D",
    );
    expect(spec.metadata.links).toBeUndefined();
    expect(spec.metadata.additionalInformation).toBeUndefined();
    expect(spec.metadata.algorithm?.container.image).toBe(
      "registry.example.com/eda",
    );
    expect(spec.metadata.algorithm?.container.tag).toBe("0.0.8");
    expect(spec.credentials).toEqual({ allow: ["*"] });
    expect(spec.allowAlgorithmNetworkAccess).toBe(false);
    expect(spec.service.files).toEqual([
      { method: "GET", type: "url", url: "https://example.com/run.py" },
    ]);
    expect(spec.service.datatoken).toEqual({
      name: "Enhanced EDA",
      symbol: "E-EDA",
    });
  });
});
