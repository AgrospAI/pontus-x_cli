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

/**
 * One service of an asset.
 *
 * Compute settings live here (instead of only at the top level of the spec) so
 * an asset with several services can carry different trusted algorithms,
 * publishers and network-access flags per compute service. When omitted, the
 * top-level `allowAlgorithmNetworkAccess` / `trustedAlgorithms` /
 * `trustedAlgorithmPublishers` / `trustOwnerAlgorithms` act as defaults for
 * every service.
 */
export type ServiceConfig = {
  /** Per-service address allow/deny list. Asset-wide lists go in the top-level `credentials`. */
  credentials?: {
    allow?: string[];
    deny?: string[];
  };
  consumerParameters?: ExtendedConsumerParameter[];
  datatoken: {
    name: string;
    symbol: string;
  };
  /** Human-readable service name, shown by portals. Editable on an existing asset. */
  name?: string;
  /** Presentational service title. Editable on an existing asset. */
  displayName?: string;
  /**
   * Target service id, for `publish --update`. Matching is by `serviceType` when
   * omitted. Service ids change when the service's files are re-encrypted.
   */
  serviceId?: string;
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
} & ComputeConfig;

export type ComputeConfig = {
  allowAlgorithmNetworkAccess?: boolean;
  trustedAlgorithmPublishers?: string[];
  trustedAlgorithms?: TrustedAlgorithmAsset[];
  trustOwnerAlgorithms?: boolean;
};

export default interface PublishConfig {
  /**
   * Default for every service that does not declare its own value.
   * @deprecated Set it on the compute service instead.
   */
  allowAlgorithmNetworkAccess?: boolean;
  credentials?: {
    allow?: string[];
    deny?: string[];
  };
  metadata: MetadataConfig;
  nftData: NftCreateDataWithoutOwner;
  /**
   * Single-service shorthand. Use `services` for assets with more than one
   * service; exactly one of `service` / `services` must be present.
   */
  service?: ServiceConfig;
  /** Multi-service form. Each entry becomes one service on the same asset. */
  services?: ServiceConfig[];
  /** Default for every service that does not declare its own value. */
  trustedAlgorithmPublishers?: string[];
  /** Default for every service that does not declare its own value. */
  trustedAlgorithms?: TrustedAlgorithmAsset[];
  /** Default for every service that does not declare its own value. */
  trustOwnerAlgorithms?: boolean;
}
