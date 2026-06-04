import * as fs from 'fs'
import * as path from 'path'

export interface Platform {
  match: string
  tag: string
  libretro: string
}

export const ALL_PLATFORMS: Platform[] = [
  { match: 'PlayStation (PS)', tag: 'PS', libretro: 'Sony - PlayStation' },
  { match: 'PlayStation Portable (PSP)', tag: 'PSP', libretro: 'Sony - PlayStation Portable' },
  { match: 'Sega Dreamcast (DC)', tag: 'DC', libretro: 'Sega - Dreamcast' },
  { match: 'Nintendo 64 (N64)', tag: 'N64', libretro: 'Nintendo - Nintendo 64' },
  { match: 'Nintendo DS (NDS)', tag: 'NDS', libretro: 'Nintendo - Nintendo DS' },
  { match: 'Game Boy Advance (GBA)', tag: 'GBA', libretro: 'Nintendo - Game Boy Advance' },
  { match: 'Game Boy Advance (MGBA)', tag: 'MGBA', libretro: 'Nintendo - Game Boy Advance' },
  { match: 'Super Nintendo (SFC)', tag: 'SFC', libretro: 'Nintendo - Super Nintendo Entertainment System' },
  { match: 'Super Nintendo (SUPA)', tag: 'SUPA', libretro: 'Nintendo - Super Nintendo Entertainment System' },
  { match: 'Super Game Boy (SGB)', tag: 'SGB', libretro: 'Nintendo - Game Boy' },
  { match: 'Game Boy Color (GBC)', tag: 'GBC', libretro: 'Nintendo - Game Boy Color' },
  { match: 'Game Boy (GB)', tag: 'GB', libretro: 'Nintendo - Game Boy' },
  { match: 'Nintendo NES (FC)', tag: 'FC', libretro: 'Nintendo - Nintendo Entertainment System' },
  { match: 'Virtual Boy (VB)', tag: 'VB', libretro: 'Nintendo - Virtual Boy' },
  { match: 'Pokémon mini (PKM)', tag: 'PKM', libretro: 'Nintendo - Pokemon Mini' },
  { match: 'Sega Genesis (MD)', tag: 'MD', libretro: 'Sega - Mega Drive - Genesis' },
  { match: 'Sega Master System (SMS)', tag: 'SMS', libretro: 'Sega - Master System - Mark III' },
  { match: 'Sega Game Gear (GG)', tag: 'GG', libretro: 'Sega - Game Gear' },
  { match: 'TurboGrafx-16 (PCE)', tag: 'PCE', libretro: 'NEC - PC Engine - TurboGrafx 16' },
  { match: 'Neo Geo Pocket Color (NGPC)', tag: 'NGPC', libretro: 'SNK - Neo Geo Pocket Color' },
  { match: 'Arcade (FBNEO)', tag: 'FBNEO', libretro: 'FBNeo - Arcade Games' },
  { match: 'Vertical Arcade (VARCADE)', tag: 'VARCADE', libretro: 'FBNeo - Arcade Games' }
]

const ROM_EXTS = new Set([
  '.bin', '.cue', '.iso', '.pbp', '.chd', '.img', '.cso',
  '.smc', '.sfc', '.gb', '.gbc', '.gba', '.nes', '.fds',
  '.md', '.sms', '.gg', '.pce', '.ngp', '.ngc', '.m3u',
  '.z64', '.n64', '.v64',
  '.nds',
  '.gdi', '.cdi',
  '.vb',
  '.min',
  '.zip'
])

const DEVICE_PREF = [
  'GameShark', 'Action Replay', 'Xploder', 'CodeBreaker',
  'Code Breaker', 'Game Genie', 'Game Buster'
]

export interface SyncConfig {
  romsRoot: string
  chtsRoot: string
  githubToken?: string
  platforms: string[]
  force: boolean
}

export interface LogEntry {
  type: 'info' | 'ok' | 'skip' | 'nomatch' | 'platform' | 'error' | 'summary'
  message: string
  detail?: string
}

interface Game {
  romName: string
  outName: string
}

function cleanCht(content: string): string {
  const lines = content.split(/\r?\n/)
  const parsed: Record<number, { desc?: string; enable?: string; code?: string }> = {}

  for (const line of lines) {
    let m: RegExpExecArray | null
    if ((m = /^cheat(\d+)_desc\s*=\s*"(.*)"\s*$/.exec(line))) {
      const i = Number(m[1]);(parsed[i] ??= {}).desc = m[2].trim()
    } else if ((m = /^cheat(\d+)_enable\s*=\s*(.+?)\s*$/.exec(line))) {
      const i = Number(m[1]);(parsed[i] ??= {}).enable = m[2]
    } else if ((m = /^cheat(\d+)_code\s*=\s*"(.*)"\s*$/.exec(line))) {
      const i = Number(m[1]);(parsed[i] ??= {}).code = m[2]
    }
  }

  const seen = new Set<string>()
  const unique = Object.keys(parsed)
    .map(Number)
    .sort((a, b) => a - b)
    .map(i => parsed[i])
    .filter((e): e is { desc: string; enable: string; code: string } =>
      !!e.desc && e.enable !== undefined && !!e.code && !seen.has(e.code) && !!seen.add(e.code)
    )

  const out: string[] = [`cheats = ${unique.length}`, '']
  unique.forEach((e, i) => {
    out.push(`cheat${i}_desc = "${e.desc}"`, `cheat${i}_enable = ${e.enable}`, `cheat${i}_code = "${e.code}"`, '')
  })
  return out.join('\n')
}

function getBaseName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function getRegionScore(romName: string, dbName: string): number {
  const romMatch = romName.match(/\((USA|World|Europe|Japan|Spain|France|Germany|Italy|Brazil|Korea|Australia)\)/)
  const dbMatch = dbName.match(/\((USA|World|Europe|Japan|Spain|France|Germany|Italy|Brazil|Korea|Australia|USA, Europe|USA, Europe, Japan)\)/)
  const romR = romMatch?.[1] ?? ''
  const dbR = dbMatch?.[1] ?? ''
  if (romR && romR === dbR) return 4
  if (dbR === 'World') return 3
  if (dbR.includes('USA, Europe') && ['USA', 'Europe', 'Spain', 'France', 'Germany'].includes(romR)) return 2
  if (['Spain', 'France', 'Germany', 'Italy'].includes(romR) && dbR === 'Europe') return 1
  return 0
}

function getDeviceScore(dbName: string): number {
  for (let i = 0; i < DEVICE_PREF.length; i++) {
    if (dbName.includes(`(${DEVICE_PREF[i]})`)) return DEVICE_PREF.length - i
  }
  return 0
}

function findBestMatch(romFileName: string, candidates: string[]): string | null {
  const nameNoExt = path.basename(romFileName, path.extname(romFileName))
  const romBase = getBaseName(nameNoExt)
  if (!romBase) return null

  const romIsDemo = romFileName.includes('(Demo)')
  const romIsBeta = romFileName.includes('(Beta)')

  let best: string | null = null
  let bestScore = -1

  for (const c of candidates) {
    const dbFile = path.basename(c, '.cht')
    if (dbFile.includes('(diff')) continue
    if (!romIsDemo && dbFile.includes('(Demo)')) continue
    if (!romIsBeta && dbFile.includes('(Beta)')) continue
    if (getBaseName(dbFile) !== romBase) continue

    const score = getRegionScore(romFileName, dbFile) * 10 + getDeviceScore(dbFile)
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

function findFilesRecursive(dir: string, filter: (name: string) => boolean): string[] {
  const results: string[] = []
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) results.push(...findFilesRecursive(full, filter))
      else if (e.isFile() && filter(e.name)) results.push(full)
    }
  } catch {}
  return results
}

function scanGames(romDir: string): Game[] {
  const games: Game[] = []
  const coveredDirs = new Set<string>()

  for (const f of findFilesRecursive(romDir, (n) => n.toLowerCase().endsWith('.m3u'))) {
    games.push({ romName: path.basename(f), outName: path.basename(f) + '.cht' })
    coveredDirs.add(path.dirname(f))
  }

  for (const f of findFilesRecursive(romDir, (n) => n.toLowerCase().endsWith('.cue'))) {
    const dir = path.dirname(f)
    if (dir !== romDir && !coveredDirs.has(dir)) {
      games.push({ romName: path.basename(f), outName: path.basename(f) + '.cht' })
      coveredDirs.add(dir)
    }
  }

  for (const f of findFilesRecursive(romDir, (n) => ROM_EXTS.has(path.extname(n).toLowerCase()))) {
    const dir = path.dirname(f)
    const name = path.basename(f)
    if (coveredDirs.has(dir)) continue
    if (/\(Track\s*\d+\)/i.test(name)) continue
    games.push({ romName: name, outName: name + '.cht' })
  }

  return games
}

async function fetchText(url: string, token?: string): Promise<string> {
  const headers: Record<string, string> = { 'User-Agent': 'CHTSync-MinUI' }
  if (token) headers['Authorization'] = `token ${token}`
  const resp = await fetch(url, { headers })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.text()
}

async function downloadBytes(url: string, token?: string): Promise<Buffer> {
  const headers: Record<string, string> = { 'User-Agent': 'CHTSync-MinUI' }
  if (token) headers['Authorization'] = `token ${token}`
  const resp = await fetch(url, { headers })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return Buffer.from(await resp.arrayBuffer())
}

let cancelFlag = false

export function cancelSync(): void {
  cancelFlag = true
}

export async function runSync(
  config: SyncConfig,
  onLog: (entry: LogEntry) => void,
  onStats: (downloaded: number, skipped: number, noMatch: number) => void
): Promise<void> {
  cancelFlag = false
  let totalDownloaded = 0
  let totalSkipped = 0
  let totalNoMatch = 0

  onLog({ type: 'info', message: 'Fetching libretro-database index...' })

  const treeUrl =
    'https://api.github.com/repos/libretro/libretro-database/git/trees/master?recursive=1'
  let allPaths: string[]
  try {
    const data = JSON.parse(await fetchText(treeUrl, config.githubToken)) as {
      tree: Array<{ path: string }>
    }
    allPaths = data.tree.filter((n) => n.path.startsWith('cht/')).map((n) => n.path)
    onLog({ type: 'info', message: `${allPaths.length} .cht files indexed.` })
  } catch (err) {
    onLog({ type: 'error', message: `Failed to fetch index: ${err}` })
    return
  }

  const selectedPlatforms = ALL_PLATFORMS.filter((p) => config.platforms.includes(p.tag))

  for (const platform of selectedPlatforms) {
    if (cancelFlag) break

    let romDir: string | null = null
    try {
      for (const e of fs.readdirSync(config.romsRoot, { withFileTypes: true })) {
        if (e.isDirectory() && e.name.toLowerCase().includes(platform.match.toLowerCase())) {
          romDir = path.join(config.romsRoot, e.name)
          break
        }
      }
    } catch {}

    if (!romDir) continue

    const prefix = `cht/${platform.libretro}/`
    const candidates = allPaths.filter((p) => p.startsWith(prefix))
    const outDir = path.join(config.chtsRoot, platform.tag)

    onLog({
      type: 'platform',
      message: `[${platform.tag}] ${path.basename(romDir)} — ${candidates.length} .cht files in DB`
    })

    if (candidates.length === 0) continue

    const games = scanGames(romDir)
    if (games.length === 0) {
      onLog({ type: 'info', message: 'No games found.' })
      continue
    }

    for (const game of games) {
      if (cancelFlag) break

      const outPath = path.join(outDir, game.outName)

      if (fs.existsSync(outPath) && !config.force) {
        onLog({ type: 'skip', message: game.romName })
        totalSkipped++
        onStats(totalDownloaded, totalSkipped, totalNoMatch)
        continue
      }

      const match = findBestMatch(game.romName, candidates)
      if (!match) {
        onLog({ type: 'nomatch', message: game.romName })
        totalNoMatch++
        onStats(totalDownloaded, totalSkipped, totalNoMatch)
        continue
      }

      const matchFile = path.basename(match, '.cht')
      const rawUrl = `https://raw.githubusercontent.com/libretro/libretro-database/master/${match}`

      try {
        const bytes = await downloadBytes(rawUrl, config.githubToken)
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(outPath, cleanCht(bytes.toString('utf8')), 'utf8')
        onLog({ type: 'ok', message: game.romName, detail: matchFile })
        totalDownloaded++
      } catch (err) {
        onLog({ type: 'error', message: `${game.romName}: ${err}` })
      }
      onStats(totalDownloaded, totalSkipped, totalNoMatch)
    }
  }

  if (!cancelFlag) {
    onLog({
      type: 'summary',
      message: `Done — Downloaded: ${totalDownloaded} | Skipped: ${totalSkipped} | No match: ${totalNoMatch}`
    })
  } else {
    onLog({ type: 'info', message: 'Sync cancelled.' })
  }
}

export async function scanOrphans(
  config: Pick<SyncConfig, 'romsRoot' | 'chtsRoot' | 'platforms'>
): Promise<number> {
  const selectedPlatforms = ALL_PLATFORMS.filter((p) => config.platforms.includes(p.tag))
  let count = 0

  for (const platform of selectedPlatforms) {
    const chtsDir = path.join(config.chtsRoot, platform.tag)
    if (!fs.existsSync(chtsDir)) continue

    let romDir: string | null = null
    try {
      for (const e of fs.readdirSync(config.romsRoot, { withFileTypes: true })) {
        if (e.isDirectory() && e.name.toLowerCase().includes(platform.match.toLowerCase())) {
          romDir = path.join(config.romsRoot, e.name)
          break
        }
      }
    } catch {}

    const chtFiles = fs.readdirSync(chtsDir).filter((f) => f.toLowerCase().endsWith('.cht'))

    if (!romDir) {
      count += chtFiles.length
      continue
    }

    for (const chtFile of chtFiles) {
      const romFilename = chtFile.slice(0, -4)
      let romExists = false
      try {
        romExists = findFilesRecursive(romDir, (n) => n === romFilename).length > 0
      } catch {}
      if (!romExists) count++
    }
  }

  return count
}

export async function runCleanup(
  config: Pick<SyncConfig, 'romsRoot' | 'chtsRoot' | 'platforms'>,
  onLog: (entry: LogEntry) => void,
  onStats: (deleted: number, kept: number, errors: number) => void
): Promise<void> {
  cancelFlag = false
  let deleted = 0, kept = 0, errors = 0

  const selectedPlatforms = ALL_PLATFORMS.filter((p) => config.platforms.includes(p.tag))

  for (const platform of selectedPlatforms) {
    if (cancelFlag) break

    const chtsDir = path.join(config.chtsRoot, platform.tag)
    if (!fs.existsSync(chtsDir)) {
      onLog({ type: 'info', message: `[${platform.tag}] No .cht folder, skipping.` })
      continue
    }

    let romDir: string | null = null
    try {
      for (const e of fs.readdirSync(config.romsRoot, { withFileTypes: true })) {
        if (e.isDirectory() && e.name.toLowerCase().includes(platform.match.toLowerCase())) {
          romDir = path.join(config.romsRoot, e.name)
          break
        }
      }
    } catch {}

    const chtFiles = fs.readdirSync(chtsDir).filter((f) => f.toLowerCase().endsWith('.cht'))

    if (!romDir) {
      onLog({
        type: 'platform',
        message: `[${platform.tag}] ROM folder not found — deleting all ${chtFiles.length} orphaned .cht files`
      })
      for (const chtFile of chtFiles) {
        if (cancelFlag) break
        const chtPath = path.join(chtsDir, chtFile)
        try {
          fs.unlinkSync(chtPath)
          onLog({ type: 'ok', message: chtFile.slice(0, -4) + ' — deleted' })
          deleted++
        } catch (err) {
          onLog({ type: 'error', message: `${chtFile}: ${err}` })
          errors++
        }
        onStats(deleted, kept, errors)
      }
      continue
    }

    onLog({
      type: 'platform',
      message: `[${platform.tag}] ${path.basename(romDir)}`
    })

    for (const chtFile of chtFiles) {
      if (cancelFlag) break

      const romFilename = chtFile.slice(0, -4)
      const chtPath = path.join(chtsDir, chtFile)

      let romExists = false
      try {
        romExists = findFilesRecursive(romDir, (n) => n === romFilename).length > 0
      } catch {
        onLog({ type: 'skip', message: romFilename + ' (read error, keeping)' })
        kept++
        onStats(deleted, kept, errors)
        continue
      }

      if (romExists) {
        onLog({ type: 'skip', message: romFilename })
        kept++
      } else {
        try {
          fs.unlinkSync(chtPath)
          onLog({ type: 'ok', message: romFilename + ' — deleted' })
          deleted++
        } catch (err) {
          onLog({ type: 'error', message: `${romFilename}: ${err}` })
          errors++
        }
      }
      onStats(deleted, kept, errors)
    }
  }

  if (!cancelFlag) {
    onLog({
      type: 'summary',
      message: `Done — Deleted: ${deleted} | Kept: ${kept} | Errors: ${errors}`
    })
  } else {
    onLog({ type: 'info', message: 'Cleanup cancelled.' })
  }
}
