import {Args, Command, Flags} from '@oclif/core'
import * as fs from 'node:fs'
import * as vm from 'node:vm'
import * as ts from 'typescript'

import {Connection} from '../utils/connection'

async function invokeFunctionFromFile(filePath: string, functionName: string, ...args: any[]) {
  // Read the TypeScript file content
  const tsContent = fs.readFileSync(filePath, 'utf8')

  // Transpile TypeScript to JavaScript
  const jsContent = ts.transpileModule(tsContent, {
    compilerOptions: {module: ts.ModuleKind.CommonJS},
  }).outputText

  // Create a new context for the script
  const script = new vm.Script(jsContent)
  const context = vm.createContext({console, exports, module, require})

  // Run the script in the context
  script.runInContext(context)

  // Invoke the function by name
  if (typeof context[functionName] === 'function') {
    return context[functionName](...args)
  }

  throw new Error(`Function ${functionName} not found in ${filePath}`)
}

export default class Publish extends Command {
  static args = {
    scriptFolder: Args.directory({
      description: 'Path to the script folder',
      required: true,
    }),
  }
  static description = 'Publish the asset as instructed in the provided script folder.'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> -p https://provider.agrospai.udl.cat samples/publish/downloadable-data',
    '<%= config.bin %> <%= command.id %> -p https://provider.agrospai.udl.cat samples/publish/algo --dry-run',
  ]
  static flags = {
    'dry-run': Flags.boolean({
      default: false,
      description: 'Dry run the publishing process',
    }),
    provider: Flags.string({
      char: 'p',
      description: 'The Provider URL',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Publish)
    const connection = await Connection.connect()

    this.log(
      `Publishing asset ${args.scriptFolder} in provider ${flags.provider} from wallet ${connection.wallet.address}`,
    )
    try {
      await invokeFunctionFromFile(
        `${args.scriptFolder}/index.ts`,
        'publish',
        args.scriptFolder,
        connection,
        flags.provider,
        flags['dry-run'],
      )
    } catch (error) {
      this.error(error as string)
    }
  }
}
