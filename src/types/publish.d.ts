import type {
  FileTypes,
  NftCreateDataWithoutOwner,
  PricingConfig,
  ServiceFileType,
  ServiceTypes,
  TrustedAlgorithmAsset,
} from "@deltadao/nautilus";
import type {
  ConsumerParameter,
  Metadata,
  MetadataAlgorithm,
} from "@oceanprotocol/ddo-js";

type ExtendedConsumerParameter = Omit<ConsumerParameter, "options"> & {
  options?: { [value: string]: string }[];
};

type MetadataConfig = Omit<
  Metadata,
  "algorithm" | "author" | "created" | "updated"
> & {
  algorithm?: MetadataAlgorithm & {
    consumerParameters?: ExtendedConsumerParameter[];
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
