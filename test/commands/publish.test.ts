import {expect, test, vi} from 'vitest'

import Publish from '../../src/commands/publish'
import {withLogin} from '../helpers/login'
import {extractJson} from '../helpers/parser'

const SCRIPT_FOLDER = 'samples/publish/downloadable-data/index.ts'

test(
  'publish command works with valid script folder after login',
  withLogin(async () => {
    const result = await Publish.run([SCRIPT_FOLDER, '--dry-run'])
    console.log('Publish result:', result)
    console.log('Publish command executed successfully')
  }),
)

test(
  'publish command output is the same for json, yaml and ts files',
  withLogin(async () => {
    // Array of sample folder paths that contain spec.json, spec.yaml and index.ts
    const sampleFolders = [
      'samples/publish/algo',
      'samples/publish/basic-predictor',
      'samples/publish/data',
      'samples/publish/downloadable-data',
      'samples/publish/forecasting',
      'samples/publish/forecasting-data',
    ]

    // Spy on console.log to capture output
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    try {
      const runAndExtract = async (file: string) => {
        await Publish.run([file, '--dry-run'])
        const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n')
        consoleLogSpy.mockClear()

        if (!output) {
          throw new Error(`Publish command returned empty output for file: ${file}`)
        }

        return extractJson(output)
      }

      // Test each sample folder in parallel
      await Promise.all(
        sampleFolders.map(async (folder) => {
          console.log(`Testing folder: ${folder}`)

          const [jsonObject, yamlObject, tsObject] = await Promise.all([
            runAndExtract(`${folder}/spec.json`),
            runAndExtract(`${folder}/spec.yaml`),
            runAndExtract(`${folder}/index.ts`),
          ])

          expect(jsonObject).toEqual(yamlObject)
          expect(jsonObject).toEqual(tsObject)
        }),
      )
    } finally {
      // Restore console.log
      consoleLogSpy.mockRestore()
    }
  }),
)
