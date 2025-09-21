import {Args, Command, Flags} from '@oclif/core'
import dotenv from 'dotenv'
import Wallet from 'ethereumjs-wallet'
import {readFileSync, writeFileSync} from 'node:fs'
import readlineSync from 'readline-sync'

dotenv.config()

export default class Login extends Command {
  static args = {
    keyFile: Args.file({
      description: 'Path to the keyFile.json',
      required: true,
    }),
  }
  static description = 'Login to retrieve your private key from a JSON key store and store it in .env'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> d999baae98ac5246568fd726be8832c49626867d.json',
  ]
  static flags = {
    password: Flags.string({
      char: 'p',
      description: 'Password to decrypt the key file',
      env: 'PASSWORD',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Login)
    const keyFileName = args.keyFile
    const keyStore = JSON.parse(readFileSync(keyFileName, 'utf8'))
    const password =
      flags.password === undefined
        ? readlineSync.question(`Enter the password to decrypt the key file ${keyFileName}: `, {
            hideEchoBack: true,
          })
        : flags.password

    const wallet = await Wallet.fromV3(keyStore, password)
    this.log('Storing your private key for this session with Pontus-X CLI, do not forget to logout.\n')
    const envConfig = dotenv.parse(readFileSync('.env', 'utf8'))
    envConfig.PRIVATE_KEY = wallet.getPrivateKeyString()
    const updatedEnvConfig = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    writeFileSync('.env', updatedEnvConfig, 'utf8')
  }
}
