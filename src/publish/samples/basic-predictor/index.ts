import { readFileSync } from "fs";
import {
  AssetBuilder,
  ConsumerParameterBuilder,
  MetadataConfig,
} from "@deltadao/nautilus";
import { FileTypes, ServiceTypes, ServiceBuilder } from "@deltadao/nautilus";

import { ConsumerParameter } from "@oceanprotocol/lib";

const publish = async (
  folder: string,
  connection: any,
  provider: string,
  dryRun: boolean
) => {

  // ALGORITHM USER INPUT DATA
  const consumerParametersBuilder = new ConsumerParameterBuilder();
  const consumerParameters: ConsumerParameter[] = [];

  consumerParameters.push(
    consumerParametersBuilder
      .setName("dataset")
      .setLabel("dataset")
      .setDescription(
        "Dataset parameters to train the model with, such as: separator, target_column, split, random_state and stratify."
      )
      .setDefault(
        JSON.stringify(
          JSON.parse(readFileSync(`${folder}/dataset-default.json`, "utf8"))
        )
      )
      .setRequired(true)
      .setType("text")
      .build()
  );

  consumerParametersBuilder.reset(); // Reset the builder to create a new parameter

  consumerParameters.push(
    consumerParametersBuilder
      .setName("model")
      .setLabel("model")
      .setDescription(
        "Model parameters to train the model with, such as: name, params and metrics."
      )
      .setDefault(
        JSON.stringify(
          JSON.parse(readFileSync(`${folder}/model-default.json`, "utf8"))
        )
      )
      .setRequired(true)
      .setType("text")
      .build()
  );

  // ALGORITHM METADATA
  const algoMetadata: MetadataConfig["algorithm"] = {
    language: "python",
    version: "0.3",
    container: {
      entrypoint: "python $ALGO",
      // entrypoint: "sleep infinity",
      image: "clopezgarcia/basic-predictor",
      tag: "0.2.2",
      checksum:
        "sha256:b4b24cce742d43329b6cc458770f7be87f13bba4349f5acfc466441f143dc27c",
    },
    consumerParameters: consumerParameters,
  };

  const service = new ServiceBuilder({ serviceType: ServiceTypes.COMPUTE, fileType: FileTypes.URL })
    .setServiceEndpoint(provider) // the access controller to be in control of this asset
    .setTimeout(0) // Timeout in seconds (0 means unlimited access after purchase)
    .addFile({
      type: "url", // there are multiple supported data source types, see https://docs.oceanprotocol.com/developers/storage
      url: "https://raw.githubusercontent.com/AgrospAI/ocean-algo/refs/heads/main/basic-predictor/algorithm/src/main.py",
      method: "GET", // HTTP request method
      // headers: {
      //     Authorization: 'Basic XXX' // optional headers field e.g. for basic access control
      // }
    })
    .setPricing(connection.pricingConfig.fixedRateEUROe(0))
    .setDatatokenNameAndSymbol("UdL scikit-learn model trainer", "UDL-SKLEARN")
    .build();

  const asset = new AssetBuilder()
    .setType("algorithm")
    .setName("Debugger SciKit-Learn Model Trainer")
    .setAuthor("Universitat de Lleida (UdL)")
    .setOwner(connection.wallet.address)
    .setDescription(readFileSync(`${folder}/description.md`, "utf8"))
    .addTags(["ml", "debug", "sklearn", "scikit-learn", "tabular-data", "pandas", "udl"])
    .setLicense("MIT")
    .setNftData({
      name: "UdL scikit-learn model trainer",
      symbol: "UDL-SKLEARN",
      templateIndex: 1,
      tokenURI:
        "https://scikit-learn.org/stable/_static/scikit-learn-logo-small.png",
      transferable: false,
    })
    .setAlgorithm(algoMetadata)
    .addService(service)
    .build();

  console.log(`Asset metadata: \n ${JSON.stringify(asset, null, 2)}`);

  if (!dryRun) {
    console.log(`Publishing asset...`);
    const result = await connection.nautilus.publish(asset);
    console.log(
      `Asset published, ` +
      `transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`
    );
  } else {
    console.log("\nDry run completed. Asset not published.\n");
  }
};
