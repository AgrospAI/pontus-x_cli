import {test} from 'vitest'

import Get from '../../src/commands/get'
import {withLogin} from '../helpers/login'
import {getAssets} from '../helpers/assets'

const did = getAssets().dataset1Did

test(
  'get command retrieves asset metadata after login',
  withLogin(async () => {
    await Get.run([did])
  }),
)
