import {test, expect} from 'vitest'
import {withLogin} from '../helpers/login'
import Compute from '../../src/commands/compute'
import ComputeResults from '../../src/commands/compute-results'
import ComputeStatus from '../../src/commands/compute-status'
import {getAssets} from '../helpers/assets'

const algorithmDid = getAssets().algorithm1Did
const datasetDid = getAssets().dataset2Did

test(
  'compute job works',
  withLogin(async () => {
    const computeJob = await Compute.run([algorithmDid, '-d', datasetDid, '-y'])
    expect(computeJob).toBeDefined()
    const firstJob = Array.isArray(computeJob) ? computeJob[0] : computeJob
    const jobDid = firstJob?.jobId
    expect(jobDid).toBeDefined()
    await ComputeResults.run([jobDid as string])
    await ComputeStatus.run([jobDid as string])
  }),
)
