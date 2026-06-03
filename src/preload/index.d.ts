import { ElectronAPI } from '@electron-toolkit/preload'

interface Platform {
  match: string
  tag: string
  libretro: string
}

interface LogEntry {
  type: 'info' | 'ok' | 'skip' | 'nomatch' | 'platform' | 'error' | 'summary'
  message: string
  detail?: string
}

interface SyncStats {
  downloaded: number
  skipped: number
  noMatch: number
}

interface SyncConfig {
  romsRoot: string
  cheatsRoot: string
  githubToken?: string
  platforms: string[]
  force: boolean
}

interface CleanupConfig {
  romsRoot: string
  cheatsRoot: string
  platforms: string[]
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFolder: () => Promise<string | null>
      getPlatforms: () => Promise<Platform[]>
      startSync: (config: SyncConfig) => Promise<void>
      cancelSync: () => void
      onSyncLog: (callback: (entry: LogEntry) => void) => () => void
      onSyncStats: (callback: (stats: SyncStats) => void) => () => void
      scanOrphans: (config: CleanupConfig) => Promise<number>
      startCleanup: (config: CleanupConfig) => Promise<void>
      cancelCleanup: () => void
    }
  }
}
