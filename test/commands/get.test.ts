import {test} from 'vitest'

import Get from '../../src/commands/get'
import {withLogin} from '../helpers/login'

const TEST_DID = 'did:op:ffeee8c8f19328985ef6743b08e61ef89d5141027fd47612e32e7900cacd2b7a'

test(
  'get command retrieves asset metadata after login',
  withLogin(async () => {
    await Get.run([TEST_DID])
  }),
)
