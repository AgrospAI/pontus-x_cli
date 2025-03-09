# Pontus-X CLI

Command Line Interface for the Pontus-X Data Space Ecosystem.

## Installation

If you don't have npm installed, install Node.js and NPM following the instructions at https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

Then, install the Pontus-X CLI globally using npm:

```shell
npm install -g pontus-x_cli
```

Then, create a `.env` file in your working directory with the network to be used, for instance, PONTUSXDEV or PONTUSXTEST:

```
NETWORK=PONTUSXDEV
```

## Currently available commands

The following subsections detail the available command to interact with the Pontus-X Data Space Ecosystem. Additionally, there is a final section [Prepare yourself for Gaia-X compliance](#prepare-yourself-for-gaia-x-compliance) that will guide you through the process of setting up a DID-Web server and generating the necessary participant credentials following the Gaia-X Trust Framework using two additional `pontus-x_cli` commands.

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

### revoke \<dids...>

Publisher revocation of one or more owned DIDs

```shell
pontus-x_cli revoke did:op:052eb04066d696a27430116676c859c6303d82257c7a0ebda51f4e80363f6bca did:op:052eb04066d696a27430116676c859c6303d82257c7a0ebda51f4e80363f6bca
```

### self-description \<did> \<sdurl>

Associate Gaia-X Self-Description to the asset with the given DID

Edit a DID metadata to link it to a Gaia-X Self Description available from the provided URL (it should be compliant with the configured Gaia-X Digital Clearing House, for instance https://compliance.lab.gaia-x.eu/v1-staging/docs):

```shell
pontus-x_cli self-description did:op:34d5f73d77550843201ee1a43ad9d404d3e557ed6a70772e9afde7a27d863b8f https://compliance.agrospai.udl.cat/.well-known/service_EDA_UdL_devnet.vp.json
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
pontus-x_cli publish --provider https://provider.agrospai.udl.cat src/publish/samples/data --dry-run
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

## Prepare yourself for Gaia-X compliance

This section will help you to prepare your institution for Gaia-X compliance. It will guide you through the process of setting up a DID-Web server and generating the necessary participant credentials following the Gaia-X Trust Framework.

### Obtaining a domain and SSL certificate

Get a root domain for DID-Web and the associated SSL certificate. We will use for this Let's Encrypt certificates, the free alternative among Gaia-X's [list of defined Trust Anchors](https://gaia-x.gitlab.io/policy-rules-committee/trust-framework/trust_anchors/#list-of-defined-trust-anchors).

There are different ways of getting a Let's Encrypt certificate: https://letsencrypt.org/getting-started/

For this example, and as later we will need to publish online some of the generated documents, we will use a Kubernetes cluster with Cert Manager to automate the certificate issuance, plus NGINX to serve the generated documents.

First of all, you will need a Kubernetes cluster that is publicly accessible. You can use a cloud provider like Google Cloud Platform (GCP) or Amazon Web Services (AWS), or a local Kubernetes cluster like [Minikube](https://minikube.sigs.k8s.io/docs/start/).

Once Minikube is running, don't forget to enable the ingress addon using the command: `minikube addons enable ingress`. Then, install Cert Manager following the instructions at https://cert-manager.io/docs/installation/

After Cert Manager is installed, you can create a ClusterIssuer resource to issue Let's Encrypt certificates. The file [letsencrypt-production.yaml](src/gaia-x_compliance/letsencrypt-production.yaml) provides an example of a ClusterIssuer resource, which can be applied to your cluster using the command:

```shell
kubectl apply -f letsencrypt-production.yaml
```

Now, you can create a NGINX deployment, with associated service and ingress, which will request the certificate from Let's Encrypt, for instance that defined at [test-nginx.yaml](src/gaia-x_compliance/test-nginx.yaml). It can be deployed using the commands:

```shell
kubectl create namespace test
kubectl apply -f test-nginx.yaml
```

Just wait for all the resources to be ready and the certificate to be issued. You can check the status of all the resource in the test namespace using the command:

```shell
kubectl get all -n test
```

And check the certificate to be issued using the command:

```shell
kubectl get certificate -n test
```

Wait till the certificate is marked as ready:

```
NAME                    READY   SECRET                  AGE
your.domain.org-cert    True    your.domain.org-cert    2m
```

Now, you can retrieve the certificate chain including the root certificate as required by Gaia-X. We can use an online service like https://whatsmychaincert.com. Use the following command configuring you domain name, e.g. `your.domain.org`, to retrieve the whole chain and store it in `certificate-chain.crt`:

```shell
curl -o certificate-chain.crt "https://whatsmychaincert.com/generate?include_leaf=1&include_root=1&host=your.domain.org"
```

Also retrieve the secret key for the certificate using the command:

```shell
kubectl get secret your.domain.org-cert -n test -o jsonpath='{.data.tls\.key}' | base64 --decode > certificate.key
```

### Setting up a DID-Web server

Once we have set a public domain and its associated SSL certificate, we can set up a DID-Web source where we can publish Gaia-X complaint credentials for participants and assets.

To generate the did.json file required for DID-Web, we will use the Gaia-X [did-web-generator](https://gitlab.com/gaia-x/lab/did-web-generator) and provide as input the base URL for DID-Web, e.g. https://your.domain.org, and the name of the file with the SSL certificate, e.g. `certificate-chain.crt`.

The did.json file is generated using the `generate-did-web` command provided by `pontus-x_cli`:

```shell
pontus-x_cli generate-did-web -d https://your.domain.org -c certificate-chain.crt
```

The output is stored in a file named `did.json` and is to be made available from the DID-Web domain at the well-known path `/.well-known/did.json` together with the certificate file.

To do so, we will use the NGINX server we have set up before. We will create a ConfigMap with the did.json file and the certificate file, and mount it in the NGINX deployment.

First, we create the config map in the test namespace from the `did.json` and `certificate-chain.crt` files using the following command:

```shell
kubectl --namespace test create configmap did-web-config --from-file=did.json --from-file=certificate-chain.crt --dry-run=client -o yaml | kubectl apply -f -
```

Then, we update the NGINX deployment to mount the config map in the `/usr/share/nginx/html/.well-known` path. The updated deployment is defined in the file [test-nginx-did-web.yaml](src/gaia-x_compliance/test-nginx-did-web.yaml) and can be applied using the command:

```shell
kubectl apply -f test-nginx-did-web.yaml
```

Now, the `did.json` should be available at https://your.domain.org/.well-known/did.json and the certificate chain at https://your.domain.org/.well-known/certificate-chain.crt.

The chain can be checked to see if it constitutes a valid trust anchor chain using the Gaia-X [Trust Anchor Registry](https://registry.lab.gaia-x.eu/v1-staging/docs#/TrustAnchor/TrustAnchorController_verifyTrustAnchorChain) API. The `v1-staging` version accepts Extended Validation (EV) Secure Sockets Layer (SSL) certificate issuers like Let's Encrypt, while the `v1` version only accepts the official [Gaia-X Trust Anchors]((https://gaia-x.gitlab.io/policy-rules-committee/trust-framework/trust_anchors/#list-of-defined-trust-anchors). EV SSL certificates are just recommended for testing.

### Generating Gaia-X Compliant Participant Credentials

To generate the credentials required by the Gaia-X Trust Framework to identify a Participant, we will use the `generate-participant-credentials` command provided by `pontus-x_cli`. This command requires as input a JSON file with the participant's data and the DID-Web URL where the credentials will be published. For instance, for the Universitat de Lleida, a sample [UdL.data.json](src/gaia-x_compliance/UdL.data.json) file is provided with the following content:

```json
{
  "participant_name": "UdL",
  "participant_uri": "https://www.udl.cat",
  "participant_legal_name": "Universitat de Lleida",
  "participant_vat_id": "ESQ7550001G",
  "participant_country_subdivision_code": "ES-L",
  "participant_street_address": "Victor Siurana, 1",
  "participant_postal_code": "25003",
  "participant_locality": "Lleida"
}
```

To generate the Verifiable Presentation of the Gaia-X credentials for Universitat de Lleida using the previous DID-Web server, we can use the following command. The Verifiable Presentation (VP) file will be generated in the same folder as the JSON file with the input data about the participant:

```shell
pontus-x_cli generate-participant-credentials -p UdL.data.json -d did.json -c certificate.key
```

To generate the VPs for other participants, just create a new JSON file with the participant's data and run the script with the new file. For instance, there is another sample JSON file for CEP in [CEP.data.json](src/gaia-x_compliance/CEP.data.json), which can be used to generate the credentials for the "Consorci Centre d'Estudis Porcins" using the command:

```shell
pontus-x_cli generate-participant-credentials -p CEP.data.json -d did.json -c certificate.key
```

## Publishing the Gaia-X Compliant Participant Credentials

To publish the generated credentials, we will use the NGINX server we have set up before and expand the ConfigMap to also include the files for the credentials (there is no need to also publish the Gaia-X Compliance responses). The following command will generate a new version of the config map including all the credentials for UdL and CEP participants, in addition to the original `did.json` and `certificate-chain.crt` files:

```shell
kubectl --namespace test create configmap did-web-config --from-file=did.json --from-file=certificate-chain.crt \
  --from-file=UdL.vp.json --from-file=CEP.vp.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Dealing with Certificate Expiration

In case of SSL certificate expiration, just regenerate and publish at well-know the certificate chain `certificate-chain.crt`

**Important**: public and private keys do not change and nothing more needs to be done, not even updating the `did.json` file.

So basically, download again the certificate chain after renewal using the previous command:

```shell
curl -o certificate-chain.crt "https://whatsmychaincert.com/generate?include_leaf=1&include_root=1&host=your.domain.org"
```

And update the ConfigMap with the new certificate chain, without forgetting the rest of files being already published:

```shell
kubectl --namespace test create configmap did-web-config --from-file=did.json --from-file=certificate-chain.crt \
  --from-file=UdL.vp.json --from-file=CEP.vp.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Additional References

Gaia-X: onboarding, first credentials' issuance.
* Video tutorial: https://www.youtube.com/watch?v=xHaBM-T2--k
* Jupyter notebook: https://gitlab.com/gaia-x/lab/workshops/gaia-x-101

