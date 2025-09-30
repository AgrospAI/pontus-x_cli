import {includeIgnoreFile} from '@eslint/compat'
import oclif from 'eslint-config-oclif'
import prettier from 'eslint-config-prettier'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const gitignorePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.gitignore')

import {defineConfig} from 'eslint/config'

export default defineConfig([
  includeIgnoreFile(gitignorePath),
  ...oclif,
  prettier,
  {
    ignores: ['samples/**'],
  },
  {
    rules: {
      // Turn off to support Node 18. You can remove this rule if you don't need to support Node 18.
      '@typescript-eslint/no-explicit-any': 'off',
      'max-params': 'off',
      'mocha/no-global-tests': 'off',
      'mocha/no-top-level-hooks': 'off',
      'unicorn/prefer-module': 'off',
    },
  },
])
