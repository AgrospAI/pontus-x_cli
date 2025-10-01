import {GaiaXSignatureSigner, VerifiableCredential} from '@gaia-x/json-web-signature-2020'
import {Signer} from '@gaia-x/json-web-signature-2020/dist/src/signer/signer'
import axios, {AxiosError} from 'axios'
import * as Handlebars from 'handlebars'
import {createPrivateKey} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'

function generateSignedDocument(data: any, templateFile: string, signer: Signer): Promise<VerifiableCredential> {
  const fileContent = readFileSync(resolve(__dirname, 'templates', templateFile), 'utf8')
  const template = Handlebars.compile(fileContent, {noEscape: true})
  const document: Omit<VerifiableCredential, 'proof'> = JSON.parse(template(data))
  return signer.sign(document)
}

async function generateParticipantVC(data: any, signer: Signer) {
  console.log(__dirname)
  const participantVCSigned: VerifiableCredential = await generateSignedDocument(data, 'participant.hbs', signer)
  console.log(`Verifiable Credential for participant ${data.participant_legal_name} successfully generated`)
  return participantVCSigned
}

async function generateParticipantTandCVC(data: any, signer: Signer) {
  const tandcVCSigned: VerifiableCredential = await generateSignedDocument(data, 'tandc.hbs', signer)
  console.log(`Signed Terms and Conditions for ${data.participant_legal_name} successfully generated`)
  return tandcVCSigned
}

async function generateParticipantLNRVC(data: any) {
  const notaryService = 'https://gx-notary.arsys.es/v1/registrationNumberVC'
  const fileContent = readFileSync(resolve(__dirname, 'templates', 'lrn-request.hbs'), 'utf8')
  const lnrRequestTemplate = Handlebars.compile(fileContent)
  const lnrRequest = lnrRequestTemplate(data)
  try {
    const response = await axios.post(
      `${notaryService}?vcid=https://${data.issuer_domain}/.well-known/${data.participant_name}.vp.json%23lrn`,
      JSON.parse(lnrRequest),
    )
    if (response.status === 200) {
      console.log(
        `Verifiable Credential for ${data.participant_legal_name} Legal Registration Number` +
          ` successfully generated`,
      )
      return response.data
    }

    console.error(`Error generating Legal Registration Number for ${data.participant_legal_name}`)
    console.error(response?.data)
  } catch (error) {
    console.error(`Error generating Legal Registration Number for ${data.participant_legal_name}`)
    console.error((error as AxiosError).response?.data)
  }

  return null
}

function generateParticipantVP(participantVC: any, tandcVC: any, lrnVC: any, folder: string, data: any) {
  const vp = {
    '@context': 'https://www.w3.org/2018/credentials/v1',
    type: 'VerifiablePresentation',
    verifiableCredential: [participantVC, lrnVC, tandcVC],
  }
  writeFileSync(resolve(folder, data.participant_name + '.vp.json'), JSON.stringify(vp, null, 2), 'utf8')
  console.log(
    `Verifiable Presentation of the credentials for ${data.participant_legal_name} ` +
      `generated and stored in ${data.participant_name}.vp.json`,
  )
}

function generateAssetVP(
  participantVC: any,
  tandcVC: any,
  lrnVC: any,
  assetVC: any,
  folder: string,
  data: any,
  ddo: any,
) {
  const assetData = extractAssetFromDDO(ddo)
  const vp = {
    '@context': 'https://www.w3.org/2018/credentials/v1',
    type: 'VerifiablePresentation',
    verifiableCredential: [participantVC, lrnVC, tandcVC, assetVC],
  }
  const dirPath = folder + '/' + data.participant_name
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, {recursive: true})
  }

  writeFileSync(
    resolve(dirPath, `${ddo.datatokens[0].symbol}_${assetData.network}.vp.json`),
    JSON.stringify(vp, null, 2),
    'utf8',
  )
  console.log(
    `Verifiable Presentation of the credentials for ${ddo.metadata.name} ` +
      `generated and stored in ${data.participant_name}/${ddo.datatokens[0].symbol}.${assetData.network}.vp.json`,
  )
}

function extractAssetFromDDO(ddo: any) {
  return {
    chainId: ddo.chainId,
    containsPII: ddo.metadata.additionalInformation?.containsPII || false,
    did: ddo.id,
    license: ddo.metadata.license,
    network: ddo.chainId === 32_456 ? 'devnet' : 'testnet',
    nftAddress: ddo.nftAddress,
    ownerAccount: ddo.nft.owner,
    serviceDescription: JSON.stringify(ddo.metadata.description).slice(1, -1),
    serviceEndpoint: ddo.services[0].serviceEndpoint,
    serviceName: ddo.metadata.name,
    servicePrice: ddo.stats.price.value,
    serviceTimeout: ddo.services[0].timeout === 0 ? 'unlimited' : ddo.services[0].timeout,
    serviceType: ddo.services[0].type,
    tokenAddress: ddo.datatokens[0].address,
    tokenName: ddo.datatokens[0].name,
    tokenSymbol: ddo.datatokens[0].symbol,
    type: ddo.metadata.type,
  }
}

async function generateAssetVC(ddo: any, participantData: any, signer: Signer) {
  if (!ddo) return null
  const assetData = extractAssetFromDDO(ddo)
  const templateFile: string = assetData.type === 'dataset' ? 'dataset.hbs' : 'service.hbs'
  const assetVCSigned: VerifiableCredential = await generateSignedDocument(
    {...assetData, ...participantData},
    templateFile,
    signer,
  )
  console.log(`Verifiable Credential for asset ${assetData.serviceName} successfully generated`)
  return assetVCSigned
}

export async function generateCredentials(
  participantDataFile: string,
  didjsonFile: string,
  certificateKeyFile: string,
  password: string,
  ddo?: any,
) {
  const folder = dirname(participantDataFile)
  const participantData = JSON.parse(readFileSync(participantDataFile, 'utf8'))
  participantData.issuanceDate = new Date().toISOString()
  const didJson = JSON.parse(readFileSync(didjsonFile, 'utf8'))
  participantData.issuerDomain = didJson.id.slice(Math.max(0, didJson.id.lastIndexOf(':') + 1))
  console.log(`Asset DDO: ${ddo ? JSON.stringify(ddo, null, 2) : 'N/A'}`)
  console.log(
    `Generating Gaia-X credentials for ` + ddo
      ? `asset ${ddo?.metadata?.name}`
      : `participant ${participantData.participantLegalName} with issuer ${participantData.issuerDomain}`,
  )

  const pkcs1 = readFileSync(certificateKeyFile, 'utf8')
  const key = createPrivateKey({key: pkcs1, passphrase: password})
  const signer: Signer = new GaiaXSignatureSigner({
    privateKey: key,
    privateKeyAlg: didJson.verificationMethod[0].publicKeyJwk.alg,
    verificationMethod: didJson.verificationMethod[0].id,
  })

  await Promise.all([
    generateParticipantVC(participantData, signer),
    generateParticipantTandCVC(participantData, signer),
    generateParticipantLNRVC(participantData),
    generateAssetVC(ddo, participantData, signer),
  ]).then(([participantVC, tandcVC, lrnVC, assetVC]) => {
    if (participantVC && tandcVC && lrnVC && assetVC) {
      generateAssetVP(participantVC, tandcVC, lrnVC, assetVC, folder, participantData, ddo)
    } else if (participantVC && tandcVC && lrnVC) {
      generateParticipantVP(participantVC, tandcVC, lrnVC, folder, participantData)
    } else {
      console.error('Error with one of the credentials, therefore the Verifiable Presentation was not generated')
    }
  })
}
