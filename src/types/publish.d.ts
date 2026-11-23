import type {
  AlgorithmV5,
  AssetState,
  RemoteObject,
  License,
  RequestCredential,
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
  license?: string | License;
  contentLanguage?: string;
  contentDirection?: string;
  links?: string[] | Record<string, string>;
  network?: string;
  owner?: string;
  providedBy?: string;
};

export type PricingType = PricingConfig["type"];

export interface ComputeConfig {
  allowAlgorithmNetworkAccess?: boolean;
  allowRawAlgorithms?: boolean;
  trustedAlgorithmPublishers?: string[];
  trustedAlgorithms?: TrustedAlgorithmAsset[];
  trustOwnerAlgorithms?: boolean;
}

export interface CredentialsConfig {
  allow?: string[];
  deny?: string[];
  requestCredentials?: {
    allow?: RequestCredential[];
    deny?: RequestCredential[];
  };
}

export interface ServiceConfig extends ComputeConfig {
  /** Target service for publish --update; otherwise match by service type. */
  serviceId?: string;
  name?: string;
  displayName?: string;
  description?: string;
  state?: AssetState;
  credentials?: CredentialsConfig;
  additionalInformation?: Record<string, string | number | boolean>;
  dataSchema?: RemoteObject;
  inputSchema?: RemoteObject;
  outputSchema?: RemoteObject;
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
}

interface PublishConfigBase extends ComputeConfig {
  credentials?: CredentialsConfig;
  lifecycleState?: AssetState;
  metadata: MetadataConfig;
  nftData: NftCreateDataWithoutOwner;
}

/** Exactly one service declaration; legacy singular manifests remain supported. */
export type PublishConfig = PublishConfigBase &
  (
    | { service: ServiceConfig; services?: never }
    | { service?: never; services: [ServiceConfig, ...ServiceConfig[]] }
  );
export default PublishConfig;
