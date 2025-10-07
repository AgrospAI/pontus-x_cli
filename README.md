# pontus-x_cli

A new CLI generated with oclif

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/pontus-x_cli.svg)](https://npmjs.org/package/pontus-x_cli)
[![Downloads/week](https://img.shields.io/npm/dw/pontus-x_cli.svg)](https://npmjs.org/package/pontus-x_cli)

<!-- toc -->
* [pontus-x_cli](#pontus-x_cli)
* [Usage](#usage)
* [Commands](#commands)
* [Useful information](#useful-information)
* [Development](#development)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g pontus-x_cli
$ pontus-x_cli COMMAND
running command...
$ pontus-x_cli (--version)
pontus-x_cli/1.0.0 darwin-arm64 node-v23.11.1
$ pontus-x_cli --help [COMMAND]
USAGE
  $ pontus-x_cli COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`pontus-x_cli access DID`](#pontus-x_cli-access-did)
* [`pontus-x_cli autocomplete [SHELL]`](#pontus-x_cli-autocomplete-shell)
* [`pontus-x_cli change-price DID NEWPRICE`](#pontus-x_cli-change-price-did-newprice)
* [`pontus-x_cli check-participant-compliance`](#pontus-x_cli-check-participant-compliance)
* [`pontus-x_cli compute ALGO`](#pontus-x_cli-compute-algo)
* [`pontus-x_cli compute-results JOBID`](#pontus-x_cli-compute-results-jobid)
* [`pontus-x_cli compute-status JOBID`](#pontus-x_cli-compute-status-jobid)
* [`pontus-x_cli edit-algo CHECKSUM DID IMAGE TAG`](#pontus-x_cli-edit-algo-checksum-did-image-tag)
* [`pontus-x_cli edit-asset-url DID URL`](#pontus-x_cli-edit-asset-url-did-url)
* [`pontus-x_cli edit-trusted-algos DID`](#pontus-x_cli-edit-trusted-algos-did)
* [`pontus-x_cli export-private-key`](#pontus-x_cli-export-private-key)
* [`pontus-x_cli generate-asset-credentials DID`](#pontus-x_cli-generate-asset-credentials-did)
* [`pontus-x_cli generate-did-web`](#pontus-x_cli-generate-did-web)
* [`pontus-x_cli generate-participant-credentials`](#pontus-x_cli-generate-participant-credentials)
* [`pontus-x_cli get DID`](#pontus-x_cli-get-did)
* [`pontus-x_cli help [COMMAND]`](#pontus-x_cli-help-command)
* [`pontus-x_cli login KEYFILE`](#pontus-x_cli-login-keyfile)
* [`pontus-x_cli logout`](#pontus-x_cli-logout)
* [`pontus-x_cli publish SCRIPTFOLDER`](#pontus-x_cli-publish-scriptfolder)
* [`pontus-x_cli revoke DIDS`](#pontus-x_cli-revoke-dids)
* [`pontus-x_cli self-description DID SDURL`](#pontus-x_cli-self-description-did-sdurl)

## `pontus-x_cli access DID`

Access an asset that can be downloaded given its DID

```
USAGE
  $ pontus-x_cli access DID

ARGUMENTS
  DID  DID of the asset

DESCRIPTION
  Access an asset that can be downloaded given its DID

EXAMPLES
  $ pontus-x_cli access did:op:af3e93c4f18903f91b108e7204b8a752e7605f4547ed507212bd6aca63af5686
```

_See code: [src/commands/access.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/access.ts)_

## `pontus-x_cli autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ pontus-x_cli autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ pontus-x_cli autocomplete

  $ pontus-x_cli autocomplete bash

  $ pontus-x_cli autocomplete zsh

  $ pontus-x_cli autocomplete powershell

  $ pontus-x_cli autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.34/src/commands/autocomplete/index.ts)_

## `pontus-x_cli change-price DID NEWPRICE`

Change the price keeping the existing currency for an asset with the given DID

```
USAGE
  $ pontus-x_cli change-price DID NEWPRICE

ARGUMENTS
  DID       DID of the asset
  NEWPRICE  New price for the asset

DESCRIPTION
  Change the price keeping the existing currency for an asset with the given DID

EXAMPLES
  $ pontus-x_cli change-price did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a 10
```

_See code: [src/commands/change-price.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/change-price.ts)_

## `pontus-x_cli check-participant-compliance`

Use Gaia-X Compliance to check a participant Verifiable Presentation

```
USAGE
  $ pontus-x_cli check-participant-compliance -p <value> --vp <value>

FLAGS
  -p, --participant=<value>  (required) Path to the JSON file including the required participant data
      --vp=<value>           (required) Path to the participant Verifiable Presentation file

DESCRIPTION
  Use Gaia-X Compliance to check a participant Verifiable Presentation

EXAMPLES
  $ pontus-x_cli check-participant-compliance -p ./CEP.data.json --vp ./CEP.vp.json
```

_See code: [src/commands/check-participant-compliance.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/check-participant-compliance.ts)_

## `pontus-x_cli compute ALGO`

Compute the algorithm on one or more datasets.

```
USAGE
  $ pontus-x_cli compute ALGO -d <value>...

ARGUMENTS
  ALGO  Algorithm DID

FLAGS
  -d, --datasets=<value>...  (required) Dataset DIDs

DESCRIPTION
  Compute the algorithm on one or more datasets.

EXAMPLES
  $ pontus-x_cli compute did:op:34e2ff9baf030318b13ff3940ab0885bb11fee49a8597123392983f5a0db8a35 -d did:op:d8a36ff74d36e54ce245d27689330fc39debb2fdfeac09d4a08b24b68cf5053d
```

_See code: [src/commands/compute.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/compute.ts)_

## `pontus-x_cli compute-results JOBID`

Get the compute job results.

```
USAGE
  $ pontus-x_cli compute-results JOBID -p <value>

ARGUMENTS
  JOBID  Compute job ID

FLAGS
  -p, --provider=<value>  (required) The Provider URL

DESCRIPTION
  Get the compute job results.

EXAMPLES
  $ pontus-x_cli compute-results 215bae450c8f40f59bfc5d1ccada3931 -p https://provider.agrospai.udl.cat
```

_See code: [src/commands/compute-results.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/compute-results.ts)_

## `pontus-x_cli compute-status JOBID`

Check compute job status.

```
USAGE
  $ pontus-x_cli compute-status JOBID -p <value>

ARGUMENTS
  JOBID  Compute job ID

FLAGS
  -p, --provider=<value>  (required) The Provider URL

DESCRIPTION
  Check compute job status.

EXAMPLES
  $ pontus-x_cli compute-status 215bae450c8f40f59bfc5d1ccada3931 -p https://provider.agrospai.udl.cat
```

_See code: [src/commands/compute-status.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/compute-status.ts)_

## `pontus-x_cli edit-algo CHECKSUM DID IMAGE TAG`

Change the container metadata for a given algorithm DID

```
USAGE
  $ pontus-x_cli edit-algo CHECKSUM DID IMAGE TAG

ARGUMENTS
  CHECKSUM  Container checksum
  DID       Algorithm DID
  IMAGE     Container image
  TAG       Container tag

DESCRIPTION
  Change the container metadata for a given algorithm DID

EXAMPLES
  $ pontus-x_cli edit-algo did:op:dcdb747f8feff3122c6d6c0f45a339a6e09415e721f98f61cc2c1d62ab35a21f rogargon/pandas-profiling 4.16 sha256:81dca5439f07dff4d56097546a9fce7335be3de8e2622dc105c64e54376f86b5
```

_See code: [src/commands/edit-algo.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/edit-algo.ts)_

## `pontus-x_cli edit-asset-url DID URL`

Change the URL of an asset DID

```
USAGE
  $ pontus-x_cli edit-asset-url DID URL

ARGUMENTS
  DID  DID of the asset
  URL  New URL for the asset

DESCRIPTION
  Change the URL of an asset DID

EXAMPLES
  $ pontus-x_cli edit-asset-url did:op:af3e93c4f18903f91b108e7204b8a752e7605f4547ed507212bd6aca63af5686 https://raw.githubusercontent.com/plotly/datasets/refs/heads/master/titanic.csv
```

_See code: [src/commands/edit-asset-url.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/edit-asset-url.ts)_

## `pontus-x_cli edit-trusted-algos DID`

Overwrite the trusted algorithms for a data asset to the provided algorithm DIDs

```
USAGE
  $ pontus-x_cli edit-trusted-algos DID --algos <value>...

ARGUMENTS
  DID  DID of the asset

FLAGS
  --algos=<value>...  (required) Algorithm DIDs

DESCRIPTION
  Overwrite the trusted algorithms for a data asset to the provided algorithm DIDs

EXAMPLES
  $ pontus-x_cli edit-trusted-algos did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a --algos did:op:8f9994d01975cadd0196a2f7f811ed850e5d02a7223e7c5a31faaebe7371c81a did:op:0b970c95211cb8ef4574383386376646081bb7eb949b2a75e1e2171ea25949a7
```

_See code: [src/commands/edit-trusted-algos.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/edit-trusted-algos.ts)_

## `pontus-x_cli export-private-key`

Export your private key as a JSON file, to use later with the login command or for Pontus-X portals automation

```
USAGE
  $ pontus-x_cli export-private-key [-p <value>] [-k <value>]

FLAGS
  -k, --privateKey=<value>  Your private key
  -p, --password=<value>    Password to encrypt the private key file

DESCRIPTION
  Export your private key as a JSON file, to use later with the login command or for Pontus-X portals automation

EXAMPLES
  $ pontus-x_cli export-private-key
```

_See code: [src/commands/export-private-key.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/export-private-key.ts)_

## `pontus-x_cli generate-asset-credentials DID`

Generate the Gaia-X credentials for the input DID asset, including its verifiable presentation

```
USAGE
  $ pontus-x_cli generate-asset-credentials DID -c <value> -d <value> -p <value> [-w <value>]

ARGUMENTS
  DID  DID of the asset

FLAGS
  -c, --certificate=<value>  (required) Path to the certificate.key file
  -d, --didjson=<value>      (required) Path to the did.json file
  -p, --participant=<value>  (required) Path to the JSON file including the required participant data
  -w, --password=<value>     Password for the private key file (if not provided, it will be asked interactively)

DESCRIPTION
  Generate the Gaia-X credentials for the input DID asset, including its verifiable presentation

EXAMPLES
  $ pontus-x_cli generate-asset-credentials -p ./CEP.data.json -d ./did.json -c certificate.key did:op:01f8bc1e797a854dc718bd7a802acb07c5fc39f706b03dd454bceb66be6828c6
```

_See code: [src/commands/generate-asset-credentials.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/generate-asset-credentials.ts)_

## `pontus-x_cli generate-did-web`

Generate a did.json to set up a DID-Web source to publish Gaia-X complaint credentials

```
USAGE
  $ pontus-x_cli generate-did-web -c <value> -d <value>

FLAGS
  -c, --certificate=<value>  (required) Path to the file with the certificate chain for the DID domain URL
  -d, --domain=<value>       (required) URL where the DID-Web document will be hosted

DESCRIPTION
  Generate a did.json to set up a DID-Web source to publish Gaia-X complaint credentials

EXAMPLES
  $ pontus-x_cli generate-did-web -d <https://compliance.agrospai.udl.cat> -c certificate-chain.crt
```

_See code: [src/commands/generate-did-web.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/generate-did-web.ts)_

## `pontus-x_cli generate-participant-credentials`

Generate the Gaia-X credentials for the participant including their verifiable presentation

```
USAGE
  $ pontus-x_cli generate-participant-credentials -c <value> -d <value> -p <value> [-w <value>]

FLAGS
  -c, --certificate=<value>  (required) Path to the certificate.key file
  -d, --didjson=<value>      (required) Path to the did.json file
  -p, --participant=<value>  (required) Path to the JSON file including the required participant data
  -w, --password=<value>     Password for the private key file (if not provided, it will be asked interactively)

DESCRIPTION
  Generate the Gaia-X credentials for the participant including their verifiable presentation

EXAMPLES
  $ pontus-x_cli generate-participant-credentials -p ./CEP.data.json -d ./did.json -c certificate.key
```

_See code: [src/commands/generate-participant-credentials.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/generate-participant-credentials.ts)_

## `pontus-x_cli get DID`

Get the available metadata to the asset with the given DID

```
USAGE
  $ pontus-x_cli get DID

ARGUMENTS
  DID  DID of the asset

DESCRIPTION
  Get the available metadata to the asset with the given DID

EXAMPLES
  $ pontus-x_cli get did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a
```

_See code: [src/commands/get.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/get.ts)_

## `pontus-x_cli help [COMMAND]`

Display help for pontus-x_cli.

```
USAGE
  $ pontus-x_cli help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for pontus-x_cli.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.32/src/commands/help.ts)_

## `pontus-x_cli login KEYFILE`

Login to retrieve your private key from a JSON key store and store it in .env

```
USAGE
  $ pontus-x_cli login KEYFILE [-p <value>]

ARGUMENTS
  KEYFILE  Path to the keyFile.json

FLAGS
  -p, --password=<value>  Password to decrypt the key file

DESCRIPTION
  Login to retrieve your private key from a JSON key store and store it in .env

EXAMPLES
  $ pontus-x_cli login d999baae98ac5246568fd726be8832c49626867d.json
```

_See code: [src/commands/login.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/login.ts)_

## `pontus-x_cli logout`

Logout to remove your private key from .env file

```
USAGE
  $ pontus-x_cli logout

DESCRIPTION
  Logout to remove your private key from .env file

EXAMPLES
  $ pontus-x_cli logout
```

_See code: [src/commands/logout.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/logout.ts)_

## `pontus-x_cli publish SCRIPTFOLDER`

Publish the asset as instructed in the provided script folder.

```
USAGE
  $ pontus-x_cli publish SCRIPTFOLDER -p <value> [--dry-run]

ARGUMENTS
  SCRIPTFOLDER  Path to the script folder

FLAGS
  -p, --provider=<value>  (required) The Provider URL
      --dry-run           Dry run the publishing process

DESCRIPTION
  Publish the asset as instructed in the provided script folder.

EXAMPLES
  $ pontus-x_cli publish -p https://provider.agrospai.udl.cat samples/publish/downloadable-data

  $ pontus-x_cli publish -p https://provider.agrospai.udl.cat samples/publish/algo --dry-run
```

_See code: [src/commands/publish.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/publish.ts)_

## `pontus-x_cli revoke DIDS`

Publisher revocation of one or more owned DIDs

```
USAGE
  $ pontus-x_cli revoke DIDS

ARGUMENTS
  DIDS  DIDs to revoke

DESCRIPTION
  Publisher revocation of one or more owned DIDs

EXAMPLES
  $ pontus-x_cli revoke did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a
```

_See code: [src/commands/revoke.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/revoke.ts)_

## `pontus-x_cli self-description DID SDURL`

Associate Gaia-X Self-Description to the asset with the given DID

```
USAGE
  $ pontus-x_cli self-description DID SDURL

ARGUMENTS
  DID    DID of the asset
  SDURL  URL of the Self-Description

DESCRIPTION
  Associate Gaia-X Self-Description to the asset with the given DID

EXAMPLES
  $ pontus-x_cli self-description
```

_See code: [src/commands/self-description.ts](https://github.com/AgrospAI/pontus-x_cli/blob/v1.0.0/src/commands/self-description.ts)_
<!-- commandsstop -->

# Useful information

## How to obtain the certificate chain

You can use the following command to obtain the certificate chain for the compliance service:

```bash
curl -o certificate-chain.crt "https://whatsmychaincert.com/generate?include_leaf=1&include_root=1&host=compliance.agrospai.udl.cat"
```

## How to obtain the certificate key

If you are using Kubernetes with cert-manager, you can extract the key with the following command:

```bash
kubectl get secret compliance-tls -n tenant-1 -o jsonpath='{.data.tls\.key}' | base64 --decode > certificate.key
```

# Development

## Install dependencies

```sh
npm install
```

## Build the CLI

```sh
npm run build
```

## Run the built CLI

### Development

```sh
./bin/dev.js COMMAND
```

### Production

```sh
./bin/run.js COMMAND
```

### Global installation

```sh
npm install -g .
```

## Formatting

```sh
npm run format
```

## Linting

```sh
npm run lint
```

## Typing

```sh
npm run tsc
```

## Testing

You can customize the tests in `test/config.ts` file. The two most important parameters are `PRIVATE_KEY_PATH` and `PRIVATE_KEY_PASSWORD`.

By default, you need to have the `privateKey.json` file in the base root. Which you can generate with the command: `npm run dev export-private-key -f privateKey.json`.

### Structure

The tests are organized in folders by functionality:

```text
test/
├── auth/
├── read/
└── write/
```

* **auth**: commands related to authentication.
* **read**: commands that do not make modifications in the blockchain.
* **write**: commands that make modifications in the blockchain. There is one exception: the `access` command, which causes problems when run in parallel with other write commands. All write commands are run sequentially to avoid conflicts.

### Initialization

Because the tests interact with the blockchain, we need to first deploy some assets manually and keep track of their DIDs in the `STATE_FILE` (by default `./.vitest-state.json`).

```sh
npm run test:init
```

### Clean up

Whenever you want to clean up the deployed assets in the blockchain, you can run:

```sh
npm run test:clean
```

### Run all tests once

```sh
npm run test
```

### Run a specific test file once

```sh
npm run test TEST_NAME # example: access, login, get, etc.
```

### Run a specific test folder

```sh
npm run test TEST_FOLDER # example: auth, read, write
```

### Run a specific test file in watch mode

```sh
npm run test:watch TEST_NAME # example: access, login, get, etc.
```

### Open the Vitest UI

```sh
npm run test:ui
```

## Generate documentation

```sh
npm run prepack
npm run postpack
```

## Generate JSON schema

```sh
./node_modules/.bin/ts-json-schema-generator --path 'src/types/publish.d.ts' --type 'PublishConfig' --expose 'export' --out 'src/types/schema.json'
```
