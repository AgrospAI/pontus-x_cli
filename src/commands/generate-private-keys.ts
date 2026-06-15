import { Command, Flags } from '@oclif/core'
import { mnemonicToSeedSync } from 'bip39'
import { hdkey } from 'ethereumjs-wallet'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import readlineSync from 'readline-sync'

export default class GeneratePrivateKeys extends Command {
  static description =
    'Export accounts derived from a mnemonic phrase as encrypted JSON files, to use later with the login command or for Pontus-X portals automation'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --count 5 --output-dir ./keys',
  ]
  static flags = {
    count: Flags.integer({
      char: 'c',
      description: 'Number of accounts to generate (default is 1)',
      default: 1,
      required: false,
    }),
    'output-dir': Flags.string({
      char: 'o',
      description: 'Directory to save the encrypted JSON files (default is current directory)',
      required: false,
      default: '.',
    }),
    password: Flags.string({
      char: 'p',
      description: 'Password to encrypt the key files',
      required: false,
    }),
    mnemonic: Flags.string({
      char: 'm',
      description: 'Your BIP39 mnemonic phrase',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(GeneratePrivateKeys)

    const mnemonic =
      flags.mnemonic ??
      readlineSync.question(
        '\nExporting accounts from a mnemonic phrase as encrypted JSON files...\n' +
          'Please paste your BIP39 mnemonic phrase (12 or 24 words): ',
        { hideEchoBack: true },
      )

    const password =
      flags.password ??
      readlineSync.question('Enter a password to encrypt all generated key files: ', { hideEchoBack: true })

    const seed = mnemonicToSeedSync(mnemonic)
    const root = hdkey.fromMasterSeed(seed)

    if (!fs.existsSync(flags['output-dir'])) {
      fs.mkdirSync(flags['output-dir'], { recursive: true })
    }

    console.log(`\nGenerating ${flags.count} account(s)...\n`)

    for (let i = 0; i < flags.count; i++) {
      const derivationPath = `m/44'/60'/0'/0/${i}`
      const child = root.derivePath(derivationPath)
      const account = child.getWallet()
      const address = account.getAddress().toString('hex')

      console.log(`[${i}] Address: 0x${address} (${derivationPath})`)

      await account
        .toV3(password, {
          dklen: 32,
          kdf: 'scrypt',
          n: 2 ** 14,
          p: 1,
          r: 8,
          salt: crypto.randomBytes(32),
        })
        .then(value => {
          const file = path.join(flags['output-dir'], `${address}.json`)
          fs.writeFileSync(file, JSON.stringify(value))
          console.log(`    Saved to ${file}`)
        })
    }

    console.log('\nDone.\n')
  }
}
