import {test} from 'vitest'

import Access from '../../src/commands/access'
import {withLogin} from '../helpers/login'

const ACCESS_DID = 'did:op:af3e93c4f18903f91b108e7204b8a752e7605f4547ed507212bd6aca63af5686'

test(
  'access command works with valid DID after login',
  withLogin(async () => {
    await Access.run([ACCESS_DID])
  }),
)
