import {expect, test} from 'vitest'

import Logout from '../../src/commands/logout'
import {getEnvVariable} from '../helpers/env-mock'
import {withLogin} from '../helpers/login'

test(
  'run logout removes PRIVATE_KEY',
  withLogin(async () => {
    await Logout.run([])
    expect(getEnvVariable('PRIVATE_KEY')).toBeNull()
  }),
)
