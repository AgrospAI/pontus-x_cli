import {resolve} from 'node:path'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Force nautilus imports to use the CJS build
      '@deltadao/nautilus': resolve(__dirname, 'node_modules/@deltadao/nautilus/_cjs/index.js'),
    },
  },
  test: {
    env: {
      NODE_NO_WARNINGS: '1',
    },
    setupFiles: [resolve(__dirname, 'test/setup.ts')],
    // Enable test grouping and filtering
    testTimeout: 30_000, // Default timeout for most tests
    // Configure different test patterns
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
