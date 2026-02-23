# Prepare yourself for Gaia-X compliance

This section will help you to prepare your institution for Gaia-X compliance. It will guide you through the process of setting up a DID-Web server and generating the necessary participant credentials following the Gaia-X Trust Framework.

### Obtaining a domain and SSL certificate

Get a root domain for DID-Web and the associated SSL certificate. We will use for this Let's Encrypt certificates, the free alternative among Gaia-X's [list of defined Trust Anchors](https://gaia-x.gitlab.io/policy-rules-committee/trust-framework/trust_anchors/#list-of-defined-trust-anchors).

There are different ways of getting a Let's Encrypt certificate: <https://letsencrypt.org/getting-started/>

For this example, and as later we will need to publish online some of the generated documents, we will use a Kubernetes cluster with Cert Manager to automate the certificate issuance, plus NGINX to serve the generated documents.

First of all, you will need a Kubernetes cluster that is publicly accessible. You can use a cloud provider like Google Cloud Platform (GCP) or Amazon Web Services (AWS), or a local Kubernetes cluster like [Minikube](https://minikube.sigs.k8s.io/docs/start/).

Once Minikube is running, don't forget to enable the ingress addon using the command: `minikube addons enable ingress`. Then, install Cert Manager following the instructions at <https://cert-manager.io/docs/installation/>

After Cert Manager is installed, you can create a ClusterIssuer resource to issue Let's Encrypt certificates. The file [letsencrypt-production.yaml](src/gaia-x_compliance/letsencrypt-production.yaml) provides an example of a ClusterIssuer resource, which can be applied to your cluster using the command:

```shell
kubectl apply -f letsencrypt-production.yaml
```

Now, you can create an NGINX deployment, with associated service and ingress, which will request the certificate from Let's Encrypt, for instance, that is defined at [test-nginx.yaml](src/gaia-x_compliance/test-nginx.yaml). It can be deployed using the commands:

```shell
kubectl create namespace test
kubectl apply -f test-nginx.yaml
```

Just wait until all resources are ready and the certificate is issued. You can check the status of all the resources in the test namespace using the command:

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

Now, you can retrieve the certificate chain, including the root certificate, as required by Gaia-X. We can use an online service like <https://whatsmychaincert.com>. Use the following command, configuring your domain name, e.g. `your.domain.org`, to retrieve the whole chain and store it in `certificate-chain.crt`:

```shell
curl -o certificate-chain.crt "https://whatsmychaincert.com/generate?include_leaf=1&include_root=1&host=your.domain.org"
```

Also, retrieve the secret key for the certificate using the command:

```shell
kubectl get secret your.domain.org-cert -n test -o jsonpath='{.data.tls\.key}' | base64 --decode > certificate.key
```

### Setting up a DID-Web server

Once we have set a public domain and its associated SSL certificate, we can set up a DID-Web source where we can publish Gaia-X-compliant credentials for participants and assets.

To generate the did.json file required for DID-Web, we will use the Gaia-X [did-web-generator](https://gitlab.com/gaia-x/lab/did-web-generator) and provide as input the base URL for DID-Web, e.g. <https://your.domain.org>, and the name of the file with the SSL certificate, e.g. `certificate-chain.crt`.

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

Now, the `did.json` should be available at <https://your.domain.org/.well-known/did.json> and the certificate chain at <https://your.domain.org/.well-known/certificate-chain.crt>.

The chain can be checked to see if it constitutes a valid trust anchor chain using the Gaia-X [Trust Anchor Registry](https://registry.lab.gaia-x.eu/v1-staging/docs#/TrustAnchor/TrustAnchorController_verifyTrustAnchorChain) API. The `v1-staging` version accepts Extended Validation (EV) Secure Sockets Layer (SSL) certificate issuers like Let's Encrypt, while the `v1` version only accepts the official [Gaia-X Trust Anchors]((<https://gaia-x.gitlab.io/policy-rules-committee/trust-framework/trust_anchors/#list-of-defined-trust-anchors>). EV SSL certificates are just recommended for testing.

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

In case of SSL certificate expiration, just regenerate and publish at `well-known` the certificate chain `certificate-chain.crt`

**Important**: public and private keys do not change, and nothing more needs to be done, not even updating the `did.json` file.

So basically, download the certificate chain again after renewal using the previous command:

```shell
curl -o certificate-chain.crt "https://whatsmychaincert.com/generate?include_leaf=1&include_root=1&host=your.domain.org"
```

And update the ConfigMap with the new certificate chain, without forgetting the rest of the files being already published:

```shell
kubectl --namespace test create configmap did-web-config --from-file=did.json --from-file=certificate-chain.crt \
  --from-file=UdL.vp.json --from-file=CEP.vp.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Additional References

Gaia-X: onboarding, first credentials' issuance.

* Video tutorial: <https://www.youtube.com/watch?v=xHaBM-T2--k>
* Jupyter notebook: <https://gitlab.com/gaia-x/lab/workshops/gaia-x-101>
