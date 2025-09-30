import {test} from 'vitest'

import GenerateAssetCredentials from '../../src/commands/generate-asset-credentials'
import {withLogin} from '../helpers/login'

const DID = 'did:op:01f8bc1e797a854dc718bd7a802acb07c5fc39f706b03dd454bceb66be6828c6'
const CERTIFICATE = 'samples/data/certificate.key'
const DIDJSON = 'samples/data/did.json'
const PARTICIPANT = 'samples/data/CEP.data.json'

test(
  'generate-asset-credentials command works with valid PARTICIPANT, DIDJSON, and CERTIFICATE',
  withLogin(async () => {
    await GenerateAssetCredentials.run(['-p', PARTICIPANT, '-d', DIDJSON, '-c', CERTIFICATE, '-w', '', DID])
  }),
  30_000,
)
