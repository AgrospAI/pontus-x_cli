import {test} from 'vitest'

import ComputeStatus from '../../src/commands/compute-status'
import {withLogin} from '../helpers/login'

const JOB_ID = '215bae450c8f40f59bfc5d1ccada3931'
const PROVIDER_URL = 'https://provider.agrospai.udl.cat'

test(
  'compute-status command works with valid JOB_ID and PROVIDER_URL',
  withLogin(async () => {
    await ComputeStatus.run([JOB_ID, '-p', PROVIDER_URL])
  }),
)
