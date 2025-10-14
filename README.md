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
pontus-x_cli/1.0.0 linux-x64 node-v20.19.5
$ pontus-x_cli --help [COMMAND]
USAGE
  $ pontus-x_cli COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`pontus-x_cli autocomplete [SHELL]`](#pontus-x_cli-autocomplete-shell)
* [`pontus-x_cli help [COMMAND]`](#pontus-x_cli-help-command)

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
