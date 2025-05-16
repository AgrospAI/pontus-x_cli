import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import * as Handlebars from 'handlebars';
import { createPrivateKey } from 'crypto';
import { GaiaXSignatureSigner, VerifiableCredential } from '@gaia-x/json-web-signature-2020';
import { Signer } from '@gaia-x/json-web-signature-2020/dist/src/signer/signer';
import axios, { AxiosError } from 'axios';

function generateSignedDocument(data: any, templateFile: string, signer: Signer): Promise<VerifiableCredential> {
    const fileContent = readFileSync(resolve('src/gaia-x_compliance/', templateFile), 'utf-8');
    const template = Handlebars.compile(fileContent, { noEscape: true });
    const document: Omit<VerifiableCredential, 'proof'> = JSON.parse(template(data));
    return signer.sign(document);
}

async function generateParticipantVC(data: any, signer: Signer) {
    console.log(__dirname);
    const templateFile = require.resolve('./templates/participant.hbs');
    const participantVCSigned: VerifiableCredential =
        await generateSignedDocument(data, templateFile, signer);
    console.log(`Verifiable Credential for participant ${data.participant_legal_name} ` +
        `successfully generated`)
    return participantVCSigned;
}

async function generateParticipantTandCVC(data: any, signer: Signer) {
    const templateFile = require.resolve('./templates/tandc.hbs');
    const tandcVCSigned: VerifiableCredential =
        await generateSignedDocument(data, templateFile, signer);
    console.log(`Signed Terms and Conditions for ${data.participant_legal_name} ` +
        `successfully generated`);
    return tandcVCSigned;
}

async function generateParticipantLNRVC(data: any) {
    const templateFile = require.resolve('./templates/lrn-request.hbs');
    const notaryService = "https://gx-notary.arsys.es/v1/registrationNumberVC";
    const fileContent = readFileSync(resolve(templateFile), 'utf-8');
    const lnrRequestTemplate = Handlebars.compile(fileContent);
    const lnrRequest = lnrRequestTemplate(data);
    try {
        const response = await axios.post(
            `${notaryService}?vcid=https://${data.issuer_domain}/.well-known/${data.participant_name}.vp.json%23lrn`,
            JSON.parse(lnrRequest));
        if (response.status === 200) {
            console.log(`Verifiable Credential for ${data.participant_legal_name} Legal Registration Number` +
                ` successfully generated`);
            return response.data;
        } else {
            console.error(`Error generating Legal Registration Number for ${data.participant_legal_name}`);
            console.error(response?.data);
        }
    } catch (e) {
        console.error(`Error generating Legal Registration Number for ${data.participant_legal_name}`);
        console.error((e as AxiosError).response?.data);
    }
    return null;
}

function generateParticipantVP(participantVC: any, tandcVC: any, lrnVC: any, folder: string, data: any) {
    const vp = {
        "@context": "https://www.w3.org/2018/credentials/v1",
        "type": "VerifiablePresentation",
        "verifiableCredential": [
            participantVC,
            lrnVC,
            tandcVC
        ]
    };
    writeFileSync(resolve(folder, data.participant_name + '.vp.json'),
        JSON.stringify(vp, null, 2), 'utf-8');
    console.log(`Verifiable Presentation of the credentials for ${data.participant_legal_name} ` +
        `generated and stored in ${data.participant_name}.vp.json`);
}

function generateAssetVP(participantVC: any, tandcVC: any, lrnVC: any, assetVC: any, folder: string, data: any, ddo: any) {
    const assetData = extractAssetFromDDO(ddo);
    const vp = {
        "@context": "https://www.w3.org/2018/credentials/v1",
        "type": "VerifiablePresentation",
        "verifiableCredential": [
            participantVC,
            lrnVC,
            tandcVC,
            assetVC
        ]
    };
    const dirPath = folder + '/' + data.participant_name;
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
    writeFileSync(resolve(dirPath, `${ddo.datatokens[0].symbol}_${assetData.network}.vp.json`),
        JSON.stringify(vp, null, 2), 'utf-8');
    console.log(`Verifiable Presentation of the credentials for ${ddo.metadata.name} ` +
        `generated and stored in ${data.participant_name}/${ddo.datatokens[0].symbol}.${assetData.network}.vp.json`);
}

function extractAssetFromDDO(ddo: any) {
    return {
        chain_id: ddo.chainId,
        network: ddo.chainId === 32456 ? 'devnet' : 'testnet',
        did: ddo.id,
        service_name: ddo.metadata.name,
        type: ddo.metadata.type,
        license: ddo.metadata.license,
        contains_PII: ddo.metadata.additionalInformation?.containsPII || false,
        service_description: JSON.stringify(ddo.metadata.description).slice(1, -1),
        owner_account: ddo.nft.owner,
        service_type: ddo.services[0].type,
        service_timeout: ddo.services[0].timeout === 0 ? 'unlimited' : ddo.services[0].timeout,
        nft_address: ddo.nftAddress,
        token_name: ddo.datatokens[0].name,
        token_symbol: ddo.datatokens[0].symbol,
        token_address: ddo.datatokens[0].address,
        service_price: ddo.stats.price.value,
        service_endpoint: ddo.services[0].serviceEndpoint
    }
}

async function generateAssetVC(ddo: any, participantData: any, signer: Signer) {
    if (!ddo)
        return null;
    const assetData = extractAssetFromDDO(ddo);
    let templateFile: string;
    if (assetData.type === 'dataset') {
        templateFile = require.resolve('./templates/dataset.hbs');
    } else {
        templateFile = require.resolve('./templates/service.hbs');
    }
    const assetVCSigned: VerifiableCredential =
        await generateSignedDocument({...assetData, ...participantData}, templateFile, signer);
    console.log(`Verifiable Credential for asset ${assetData.service_name} ` +
        `successfully generated`)
    return assetVCSigned;
}

export async function generateCredentials(participantDataFile: string, didjsonFile: string,
                                          certificateKeyFile: string, password: string, ddo?: any) {
    const folder = dirname(participantDataFile);
    const participantData = JSON.parse(readFileSync(participantDataFile, 'utf-8'));
    participantData.issuance_date = new Date().toISOString();
    const didJson = JSON.parse(readFileSync(didjsonFile, 'utf-8'));
    participantData.issuer_domain = didJson.id.substring(didJson.id.lastIndexOf(':') + 1)
    console.log(`Asset DDO: ${ddo ? JSON.stringify(ddo, null, 2) : 'N/A'}`);
    console.log(`Generating Gaia-X credentials for ` +
        ddo ? `asset ${ddo?.metadata?.name}` : `participant ${participantData.participant_legal_name} ` +
        `with issuer ${participantData.issuer_domain}`);

    const pkcs1 = readFileSync(certificateKeyFile, 'utf-8');
    const key = createPrivateKey({ key: pkcs1, passphrase: password });
    const signer: Signer = new GaiaXSignatureSigner({
        privateKey: key,
        privateKeyAlg: didJson.verificationMethod[0].publicKeyJwk.alg,
        verificationMethod: didJson.verificationMethod[0].id
    })

    await Promise.all([
        generateParticipantVC(participantData, signer),
        generateParticipantTandCVC(participantData, signer),
        generateParticipantLNRVC(participantData),
        generateAssetVC(ddo, participantData, signer)])
        .then(([participantVC, tandcVC, lrnVC, assetVC]) => {
            if (participantVC && tandcVC && lrnVC && assetVC) {
                generateAssetVP(participantVC, tandcVC, lrnVC, assetVC, folder, participantData, ddo);
            } else if (participantVC && tandcVC && lrnVC) {
                generateParticipantVP(participantVC, tandcVC, lrnVC, folder, participantData);
            } else {
                console.error('Error with one of the credentials, therefore the Verifiable Presentation was not generated');
            }
        });
}

export async function checkCompliance(participantDataFile: string, vpFile: string) {
    const complianceService = "https://compliance.lab.gaia-x.eu/v1/api/credential-offers";
    const folder = dirname(participantDataFile);
    const participantData = JSON.parse(readFileSync(participantDataFile, 'utf-8'));
    const vp = JSON.parse(readFileSync(vpFile, 'utf-8'))
    await axios.post(`${complianceService}?` +
        `vcid=https://${participantData.issuer_domain}/.well-known/${participantData.participant_name}.compliance.json`, vp)
        .then(response => {
            if (response.status === 201) {
                const compliance = response.data;
                writeFileSync(resolve(folder, participantData.participant_name + '.compliance.json'),
                    JSON.stringify(compliance, null, 2), 'utf-8');
                console.log(`Gaia-X Compliance verified for ${participantData.participant_legal_name} credentials ` +
                    `and stored in ${participantData.participant_name}.compliance.json`);
            } else {
                console.error(`Error generating Compliance for ${participantData.participant_legal_name}`);
                console.error(response?.data);
            }
        })
        .catch(reason => {
            console.error(`Error generating Compliance for ${participantData.participant_legal_name}`);
            console.error((reason as AxiosError).response?.data);
        });
}
