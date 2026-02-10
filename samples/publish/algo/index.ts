import { readFileSync } from "node:fs";
import {
  AssetBuilder,
  FileTypes,
  ServiceBuilder,
  type ServiceFileType,
  ServiceTypes,
} from "@deltadao/nautilus";

export const publish = async (
  folder: string,
  connection: any,
  provider: string,
  dryRun: boolean,
) => {
  const assetBuilder = new AssetBuilder();
  assetBuilder
    .setType("algorithm")
    .setName("Exploratory Data Analysis")
    .setAuthor("Universitat de Lleida (UdL)")
    .setOwner(connection.wallet.address)
    .setDescription(readFileSync(`${folder}/description.md`, "utf8"))
    .addTags([
      "eda",
      "exploratory data analysis",
      "profiling",
      "tabular-data",
      "pandas",
      "agrospai",
      "udl",
    ])
    .setLicense("MIT")
    .setNftData({
      name: "UdL EDA Algo",
      symbol: "UDL-EDA",
      templateIndex: 1,
      tokenURI:
        "https://docs.profiling.ydata.ai/latest/_static/img/multivariate_profiling.png",
      transferable: false,
    });
  const algoMetadata = {
    container: {
      image: "rogargon/pandas-profiling",
      tag: "4.16",
      checksum:
        "sha256:81dca5439f07dff4d56097546a9fce7335be3de8e2622dc105c64e54376f86b5",
      entrypoint: "python /algorithm/src/main.py",
    },
    language: "python",
    version: "0.2",
  };
  assetBuilder.setAlgorithm(algoMetadata);
  const serviceBuilder = new ServiceBuilder({
    fileType: FileTypes.URL,
    serviceType: ServiceTypes.COMPUTE,
  });
  const urlFile: ServiceFileType<FileTypes> = {
    method: "GET", // HTTP request method
    type: "url", // there are multiple supported data source types, see https://docs.oceanprotocol.com/developers/storage
    url: "https://raw.githubusercontent.com/rogargon/ocean-algo/eda/eda.py",
    // headers: {
    //     Authorization: 'Basic XXX' // optional headers field e.g. for basic access control
    // }
  };
  const service = serviceBuilder
    .setServiceEndpoint(provider) // the access controller to be in control of this asset
    .setTimeout(0) // Timeout in seconds (0 means unlimited access after purchase)
    .addFile(urlFile)
    .setPricing(connection.pricingConfig.fixedRateEURAU(0))
    .setDatatokenNameAndSymbol("UdL EDA Algo", "UDL-EDA")
    .build();
  assetBuilder.addService(service);
  const asset = assetBuilder.build();
  console.log(`Asset metadata: \n ${JSON.stringify(asset, null, 2)}`);

  if (dryRun) {
    console.log("\nDry run completed. Asset not published.\n");
  } else {
    console.log(`Publishing asset...`);
    const result = await connection.nautilus.publish(asset);
    console.log(
      `Asset published, ` +
        `transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`,
    );
  }
};
