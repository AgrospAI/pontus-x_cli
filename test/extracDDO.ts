const ddo = {
    "metadata": {
        "license": "MIT",
        "author": "Universitat de Lleida (UdL)",
        "created": "2024-11-21T22:15:41Z",
        "name": "Exploratory Data Analysis",
        "description": "Generate an **Exploratory Data Analysis** (EDA) report for the input tabular data.\n\nThe input data is loaded using [**pandas**](https://pandas.pydata.org) and then the EDA report is generated using [**pandas-profiling**](https://ydata-profiling.ydata.ai). The HTML version of the report can be downloaded when the algorithm finishes.\n\nThe report includes the following information:\n\n### Data Quality Alerts\n\n![Data Quality Alerts](https://docs.profiling.ydata.ai/latest/_static/img/warnings_section.png)\n\n### Univariate Profiling\n\n![Univariate Profiling](https://docs.profiling.ydata.ai/latest/_static/img/univariate_profiling.png)\n\n### Multivariate Profiling\n\n![Multivariate Profiling](https://docs.profiling.ydata.ai/latest/_static/img/multivariate_profiling.png)\n\n\n\n",
        "type": "algorithm",
        "updated": "2024-11-21T22:15:41Z",
        "tags": [
            "eda",
            "exploratory data analysis",
            "profiling",
            "tabular-data",
            "pandas",
            "agrospai",
            "udl"
        ],
        "algorithm": {
            "container": {
                "image": "rogargon/pandas-profiling",
                "entrypoint": "python $ALGO",
                "checksum": "sha256:105d404c9b00438c08c2199d5356fcd17d7349cff514c923d066ced56d9baa93",
                "tag": "4.9.0"
            },
            "language": "python",
            "version": "0.2"
        }
    },
    "credentials": {
        "allow": [],
        "deny": []
    },
    "datatokens": [
        {
            "symbol": "UDL-EDA",
            "address": "0x322E534ADF50Afd38A14D7b632fb00B44F87afd8",
            "name": "UdL EDA Algo",
            "serviceId": "2879b33a3423ff33815ee5ca2e1a090c0083ebe2c6f4d6897f78d8d7775b57eb"
        }
    ],
    "services": [
        {
            "files": "0x04df563f1f14f021dd1f1cf102e74206e046ddca619dfa31f3095b283659b7b8d7101506eb7e4e4fd0467555c836e2174461305d9d930c72225b3a7a8a8fb9c7dba67115d3be05d17999110aa6705e3a6dd93bf665c764fecbf8d4e574c42eaa70e866948bc7b95106f08ccd40d0c9c91e799deadabf892287975480480c2759dea0bc70b7ae8a5a59a267f6321ccaf143cfc96d56f2c8a46050366267b2769c71ae14a8e3da2f41695854589dd5d679d1bd9097fd22e7050f1a678bb91fa9667b2e379eec91fc6d7df7709470bd8cf802f726b92d062f267bf2d9621a3417a5d098ef6ca2fc7d42d9dc9cfe2d65616f95bae4872ed860fed27f3ff7d350c95033cbd4e8b456f7480f65a91aa5dc1234d43af061085f28d6f8168eeb40e8eac35a9122170b30253ab1d9227fd697697f3288ccf8671d77cab96473047dedcce4b95e796498d76a7c64d4144000",
            "id": "2879b33a3423ff33815ee5ca2e1a090c0083ebe2c6f4d6897f78d8d7775b57eb",
            "datatokenAddress": "0x322E534ADF50Afd38A14D7b632fb00B44F87afd8",
            "serviceEndpoint": "https://provider.agrospai.udl.cat",
            "type": "access",
            "timeout": 0
        }
    ],
    "@context": [
        "https://w3id.org/did/v1"
    ],
    "version": "4.1.0",
    "nftAddress": "0x87ECD39C3F5117fE1EC24a5AaB334C31Db2ed448",
    "chainId": 32457,
    "stats": {
        "price": {
            "value": 0
        },
        "orders": 3,
        "allocated": 0
    },
    "purgatory": {
        "state": false
    },
    "id": "did:op:80d669824854177e42fe4e23f42ba5f7e9823d8ac6f9f224fec157e25d5f04da",
    "event": {
        "datetime": "2024-11-21T22:15:45",
        "tx": "0x64af736b0ac68fc5f9167d58c719e675df07fd9c3a7b05a6fc95f37fb911a369",
        "contract": "0x87ECD39C3F5117fE1EC24a5AaB334C31Db2ed448",
        "block": 2727272,
        "from": "0xD999bAaE98AC5246568FD726be8832c49626867D"
    },
    "nft": {
        "owner": "0xD999bAaE98AC5246568FD726be8832c49626867D",
        "symbol": "UDL-EDA",
        "address": "0x87ECD39C3F5117fE1EC24a5AaB334C31Db2ed448",
        "tokenURI": "https://docs.profiling.ydata.ai/latest/_static/img/multivariate_profiling.png",
        "created": "2024-11-21T22:15:45",
        "name": "UdL EDA Algo",
        "state": 0
    },
    "accessDetails": {
        "templateId": 2,
        "publisherMarketOrderFee": "0",
        "type": "free",
        "addressOrId": "0x322e534adf50afd38a14d7b632fb00b44f87afd8",
        "price": "0",
        "isPurchasable": true,
        "datatoken": {
            "address": "0x322e534adf50afd38a14d7b632fb00b44f87afd8",
            "name": "UdL EDA Algo",
            "symbol": "UDL-EDA"
        }
    }
};

function extractAssetFromDDO() {
   // const access: any = ddo.services.filter((s: any) => s.type = 'access').shift();
    console.log(__dirname);
    const templateFile = require.resolve('../src/gaia-x_compliance/generate-asset-credentials/templates/service.hbs');

    const chainId = ddo.chainId;
    const network = ddo.chainId === 32456 ? 'devnet' : 'testnet';
    const did = ddo.id;
    const service_name = ddo.metadata.name;
    const service_description = ddo.metadata.description;
    const owner_account = ddo.nft.owner;
    const service_type = ddo.services[0].type;
    const service_timeout = ddo.services[0].timeout === 0 ? 'unlimited' : ddo.services[0].timeout;
    const nft_address = ddo.nftAddress;
    const token_name = ddo.accessDetails.datatoken.name;
    const token_symbol = ddo.accessDetails.datatoken.symbol;
    const token_address = ddo.accessDetails.datatoken.address;
    const service_price = ddo.accessDetails.price;
    const service_endpoint = ddo.services[0].serviceEndpoint;

    console.log(service_name)
}

extractAssetFromDDO()
