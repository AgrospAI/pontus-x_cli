import {afterEach, beforeEach, vi} from 'vitest'

import {resetEnvContent, setupEnvFsMock} from './helpers/env-mock'

let consoleOutput: string[] = []
export {consoleOutput}

setupEnvFsMock()

beforeEach(() => {
  // Capture console.log output
  consoleOutput = []
  vi.spyOn(console, 'log').mockImplementation((...args) => {
    consoleOutput.push(args.join(' '))
  })

  // Set required env variables for tests
  process.env.NETWORK = 'PONTUSXDEV'

  // Reset in-memory .env before each test
  resetEnvContent()
})

afterEach(() => {
  vi.restoreAllMocks()
})
