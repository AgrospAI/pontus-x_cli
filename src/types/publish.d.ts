import type {
  AlgorithmV5,
  FileTypes,
  MetadataV5,
  NftCreateDataWithoutOwner,
  PricingConfig,
  ServiceFileType,
  ServiceTypes,
  TrustedAlgorithmAsset,
  UrlFileObject,
} from "@deltadao/nautilus";

type Options = {
  key: string;
  value: string;
};

export type ExtendedConsumerParameter = {
  name: string;
  type: "text" | "number" | "boolean" | "select";
  label: string;
  required: boolean;
  description: string;
  default: string;
  options?: Options[];
};

type MetadataConfig = Omit<
  MetadataV5,
  | "algorithm"
  | "author"
  | "created"
  | "updated"
  | "description"
  | "copyrightHolder"
  | "providedBy"
  | "license"
  | "links"
  | "additionalInformation"
> & {
  additionalInformation?: Record<string, any>;
  algorithm?: Omit<
    NonNullable<AlgorithmV5>,
    "consumerParameters" | "container"
  > & {
    consumerParameters?: ExtendedConsumerParameter[];
    container: Omit<
      NonNullable<AlgorithmV5>["container"],
      "consumerParameters"
    > & {
      consumerParameters?: ExtendedConsumerParameter[];
    };
  };
  author?: string;
  copyrightHolder?: string;
  description: string;
  did?: string;
  license?: string;
  links?: string[] | Record<string, string>;
  network?: string;
  owner?: string;
  providedBy?: string;
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
    files: (ServiceFileType<FileTypes> | UrlFileObject)[];
    fileType: FileTypes;
    pricing: {
      amount?: number;
      currency?: "EURAU" | "EUROe" | "OCEAN" | "devEURAU";
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
