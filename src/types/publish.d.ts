import type {
  FileTypes,
  NftCreateDataWithoutOwner,
  PricingConfig,
  ServiceFileType,
  ServiceTypes,
  TrustedAlgorithmAsset,
} from "@deltadao/nautilus";
import type {
  Metadata,
  MetadataAlgorithm
} from "@oceanprotocol/ddo-js";

type Options = {
  key: string,
  value: string,
};

export type ExtendedConsumerParameter = {
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select';
    label: string;
    required: boolean;
    description: string;
    default: string;
    options?: Options[];
};

type MetadataConfig = Omit<
  Metadata,
  "algorithm" | "author" | "created" | "updated"
> & {
  algorithm?: Omit<MetadataAlgorithm, "consumerParameters" | "container"> & {
    consumerParameters?: ExtendedConsumerParameter[];
    container: Omit<MetadataAlgorithm["container"], "consumerParameters"> & {
      consumerParameters?: ExtendedConsumerParameter[];
    }
  };
  author?: string;
  did?: string;
  network?: string;
  owner?: string;
};

export type PricingType = PricingConfig["type"];

export default interface PublishConfig {
  allowAlgorithmNetworkAccess?: boolean;
  credentials?: {
    allow?: string[];
    deny?: string[];
  };
  metadata: MetadataConfig;
  nftData: NftCreateDataWithoutOwner;
  service: {
    consumerParameters?: ExtendedConsumerParameter[];
    datatoken: {
      name: string;
      symbol: string;
    };
    files: ServiceFileType[];
    fileType: FileTypes;
    pricing: {
      amount?: number;
      currency?: "EURAU" | "EUROe" | "OCEAN";
      type: "fixed" | "free";
    };
    serviceEndpoint: string;
    serviceType: ServiceTypes;
    timeout: number;
  };
  trustedAlgorithmPublishers?: string[];
  trustedAlgorithms?: TrustedAlgorithmAsset[];
  trustOwnerAlgorithms?: boolean;
}
