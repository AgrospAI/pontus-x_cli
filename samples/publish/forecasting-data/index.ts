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
    .setType("dataset")
    .setName("Timeseries Forecasting Testing Dataset")
    .setAuthor("sudipmanchare")
    .setOwner(connection.wallet.address)
    .setDescription(readFileSync(`${folder}/description.md`, "utf8"))
    .addTags(["forecasting", "sample", "agrospai", "udl", "tabular-data"])
    .setLicense("CC-BY-4.0")
    .setNftData({
      name: "Timeseries Forecasting Dataset",
      symbol: "TFD",
      templateIndex: 1,
      tokenURI:
        "https://www.veeqo.com/_next/image?url=https%3A%2F%2Fimages.ctfassets.net%2Fhfb264dqso7g%2F4QovdfnQYcBgP0X4PN0QfM%2F6313238ef1c4def0614eb43b209bbf5b%2Fdemand-forecasting.jpg&w=2560&q=75",
      transferable: false,
    })
    .addLinks([
      "https://www.kaggle.com/api/v1/datasets/download/sudipmanchare/simulated-sales-data-with-timeseries-features",
    ]);

  const serviceBuilder = new ServiceBuilder({
    fileType: FileTypes.URL,
    serviceType: ServiceTypes.COMPUTE,
  });
  const urlFile: ServiceFileType<FileTypes> = {
    method: "GET", // HTTP request method
    type: "url", // there are multiple supported data source types, see https://docs.oceanprotocol.com/developers/storage
    url: "https://www.kaggle.com/api/v1/datasets/download/sudipmanchare/simulated-sales-data-with-timeseries-features",
    // headers: {
    //     Authorization: 'Basic XXX' // optional headers field e.g. for basic access control
    // }
  };
  const service = serviceBuilder
    .setServiceEndpoint(provider) // the access controller to be in control of this asset
    .setTimeout(0) // Timeout in seconds (0 means unlimited access after purchase)
    .addFile(urlFile)
    .addTrustedAlgorithmPublisher(connection.wallet.address)
    // .addTrustedAlgorithms([{ did: 'did:op:c1e39404719ee92613b3bf9c276bbdcd63473c1189b34cef9f3de22cdb8eaf53' }])
    .allowAlgorithmNetworkAccess(false)
    .setPricing(connection.pricingConfig.fixedRateEURAU(0))
    .setDatatokenNameAndSymbol(`Timeseries Forecasting Dataset`, `TFD`)
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
