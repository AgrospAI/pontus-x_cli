import {expect, test} from 'vitest'

import {getEnvVariable} from '../helpers/env-mock'
import {withLogin} from '../helpers/login'

test(
  'run login writes PRIVATE_KEY',
  withLogin(async () => {
    expect(getEnvVariable('PRIVATE_KEY')).not.toBeNull()
  }),
)
