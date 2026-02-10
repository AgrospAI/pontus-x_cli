import axios, { type AxiosResponse } from "axios";

type DatasetInfo = {
  did: string;
  name: string;
};

export async function GetDatasetsByTags(
  tags: string[],
  chainIds: number[] = [32_456, 32_457],
  metadataCacheUri: string = "https://aquarius.pontus-x.eu",
): Promise<DatasetInfo[]> {
  const query = {
    from: 0,
    query: {
      bool: {
        filter: [
          {
            terms: {
              chainId: chainIds,
            },
          },
        ],
        must: tags.map((tag) => ({
          term: {
            "metadata.tags": tag,
          },
        })),
      },
    },
    size: 100,
  };

  try {
    const response: AxiosResponse<any> = await axios.post(
      `${metadataCacheUri}/api/aquarius/assets/query`,
      query,
    );
    const hits = response.data?.hits?.hits ?? [];
    return hits.map((hit: any) => ({
      did: hit._source.id,
      name: hit._source.metadata?.name,
    }));
  } catch (error: any) {
    console.error("Error fetching datasets by tags:", error.message);
    return [];
  }
}

export async function GetAssetName(
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
