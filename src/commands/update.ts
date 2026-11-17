import { Command } from '@oclif/core'
import { offerUpdate } from '../lib/update'

export default class Update extends Command {
  static description = 'Check for a newer CLI version and offer to install it with npm'
  static examples = ['<%= config.bin %> update']

  async run(): Promise<void> {
    await this.parse(Update)
    await offerUpdate({ cacheDir: this.config.cacheDir, version: this.config.version, force: true })
  }
}
