import Login from '../../src/commands/login'
import Logout from '../../src/commands/logout'
import {PRIVATE_KEY_PASSWORD, PRIVATE_KEY_PATH} from '../config'
import {getEnvVariable} from './env-mock'

/**
 * Wraps a test body with login/logout
 */
export function withLogin(fn: () => Promise<void>) {
  return async () => {
    try {
      await Login.run([PRIVATE_KEY_PATH, '-p', PRIVATE_KEY_PASSWORD])
      process.env.PRIVATE_KEY = getEnvVariable('PRIVATE_KEY') ?? ''
      await fn()
    } finally {
      await Logout.run([])
    }
  }
}
