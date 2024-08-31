import { readFileSync } from 'fs';
import { AssetBuilder } from '@deltadao/nautilus'
import { ServiceFileType } from '@deltadao/nautilus'
import { FileTypes, ServiceTypes, ServiceBuilder } from '@deltadao/nautilus'

const publish = async (folder: string, connection: any, provider: string, dryRun: boolean) => {
    const assetBuilder = new AssetBuilder();
    assetBuilder.setType('algorithm')
        .setName('Exploratory Data Analysis')
        .setAuthor('Universitat de Lleida (UdL)')
        .setOwner(connection.wallet.address)
        .setDescription(readFileSync(`${folder}/description.md`, 'utf8'))
        .addTags(['eda', 'exploratory data analysis', 'profiling', 'tabular-data', 'pandas', 'udl'])
        .setLicense('MIT')
        .setNftData({
            name: 'UdL EDA Algo',
            symbol: 'UDL-EDA',
            templateIndex: 1,
            tokenURI: 'https://docs.profiling.ydata.ai/latest/_static/img/multivariate_profiling.png',
            transferable: false
        });
    const algoMetadata = {
        language: 'python',
        version: '0.2',
        container: {
            entrypoint: 'python $ALGO',
            image: 'rogargon/pandas-profiling',
            tag: '4.9.0',
            checksum: 'sha256:105d404c9b00438c08c2199d5356fcd17d7349cff514c923d066ced56d9baa93'
        }
    };
    assetBuilder.setAlgorithm(algoMetadata);
    const serviceBuilder =
        new ServiceBuilder({serviceType: ServiceTypes.ACCESS, fileType: FileTypes.URL});
    const urlFile: ServiceFileType<FileTypes> = {
        type: 'url',
        url: 'https://raw.githubusercontent.com/rogargon/ocean-algo/eda/eda.py',
        method: 'GET'
    };
    const service = serviceBuilder
        .setServiceEndpoint(provider) // the access controller to be in control of this asset
        .setTimeout(0) // Timeout in seconds (0 means unlimited access after purchase)
        .addFile(urlFile)
        .setPricing(connection.pricingConfig.fixedRateEUROe(0))
        .setDatatokenNameAndSymbol('UdL EDA Algo', 'UDL-EDA')
        .build();
    assetBuilder.addService(service);
    const asset = assetBuilder.build();
    console.log(`Asset metadata: \n ${JSON.stringify(asset, null, 2)}`);

    if (!dryRun) {
        console.log(`Publishing asset...`);
        const result = await connection.nautilus.publish(asset);
        console.log(`Asset published, ` +
            `transaction: ${connection.networkConfig.explorerUri}/tx/${result.setMetadataTxReceipt.transactionHash}\n`);
    } else {
        console.log('\nDry run completed. Asset not published.\n');
    }
};
