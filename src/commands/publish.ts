import {Args, Command, Flags} from '@oclif/core'
import * as fs from 'node:fs'
import * as vm from 'node:vm'
import * as ts from 'typescript'
import {publishFromFile} from '../lib/publishFromFile'
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
    path: Args.directory({
      description: 'Path to the JSON/YAML or TS file describing the asset to publish',
      required: true,
    }),
  }
  static description = 'Publish the asset as instructed in the provided script folder.'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> samples/publish/algo/spec.json',
    '<%= config.bin %> <%= command.id %> samples/publish/algo/spec.yaml',
    '<%= config.bin %> <%= command.id %> samples/publish/algo/index.ts',
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
      default: 'https://provider.agrospai.udl.cat',
    }),
  }

  async run(): Promise<string | void> {
    const {args, flags} = await this.parse(Publish)
    const connection = await Connection.connect()

    this.log(`Publishing asset ${args.path} in provider ${flags.provider} from wallet ${connection.wallet.address}`)

    try {
      if (args.path.endsWith('.ts')) {
        const dirPath = args.path.split('/').slice(0, -1).join('/')
        await invokeFunctionFromFile(args.path, 'publish', dirPath, connection, flags.provider, flags['dry-run'])
      } else if (args.path.endsWith('.json') || args.path.endsWith('.yaml')) {
        return await publishFromFile(args.path, flags.provider, connection, flags['dry-run'])
      } else {
        this.error('The provided file must be a .json/.yaml or .ts file')
      }
    } catch (error) {
      this.error(error as string)
    }
  }
}
