import {test} from 'vitest'

import CheckPariticipantCompliance from '../../src/commands/check-participant-compliance'

const PARTICIPANT = 'samples/data/CEP.data.json'
const VP = 'samples/data/CEP.vp.json'

test('check-participant-compliance command works with valid PARTICIPANT and VP', async () => {
  await CheckPariticipantCompliance.run(['-p', PARTICIPANT, '--vp', VP])
}, 30_000)
