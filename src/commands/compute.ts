import {Args, Command, Flags} from '@oclif/core'
import readlineSync from 'readline-sync'

import {Connection} from '../utils/connection'
import { ComputeJob } from '@oceanprotocol/lib';

export default class Compute extends Command {
  static args = {
    algo: Args.string({description: 'Algorithm DID', required: true}),
  }
  static description = 'Compute the algorithm on one or more datasets.'
  static examples: Command.Example[] = [
    '<%= config.bin %> <%= command.id %> did:op:34e2ff9baf030318b13ff3940ab0885bb11fee49a8597123392983f5a0db8a35 -d did:op:d8a36ff74d36e54ce245d27689330fc39debb2fdfeac09d4a08b24b68cf5053d',
  ]
  static flags = {
    datasets: Flags.string({
      char: 'd',
      description: 'Dataset DIDs',
      multiple: true,
      required: true,
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'Automatic yes to prompts',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<ComputeJob | ComputeJob[] | void> {
    const {args, flags} = await this.parse(Compute)
    const {algo} = args
    const {datasets} = flags
    const connection = await Connection.connect()
    if (flags.yes || readlineSync.keyInYNStrict(`Computing algorithm ${algo} on datasets [${datasets.join(', ')}]? `)) {
      try {
        const firstDatasetAsset = await connection.nautilus.getAquariusAsset(datasets[0])
        const provider = firstDatasetAsset.services[0].serviceEndpoint
        const dataset = {
          did: datasets[0],
        }
        const algorithm = {did: algo}
        const additionalDatasets = datasets.filter((_, i) => i > 0).map((dataset) => ({did: dataset}))
        const computeJob = await connection.nautilus.compute({
          additionalDatasets,
          algorithm,
          dataset,
        })

        if (Array.isArray(computeJob)) {
          for (const job of computeJob)
            this.log(
              `Compute started, check status using command:\n pontus-x_cli compute-status ${job.jobId} -p ${provider}\n`,
            )
        } else {
          this.log(
            `Compute started, check status using command:\n pontus-x_cli compute-status ${computeJob.jobId} -p ${provider}\n`,
          )
        }
        return computeJob
      } catch (error) {
        this.error(`Error starting compute: ${error}`)
      }
    }
  }
}
