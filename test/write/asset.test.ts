import {describe, expect, test} from 'vitest'
import Access from '../../src/commands/access'
import ChangePrice from '../../src/commands/change-price'
import Compute from '../../src/commands/compute'
import ComputeResults from '../../src/commands/compute-results'
import ComputeStatus from '../../src/commands/compute-status'
import EditAlgo from '../../src/commands/edit-algo'
import EditAssetUrl from '../../src/commands/edit-asset-url'
import EditTrustedAlgos from '../../src/commands/edit-trusted-algos'
import SelfDescription from '../../src/commands/self-description'
import {getAssets} from '../helpers/assets'
import {withLogin} from '../helpers/login'

describe('Asset Commands', () => {
  test(
    'access command works with valid DID after login',
    withLogin(async () => {
      const did = getAssets().dataset1Did
      await Access.run([did])
    }),
  )

  test(
    'change-price command updates asset price',
    withLogin(async () => {
      const did = getAssets().dataset2Did
      const randomAmount = (Math.floor(Math.random() * 1000) + 1) / 100
      await ChangePrice.run([did, randomAmount.toString(), '-y'])
    }),
    30_000,
  )

  test(
    'edit-asset-url command updates asset URL',
    withLogin(async () => {
      const did = getAssets().dataset1Did
      const newUrl = 'https://raw.githubusercontent.com/plotly/datasets/refs/heads/master/titanic.csv'
      await EditAssetUrl.run([did, newUrl, '-y'])
    }),
    30_000,
  )

  test(
    'edit-algo command updates algorithm details',
    withLogin(async () => {
      const did = getAssets().algorithm2Did

      const randomTag = ((Math.floor(Math.random() * 1000) + 1) / 100).toString()
      await EditAlgo.run([
        did,
        'rogargon/pandas-profiling',
        randomTag,
        'sha256:81dca5439f07dff4d56097546a9fce7335be3de8e2622dc105c64e54376f86b5',
        'python /algorithm/src/main.py',
        '-y',
      ])
    }),
    30_000,
  )

  test('edit-trusted-algos command updates trusted algorithms', async () => {
    const datasetDid = getAssets().dataset2Did
    const algorithm1Did = getAssets().algorithm1Did
    const algorithm2Did = getAssets().algorithm2Did
    await EditTrustedAlgos.run([datasetDid, '--algos', algorithm1Did, algorithm2Did, '-y'])
  }, 30_000)

  test(
    'self-description command attaches self-description to asset',
    withLogin(async () => {
      const algorithmDid = getAssets().algorithm1Did
      const sdUrl = 'https://example.com/self-description.json'
      await SelfDescription.run([algorithmDid, sdUrl, '-y'])
    }),
    30_000,
  )
})

describe('Compute Asset Commands', () => {
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
    60_000,
  )
})

export const concurrent = false
