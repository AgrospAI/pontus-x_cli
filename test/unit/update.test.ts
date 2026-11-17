import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:child_process', () => ({ spawn: vi.fn() }))
vi.mock('@inquirer/prompts', () => ({ confirm: vi.fn() }))
import { spawn } from 'node:child_process'
import { confirm } from '@inquirer/prompts'
import { checkForUpdate, installUpdate, offerUpdate, UPDATE_TTL } from '@/lib/update'
import hook from '@/hooks/init/update'

let cacheDir: string
const fetchMock = vi.fn()
const stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')
const stderrTTY = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY')
const options = () => ({ cacheDir, version: '2.0.5' })
beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'cli-update-'))
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ version: '2.1.0' }) })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true })
  Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: true })
  vi.mocked(confirm).mockReset().mockResolvedValue(false)
  vi.mocked(spawn)
    .mockReset()
    .mockImplementation(() => {
      const child = new EventEmitter()
      queueMicrotask(() => child.emit('exit', 0))
      return child as any
    })
})
afterEach(async () => {
  vi.unstubAllGlobals()
  if (stdinTTY) Object.defineProperty(process.stdin, 'isTTY', stdinTTY)
  else delete process.stdin.isTTY
  if (stderrTTY) Object.defineProperty(process.stderr, 'isTTY', stderrTTY)
  else delete process.stderr.isTTY
  await rm(cacheDir, { recursive: true, force: true })
})

describe('CLI updates', () => {
  it('caches release checks for 24 hours and refreshes at expiry', async () => {
    await checkForUpdate(options())
    await checkForUpdate(options())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await writeFile(
      join(cacheDir, 'update-check.json'),
      JSON.stringify({ checkedAt: Date.now() - UPDATE_TTL, latest: '2.1.0' }),
    )
    await checkForUpdate(options())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('bypasses the cache for explicit updates', async () => {
    await checkForUpdate(options())
    await checkForUpdate({ ...options(), force: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('throttles failed startup requests and reports explicit check failures', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    await expect(checkForUpdate(options())).resolves.toBeUndefined()
    await checkForUpdate(options())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await expect(checkForUpdate({ ...options(), force: true })).rejects.toThrow('Could not check')
  })
  it('recovers from a corrupt cache and rejects invalid registry versions', async () => {
    await writeFile(join(cacheDir, 'update-check.json'), 'invalid')
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: 'bad;version' }) })
    await expect(checkForUpdate({ ...options(), force: true })).rejects.toThrow('Could not check')
    expect(JSON.parse(await readFile(join(cacheDir, 'update-check.json'), 'utf8')).latest).toBeUndefined()
  })
  it('only installs with consent, including when the newer release is cached', async () => {
    expect(await offerUpdate(options())).toBe(false)
    expect(spawn).not.toHaveBeenCalled()
    vi.mocked(confirm).mockResolvedValue(true)
    expect(await offerUpdate(options())).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(spawn).toHaveBeenCalledWith(
      expect.any(String),
      ['install', '--global', 'pontus-x_cli@2.1.0'],
      expect.objectContaining({ stdio: 'inherit' }),
    )
  })
  it('does not prompt or install for equal or older releases', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: '2.0.4' }) })
    expect(await offerUpdate(options())).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })
  it('does not wait for input in noninteractive runs', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false })
    expect(await offerUpdate(options())).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })
  it('reports installation failures', async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const child = new EventEmitter()
      queueMicrotask(() => child.emit('exit', 1))
      return child as any
    })
    await expect(installUpdate('2.1.0')).rejects.toThrow('CLI update failed')
  })
  it('skips automatic checking for the update command', async () => {
    await hook.call({} as any, { id: 'update' } as any)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('stops command execution after a successful update', async () => {
    vi.mocked(confirm).mockResolvedValue(true)
    const exit = vi.fn()
    const error = vi.fn()
    await hook.call({} as any, { id: 'publish', config: options(), context: { exit, error } } as any)
    expect(exit).toHaveBeenCalledWith(0)
    expect(error).not.toHaveBeenCalled()
  })
})
