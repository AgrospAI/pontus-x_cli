import {Command, Flags} from '@oclif/core'
import wallet from 'ethereumjs-wallet'
import fs from 'node:fs'
import readlineSync from 'readline-sync'
import crypto from 'crypto'

export default class ExportPrivateKey extends Command {
  static description =
    'Export your private key as a JSON file, to use later with the login command or for Pontus-X portals automation'
  static examples: Command.Example[] = ['<%= config.bin %> <%= command.id %>']
  static flags = {
    password: Flags.string({
      char: 'p',
      description: 'Password to encrypt the private key file',
      required: false,
    }),
    privateKey: Flags.string({
      char: 'k',
      description: 'Your private key',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(ExportPrivateKey)

    if (flags.privateKey && flags.privateKey.startsWith('0x')) {
      flags.privateKey = flags.privateKey.slice(2)
    }

    const pk =
      flags.privateKey ??
      readlineSync.question(
        '\nExporting your private key as a JSON file... \n' +
          'First, get a copy of your private key from Metamask.\n' +
          '\t 1.) On the upper right menu, select "Account details", then "Show private key". \n' +
          '\t 2.) After providing your MetaMask password and revealing, click the button to copy it. \n' +
          '\t 3.) Then, please, paste your private key here: ',
        {hideEchoBack: true},
      )

    const pkBuffer = Buffer.from(pk, 'hex')
    const account = wallet.fromPrivateKey(pkBuffer)

    const password =
      flags.password ??
      readlineSync.question('Finally, to securely store your private key, please, enter a password to encrypt it: ', {
        hideEchoBack: true,
      })

    const address = account.getAddress().toString('hex')
    console.log(`Generating encrypted file to store your private key, which corresponds to you account ${address}`)

    account.toV3(password, {
        kdf: "scrypt",
        n: 1 << 14,       // cost factor (default is 2**18)
        r: 8,
        p: 1,
        dklen: 32,
        salt: crypto.randomBytes(32)
    }).then(value => {
      const file = `${address}.json`
      fs.writeFileSync(file, JSON.stringify(value))
      console.log(`Your encrypted private key has been saved to ${file}\n`)
    })
  }
}
