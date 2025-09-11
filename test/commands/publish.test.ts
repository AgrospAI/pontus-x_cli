import {test} from 'vitest'

import Publish from '../../src/commands/publish'
import {withLogin} from '../helpers/login'

const PROVIDER = 'https://provider.agrospai.udl.cat'
const SCRIPT_FOLDER = 'samples/publish/downloadable-data'

test(
  'publish command works with valid script folder after login',
  withLogin(async () => {
    const result = await Publish.run([SCRIPT_FOLDER, '-p', PROVIDER, '--dry-run'])
    console.log('Publish result:', result)
    console.log('Publish command executed successfully')
  }),
)
