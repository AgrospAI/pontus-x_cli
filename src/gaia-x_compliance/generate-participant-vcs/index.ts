import { argv } from 'process';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
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

async function generateParticipantVC(folder: string, data: any, signer: Signer) {
    const participantVCSigned: VerifiableCredential =
        await generateSignedDocument(data, 'templates/participant.hbs', signer);
    writeFileSync(resolve(folder, data.participant_name + '.participant.json'),
        JSON.stringify(participantVCSigned, null, 2), 'utf-8');
    console.log(`Verifiable Credential for participant ${data.participant_legal_name} ` +
        `successfully generated and stored in ${data.participant_name}.participant.json`)
}

async function generateParticipantTandCVC(folder: string, data: any, signer: Signer) {
    const tandcVCSigned: VerifiableCredential =
        await generateSignedDocument(data, 'templates/tandc.hbs', signer);
    writeFileSync(resolve(folder, data.participant_name + '.tandc.json'),
        JSON.stringify(tandcVCSigned, null, 2), 'utf-8');
    console.log(`Signed Terms and Conditions for ${data.participant_legal_name} ` +
        `successfully generated and stored in ${data.participant_name}.tanc.json`)
}

async function generateParticipantLNRVC(folder: string, data: any) {
    const notaryService = "https://registrationnumber.notary.lab.gaia-x.eu/v1-staging/registrationNumberVC";
    const fileContent = readFileSync(resolve('src/gaia-x_compliance/', 'templates/lrn-request.hbs'), 'utf-8');
    const lnrRequestTemplate = Handlebars.compile(fileContent);
    const lnrRequest = lnrRequestTemplate(data);
    try {
        const response = await axios.post(
            `${notaryService}?vcid=https://${data.issuer_domain}/.well-known/${data.participant_name}.lrn.json`,
            JSON.parse(lnrRequest));
        if (response.status === 200) {
            const lrn = response.data;
            writeFileSync(resolve(folder, data.participant_name + '.lrn.json'),
                JSON.stringify(lrn, null, 2), 'utf-8');
            console.log(`Legal Registration Number for ${data.participant_legal_name} ` +
                `successfully generated and stored in ${data.participant_name}.lrn.json`);
        } else {
            console.error(`Error generating Legal Registration Number for ${data.participant_legal_name}`);
            console.error(response?.data);
        }
    } catch (e) {
        console.error(`Error generating Legal Registration Number for ${data.participant_legal_name}`);
        console.error((e as AxiosError).response?.data);
    }
}

async function generateParticipantVP(folder:string, data: any) {
    const complianceService = "https://compliance.lab.gaia-x.eu/v1-staging/api/credential-offers";
    const vp = {
        "@context": "https://www.w3.org/2018/credentials/v1",
        "type": "VerifiablePresentation",
        "verifiableCredential": [
            JSON.parse(readFileSync(resolve(folder, data.participant_name + '.participant.json'), 'utf-8')),
            JSON.parse(readFileSync(resolve(folder, data.participant_name + '.tandc.json'), 'utf-8')),
            JSON.parse(readFileSync(resolve(folder, data.participant_name + '.lrn.json'), 'utf-8'))
        ]
    };
    try {
        const response = await axios.post(`${complianceService}?` +
            `vcid=https://${data.issuer_domain}/.well-known/${data.participant_name}.compliance.json`, vp);
        if (response.status === 201) {
            const lrn = response.data;
            writeFileSync(resolve(folder, data.participant_name + '.compliance.json'),
                JSON.stringify(lrn, null, 2), 'utf-8');
            console.log(`Gaia-X Compliance verified for ${data.participant_legal_name} credentials ` +
                `and stored in ${data.participant_name}.compliance.json`);
        } else {
            console.error(`Error generating Compliance for ${data.participant_legal_name}`);
            console.error(response?.data);
        }
    } catch (e) {
        console.error(`Error generating Compliance for ${data.participant_legal_name}`);
        console.error((e as AxiosError).response?.data);
    }
}

if (argv.length < 3) {
    console.log('Usage: npm run generate-participant-vcs -- <participant.data.json> <did.json>');
    process.exit(1);
} else {
    const folder = dirname(argv[2]);
    const participantData = JSON.parse(readFileSync(argv[2], 'utf-8'));
    participantData.issuance_date = new Date().toISOString();
    const didJson = JSON.parse(readFileSync(argv[3], 'utf-8'));
    participantData.issuer_domain = didJson.id.substring(didJson.id.lastIndexOf(':') + 1)
    console.log(`Generating Gaia-X credentials for participant ${participantData.participant_legal_name} ` +
        `with issuer ${participantData.issuer_domain}`);

    const pkcs1 = readFileSync(resolve(dirname(argv[3]), 'certificate.key'), 'utf-8');
    const key = createPrivateKey(pkcs1);
    const signer: Signer = new GaiaXSignatureSigner({
        privateKey: key,
        privateKeyAlg: didJson.verificationMethod[0].publicKeyJwk.alg,
        verificationMethod: didJson.verificationMethod[0].id
    })

    Promise.all([
        generateParticipantVC(folder, participantData, signer),
        generateParticipantTandCVC(folder, participantData, signer),
        generateParticipantLNRVC(folder, participantData)])
        .then(() => {
            generateParticipantVP(folder, participantData)
        });
}
