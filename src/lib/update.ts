import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { confirm } from '@inquirer/prompts'
import { gt, valid } from 'semver'

export const UPDATE_TTL = 24 * 60 * 60 * 1000
const PACKAGE = 'pontus-x_cli'

interface UpdateOptions {
  cacheDir: string
  version: string
  force?: boolean
}

interface UpdateCache {
  checkedAt: number
  latest?: string
}

export async function checkForUpdate({ cacheDir, force = false }: UpdateOptions): Promise<string | undefined> {
  const path = join(cacheDir, 'update-check.json')
  const now = Date.now()
  let cache: UpdateCache | undefined
  try {
    cache = JSON.parse(await readFile(path, 'utf8'))
    if (
      !force &&
      cache &&
      Number.isFinite(cache.checkedAt) &&
      cache.checkedAt <= now &&
      now - cache.checkedAt < UPDATE_TTL
    ) {
      return cache.latest && valid(cache.latest) ? cache.latest : undefined
    }
  } catch {
    // Missing or corrupt caches are replaced by the next check.
  }

  let latest: string | undefined
  let failure: unknown
  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE}/latest`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`npm registry returned HTTP ${response.status}`)
    const body = (await response.json()) as { version?: unknown }
    if (typeof body.version !== 'string' || !valid(body.version)) {
      throw new Error('npm registry returned an invalid version')
    }
    latest = body.version
  } catch (error) {
    failure = error
    // Also throttle failed automatic checks while retaining a previously known release.
    latest = cache?.latest && valid(cache.latest) ? cache.latest : undefined
  }
  try {
    await mkdir(cacheDir, { recursive: true })
    await writeFile(path, JSON.stringify({ checkedAt: now, latest }), 'utf8')
  } catch {
    // A read-only cache must not prevent commands or updates.
  }
  if (failure && force) throw new Error('Could not check for CLI updates. Check your connection and try again.')
  return latest
}

export async function installUpdate(version: string): Promise<void> {
  if (!valid(version)) throw new Error('Invalid update version')
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['install', '--global', `${PACKAGE}@${version}`],
      {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      },
    )
    child.once('error', reject)
    child.once('exit', code => {
      if (code === 0) resolve()
      else
        reject(
          new Error(`CLI update failed (${code ?? 'terminated'}). Check npm installation permissions and try again.`),
        )
    })
  })
}

// Return true when the caller must stop: the running process still has the old code loaded.
export async function offerUpdate(options: UpdateOptions): Promise<boolean> {
  const latest = await checkForUpdate(options)
  if (!latest || !gt(latest, options.version)) {
    if (options.force) console.error(`CLI is up to date (${options.version}).`)
    return false
  }
  console.error(`A CLI update is available: ${options.version} → ${latest}.`)
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    console.error('Run "pontus-x_cli update" in an interactive terminal to update.')
    return false
  }
  const accepted = await confirm(
    { message: `Update ${PACKAGE} to ${latest} now?`, default: true },
    { output: process.stderr },
  )
  if (!accepted) return false
  await installUpdate(latest)
  console.error(`Updated to ${latest}. Run your command again to use the new version.`)
  return true
}
