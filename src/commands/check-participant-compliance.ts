import {Command, Flags} from '@oclif/core'
import axios, {AxiosError} from 'axios'
import {readFileSync, writeFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'

export default class CheckParticipantCompliance extends Command {
  static description = 'Use Gaia-X Compliance to check a participant Verifiable Presentation'
  static examples: Command.Example[] = ['<%= config.bin %> <%= command.id %> -p ./CEP.data.json --vp ./CEP.vp.json']
  static flags = {
    participant: Flags.string({
      char: 'p',
      description: 'Path to the JSON file including the required participant data',
      required: true,
    }),
    vp: Flags.string({
      description: 'Path to the participant Verifiable Presentation file',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(CheckParticipantCompliance)
    const complianceService = 'https://compliance.lab.gaia-x.eu/v1/api/credential-offers'
    const folder = dirname(flags.participant)
    const participantData = JSON.parse(readFileSync(flags.participant, 'utf8'))
    const vp = JSON.parse(readFileSync(flags.vp, 'utf8'))

    await axios
      .post(
        `${complianceService}?` +
          `vcid=https://${participantData.issuer_domain}/.well-known/${participantData.participant_name}.compliance.json`,
        vp,
      )
      .then((response) => {
        if (response.status === 201) {
          const compliance = response.data
          writeFileSync(
            resolve(folder, participantData.participant_name + '.compliance.json'),
            JSON.stringify(compliance, null, 2),
            'utf8',
          )
          console.log(
            `Gaia-X Compliance verified for ${participantData.participant_legal_name} credentials ` +
              `and stored in ${participantData.participant_name}.compliance.json`,
          )
        } else {
          console.error(`Error generating Compliance for ${participantData.participant_legal_name}`)
          console.error(response?.data)
        }
      })
      .catch((error) => {
        console.error(`Error generating Compliance for ${participantData.participant_legal_name}`)
        console.error((error as AxiosError).response?.data)
        throw error
      })
  }
}
