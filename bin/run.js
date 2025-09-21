#!/usr/bin/env ts-node

// eslint-disable-next-line n/no-unpublished-import
import '../src/index.ts'

  // eslint-disable-next-line unicorn/prefer-top-level-await
  ; (async () => {
    const oclif = await import('@oclif/core')
    await oclif.execute({ dir: __dirname })
  })()
