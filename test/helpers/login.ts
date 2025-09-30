import Login from '../../src/commands/login'
import Logout from '../../src/commands/logout'
import {getEnvVariable} from './env-mock'

const LOGIN_PATH = 'samples/data/d999baae98ac5246568fd726be8832c49626867d.json'

/**
 * Wraps a test body with login/logout
 */
export function withLogin(fn: () => Promise<void>) {
  return async () => {
    try {
      await Login.run([LOGIN_PATH, '-p', ''])
      process.env.PRIVATE_KEY = getEnvVariable('PRIVATE_KEY') ?? ''
      await fn()
    } finally {
      await Logout.run([])
    }
  }
}
