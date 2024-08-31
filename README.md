# Pontus-X CLI

Command Line Interface for the Pontus-X Data Space Ecosystem.

## Installation

```shell
npm install -g pontus-x_cli
```

Then, create a `.env` file in your working directory with the network to be used, for instance, PONTUSXDEV or PONTUSXTEST:

```
NETWORK=PONTUSXDEV
```

## Currently available commands

### export-private-key

Export your private key as a JSON file, to use later with the login command or for Pontus-X portals automation. More details at [export-key-as-json](./src/export-key-as-json/README.md)

### login \<keyFile.json>

Login to retrieve your private key from a JSON key store and store it in .env:
    
```shell
pontus-x_cli login 62078f05eb4450272d7e492f3660835826906822.json
```

### logout

Logout to remove your private key from .env file:

```shell
pontus-x_cli logout
```

### get \<did>

Get the available metadata to the asset with the given DID:

```shell
pontus-x_cli get did:op:34d5f73d77550843201ee1a43ad9d404d3e557ed6a70772e9afde7a27d863b8f
```

### access \<did>

Access a downloadable asset (either a dataset or algorithm) given its DID:

```shell
pontus-x_cli access did:op:34d5f73d77550843201ee1a43ad9d404d3e557ed6a70772e9afde7a27d863b8f
```

### revoke \<did>

Publisher revocation of an owned DID

```shell
pontus-x_cli revoke did:op:052eb04066d696a27430116676c859c6303d82257c7a0ebda51f4e80363f6bca
```

### self-description \<did> \<sdurl>

Associate Gaia-X Self-Description to the asset with the given DID

Edit a DID metadata to link it to a Gaia-X Self Description available from the provided URL (it should be compliant with the configured Gaia-X Digital Clearing House, for instance https://compliance.lab.gaia-x.eu/v1-staging/docs):

```shell
pontus-x_cli self-description did:op:34d5f73d77550843201ee1a43ad9d404d3e557ed6a70772e9afde7a27d863b8f https://angliru.udl.cat/.well-known/2210_serviceOffering-eda.json
```

### change-price \<did> \<newPrice>

Change the price keeping the existing currency for an asset with the given DID

Edit the price of an existing DID, keeping the current currency:

```shell
pontus-x_cli change-price did:op:34d5f73d77550843201ee1a43ad9d404d3e557ed6a70772e9afde7a27d863b8f 0.1
```

### edit-algo \<did> \<image> \<tag> \<checksum>

Change the container metadata for a given algorithm DID:

```shell
pontus-x_cli edit-algo did:op:34d5f73d77550843201ee1a43ad9d404d3e557ed6a70772e9afde7a27d863b8f rogargon/pandas-profiling 4.9.0 sha256:105d404c9b00438c08c2199d5356fcd17d7349cff514c923d066ced56d9baa93
```

### edit-trusted-algos \<did> \<algos...>

Overwrite the trusted algorithms for a data asset to the provided algorithm DIDs:

```shell
pontus-x_cli edit-trusted-algos did:op:f7946c46eb87318b2cd34efdd5f33b19ea9223a90b67f447da6a92aa68ca007c did:op:34d5f73d77550843201ee1a43ad9d404d3e557ed6a70772e9afde7a27d863b8f did:op:d20f956e79709fb2469fffe2bd85cf2fec95a21d2497998bb530043c6bbec901
```

### edit-dataset-url \<did> \<url>

Change the URL of a dataset DID:

```shell
pontus-x_cli edit-dataset-url did:op:f7946c46eb87318b2cd34efdd5f33b19ea9223a90b67f447da6a92aa68ca007c https://new.url/dataset.csv
```

### publish \[options] \<script-folder>

Publish the asset as instructed in the provided script:

```shell
pontus-x_cli publish --provider https://provider.angliru.udl.cat src/publish/samples/data --dry-run
```

Remove the flag `--dry-run` to actually publish the asset.

The script should be a TypeScript file `index.ts` in the input script-folder, which should have a function `publish` with the following signature:

```typescript
const publish = async (folder: string, connection: any, provider: string, dryRun: boolean) => {
    // Your publishing logic here
}
```

In the same folder, you should have a `description.md` file with the description of the asset to be published using Markdown syntax.

There are samples of publish scripts and description Markdown files for algorithms and datasets in the [src/publish/samples](src/publish/samples) folder.


## Additional commands

There is a separate set of scripts and configuration files, not integrated into the Pontus-X CLI because they are based on other external commands and resources, like Kubernetes CLI and YAML configuration files.

These scripts and files are intended to help bootstrap Gaia-X Compliance through the Gaia-X Trust Framework. Starting with deploying a DID Web server and then Verifiable Credentials for participants. 

More details: [gaia-x_compliance](./src/gaia-x_compliance/README.md)
