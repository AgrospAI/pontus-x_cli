import axios, { type AxiosResponse } from "axios";

export type AssetInfo = {
  did: string;
  name: string;
  owner: string;
  created: string;
  chainId: number;
};

export async function getAssetsFromDids(dids: string[]): Promise<AssetInfo[]> {
  const assets = await Promise.all(
    dids.map(async (did) => {
      const asset = await getAssetInfo(did);

      if (!asset) {
        console.error(`Asset with DID ${did} not found.`);
        return null;
      }

      return asset;
    }),
  );

  const validAssets = assets.filter(
    (asset): asset is AssetInfo => asset !== null,
  );

  return validAssets;
}

export async function getAssetInfo(
  did: string,
  metadataCacheUri: string = "https://aquarius.pontus-x.eu",
): Promise<AssetInfo> {
  const didWithoutPrefix = did.startsWith("did:op:") ? did.slice(7) : did;

  const didWithPrefix = did.startsWith("did:op:") ? did : `did:op:${did}`;

  const query = {
    from: 0,
    size: 1,
    query: {
      bool: {
        should: [
          { term: { id: didWithoutPrefix } },
          { term: { id: didWithPrefix } },
        ],
        minimum_should_match: 1,
      },
    },
  };

  try {
    const response: AxiosResponse<any> = await axios.post(
      `${metadataCacheUri}/api/aquarius/assets/query`,
      query,
    );

    const hits = response.data?.hits?.hits ?? [];

    if (hits.length === 0) {
      throw new Error(`Asset with DID ${did} not found.`);
    }

    const hit = hits[0];

    return {
      did: hit._source.id,
      name: hit._source.metadata?.name,
      owner: hit._source.event?.from,
      created: hit._source.metadata?.created,
      chainId: hit._source.chainId,
    };
  } catch (error: any) {
    throw new Error(
      `Error fetching asset info for DID ${did}: ${error.message}`,
    );
  }
}

interface SearchAssetsParams {
  chainIds?: number[];
  assetTypes?: string[];
  accessTypes?: string[];
  tagSets?: string[][];
  metadataCacheUri?: string;
  owners?: string[];
  searchText?: string;
  signal?: AbortSignal;
}

export async function searchAssets({
  chainIds = [32_456, 32_457],
  tagSets = [],
  assetTypes = ["algorithm", "dataset"],
  accessTypes = ["compute", "access"],
  metadataCacheUri = "https://aquarius.pontus-x.eu",
  owners = [],
  searchText = "",
  signal = new AbortController().signal,
}: SearchAssetsParams): Promise<AssetInfo[]> {
  const query: any = {
    from: 0,
    size: 100,
    query: {
      bool: {
        must: [],
        filter: [],
      },
    },
  };

  if (chainIds?.length) {
    query.query.bool.filter.push({
      terms: {
        chainId: chainIds,
      },
    });
  }

  if (assetTypes?.length) {
    query.query.bool.filter.push({
      terms: {
        "metadata.type": assetTypes, // OR between types
      },
    });
  }

  if (accessTypes?.length) {
    query.query.bool.filter.push({
      terms: {
        "services.type": accessTypes, // OR between types
      },
    });
  }

  if (tagSets?.length) {
    query.query.bool.filter.push({
      bool: {
        should: tagSets.map((tagSet) => ({
          bool: {
            must: tagSet.map((tag) => ({
              term: {
                "metadata.tags": tag,
              },
            })),
          },
        })),
        minimum_should_match: 1, // OR between tagSets
      },
    });
  }

  if (owners?.length) {
    query.query.bool.filter.push({
      terms: {
        "event.from": owners, // OR between owners
      },
    });
  }

  if (searchText) {
    query.query.bool.must.push({
      match: {
        "metadata.name": {
          query: searchText,
          fuzziness: "AUTO",
          operator: "and",
        },
      },
    });
  }

  try {
    const response: AxiosResponse<any> = await axios.post(
      `${metadataCacheUri}/api/aquarius/assets/query`,
      query,
      {
        signal,
      },
    );
    const hits = response.data?.hits?.hits ?? [];
    const assets = hits.map((hit: any) => ({
      did: hit._source.id,
      name: hit._source.metadata?.name,
      owner: hit._source.event?.from,
      created: hit._source.metadata?.created,
      chainId: hit._source.chainId,
    }));
    return assets;
  } catch (error: any) {
    if (!axios.isCancel(error)) {
      console.error("Error fetching assets:", error.message);
    }
    return [];
  }
}

const knownAddresses: Record<string, any> = {};

async function initKnownAddresses() {
  if (Object.keys(knownAddresses).length > 0) {
    return; // Already initialized
  }

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/AgrospAI/mvg-portal/refs/heads/main/pontusxAddresses.json",
    );
    if (!response.ok) {
      console.error("Failed to fetch known addresses:", response.statusText);
      return;
    }

    const result = await response.json();
    for (const [key, value] of Object.entries(result)) {
      knownAddresses[key.toLowerCase()] = value;
    }
  } catch (error) {
    console.error("Error fetching known addresses:", error);
  }
}

export async function getKnownAddresses(): Promise<Record<string, any>> {
  await initKnownAddresses();
  return knownAddresses;
}

export interface Publisher {
  name: string;
  address: string;
}

export async function getAddressesNames(
  addresses: string[],
): Promise<Publisher[]> {
  const knownAddresses = await getKnownAddresses();
  return addresses.map((address) => ({
    address,
    name: knownAddresses[address.toLowerCase()] || "-",
  }));
}

export async function getOwnerName(address: string): Promise<string> {
  const knownAddresses = await getKnownAddresses();
  return knownAddresses[address.toLowerCase()] || "-";
}

export async function getAssetName(
  did: string,
  chainIds: number[],
  metadataCacheUri: string,
): Promise<null | string> {
  const didWithoutPrefix = did.startsWith("did:op:") ? did.slice(7) : did;

  const query = {
    from: 0,
    query: {
      bool: {
        filter: [{ terms: { chainId: chainIds } }],
        minimum_should_match: 1,
        should: [{ term: { id: did } }, { term: { id: didWithoutPrefix } }],
      },
    },
    size: 1,
  };

  try {
    const response = await axios.post(
      `${metadataCacheUri}/api/aquarius/assets/query`,
      query,
    );

    const hits = response.data?.hits?.hits ?? [];
    return hits.length > 0 ? hits[0]._source.metadata?.name || null : null;
  } catch (error: any) {
    console.error(`Error fetching asset name for DID ${did}:`, error.message);
    return null;
  }
}
