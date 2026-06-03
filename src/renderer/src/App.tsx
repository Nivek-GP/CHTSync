import React, { useState, useEffect, useRef } from 'react'
import './assets/main.css'

function LogoIcon(): React.JSX.Element {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      {/* Arc 1 — upper 150°, 10-o'clock → 3-o'clock */}
      <path d="M 8.1,12.2 A 17,17 0 0,1 38.9,23.5" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      {/* Arrowhead ↓ */}
      <polygon points="36.2,20.8 41.8,21.3 38.5,27.5" fill="var(--accent)" />

      {/* Arc 2 — lower 150°, 4-o'clock → 9-o'clock */}
      <path d="M 35.9,31.8 A 17,17 0 0,1 5.1,20.5" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      {/* Arrowhead ↑ */}
      <polygon points="2.2,22.7 7.8,23.2 5.5,16.5" fill="var(--accent)" />

      {/* D-pad cross */}
      <polygon
        points="19,14 25,14 25,19 30,19 30,25 25,25 25,30 19,30 19,25 14,25 14,19 19,19"
        fill="var(--logo-dpad)"
      />
      {/* Directional arrows — negative cut-out */}
      <polygon points="22,15.5 20,19 24,19"   fill="var(--bg)" />
      <polygon points="22,28.5 20,25 24,25"   fill="var(--bg)" />
      <polygon points="15.5,22 19,20 19,24"   fill="var(--bg)" />
      <polygon points="28.5,22 25,20 25,24"   fill="var(--bg)" />
    </svg>
  )
}

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

export default function App(): React.JSX.Element {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  })
  const [romsRoot, setRomsRoot] = useState(() => localStorage.getItem('romsRoot') ?? '')
  const [cheatsRoot, setCheatsRoot] = useState(() => localStorage.getItem('cheatsRoot') ?? '')
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('githubToken') ?? '')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())
  const [force, setForce] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [orphanCount, setOrphanCount] = useState<number | null>(null)
  const [lastMode, setLastMode] = useState<'sync' | 'cleanup'>('sync')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<SyncStats>({ downloaded: 0, skipped: 0, noMatch: 0 })
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => { localStorage.setItem('romsRoot', romsRoot); setOrphanCount(null) }, [romsRoot])
  useEffect(() => { localStorage.setItem('cheatsRoot', cheatsRoot); setOrphanCount(null) }, [cheatsRoot])
  useEffect(() => { localStorage.setItem('githubToken', githubToken) }, [githubToken])
  useEffect(() => { setOrphanCount(null) }, [selectedPlatforms])

  useEffect(() => {
    window.api.getPlatforms().then((p) => {
      setPlatforms(p)
      setSelectedPlatforms(new Set(p.map((x) => x.tag)))
    })
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const selectFolder = async (setter: (v: string) => void): Promise<void> => {
    const p = await window.api.selectFolder()
    if (p) setter(p)
  }

  const togglePlatform = (tag: string): void => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const startSync = async (): Promise<void> => {
    if (!romsRoot || !cheatsRoot) return
    setSyncing(true)
    setLastMode('sync')
    setLogs([])
    setStats({ downloaded: 0, skipped: 0, noMatch: 0 })

    const unsub1 = window.api.onSyncLog((entry) => setLogs((prev) => [...prev, entry]))
    const unsub2 = window.api.onSyncStats((s) => setStats(s))

    await window.api.startSync({
      romsRoot,
      cheatsRoot,
      githubToken: githubToken || undefined,
      platforms: [...selectedPlatforms],
      force
    })

    unsub1()
    unsub2()
    setSyncing(false)
  }

  const scanForOrphans = async (): Promise<void> => {
    if (!romsRoot || !cheatsRoot) return
    setScanning(true)
    const count = await window.api.scanOrphans({ romsRoot, cheatsRoot, platforms: [...selectedPlatforms] })
    setOrphanCount(count)
    setScanning(false)
  }

  const startCleanup = async (): Promise<void> => {
    if (!romsRoot || !cheatsRoot) return
    setCleaning(true)
    setLastMode('cleanup')
    setLogs([])
    setStats({ downloaded: 0, skipped: 0, noMatch: 0 })

    const unsub1 = window.api.onSyncLog((entry) => setLogs((prev) => [...prev, entry]))
    const unsub2 = window.api.onSyncStats((s) => setStats(s))

    await window.api.startCleanup({ romsRoot, cheatsRoot, platforms: [...selectedPlatforms] })

    unsub1()
    unsub2()
    setCleaning(false)
    setOrphanCount(null)
  }

  const canStart = Boolean(romsRoot && cheatsRoot && selectedPlatforms.size > 0 && !syncing && !cleaning)
  const canClean = Boolean(romsRoot && cheatsRoot && selectedPlatforms.size > 0 && !syncing && !cleaning)

  const logIcon = (type: LogEntry['type']): string => {
    switch (type) {
      case 'ok': return '✓'
      case 'skip': return '~'
      case 'nomatch': return '-'
      case 'error': return '!'
      case 'platform': return '▶'
      case 'summary': return '★'
      default: return '·'
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <LogoIcon />
          <div>
            <h1>CheatSync</h1>
            <span className="logo-sub">for MinUI</span>
          </div>
        </div>
        <button
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <main className="app-main">
        <div className="config-area">
        <section className="card">
          <h2 className="section-title">Folders</h2>
          <div className="folder-row">
            <label>ROM Folder</label>
            <div className="input-row">
              <input
                type="text"
                value={romsRoot}
                readOnly
                placeholder="e.g. F:\Roms"
                onClick={() => selectFolder(setRomsRoot)}
              />
              <button onClick={() => selectFolder(setRomsRoot)}>Browse</button>
            </div>
          </div>
          <div className="folder-row">
            <label>Cheats Folder</label>
            <div className="input-row">
              <input
                type="text"
                value={cheatsRoot}
                readOnly
                placeholder="e.g. F:\Cheats"
                onClick={() => selectFolder(setCheatsRoot)}
              />
              <button onClick={() => selectFolder(setCheatsRoot)}>Browse</button>
            </div>
          </div>
          <div className="folder-row">
            <label>
              GitHub Token{' '}
              <span className="label-hint">(optional — raises rate limit from 60 to 5000 req/hr)</span>
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
            />
          </div>
        </section>

        <section className="card">
          <div className="section-header-row">
            <h2 className="section-title">Platforms</h2>
            <div className="link-actions">
              <button
                className="link-btn"
                onClick={() => setSelectedPlatforms(new Set(platforms.map((p) => p.tag)))}
              >
                All
              </button>
              <button className="link-btn" onClick={() => setSelectedPlatforms(new Set())}>
                None
              </button>
            </div>
          </div>
          <div className="platform-grid">
            {platforms.map((p) => (
              <label
                key={p.tag}
                className={`platform-chip ${selectedPlatforms.has(p.tag) ? 'active' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlatforms.has(p.tag)}
                  onChange={() => togglePlatform(p.tag)}
                />
                {p.tag}
              </label>
            ))}
          </div>
        </section>

        <section className="card options-card">
          <label className="check-label">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Force re-download — overwrite existing .cht files
          </label>
        </section>

        <div className="action-row">
          {syncing ? (
            <button className="btn-cancel" onClick={() => window.api.cancelSync()}>
              Cancel Sync
            </button>
          ) : (
            <button className="btn-primary" onClick={startSync} disabled={!canStart}>
              Start Sync
            </button>
          )}
          {cleaning ? (
            <button className="btn-cancel" onClick={() => window.api.cancelCleanup()}>
              Cancel Cleanup
            </button>
          ) : orphanCount !== null ? (
            <button className="btn-secondary btn-confirm" onClick={startCleanup} disabled={!canClean}>
              Delete {orphanCount} Cheats
            </button>
          ) : (
            <button className="btn-secondary" onClick={scanForOrphans} disabled={!canClean || scanning}>
              {scanning ? 'Scanning...' : 'Clean Cheats'}
            </button>
          )}
        </div>
        </div>{/* end config-area */}

        {logs.length > 0 && (
          <section className="card log-card">
            <div className="log-output" ref={logRef}>
              {logs.map((entry, i) => (
                <div key={i} className={`log-line log-${entry.type}`}>
                  <span className="log-icon">{logIcon(entry.type)}</span>
                  <span className="log-msg">{entry.message}</span>
                  {entry.detail && <span className="log-detail"> → {entry.detail}</span>}
                </div>
              ))}
            </div>
            <div className="stats-bar">
              <span className="stat-ok">✓ {stats.downloaded} {lastMode === 'cleanup' ? 'deleted' : 'downloaded'}</span>
              <span className="stat-skip">~ {stats.skipped} {lastMode === 'cleanup' ? 'kept' : 'skipped'}</span>
              <span className="stat-none">- {stats.noMatch} {lastMode === 'cleanup' ? 'errors' : 'no match'}</span>
            </div>
          </section>
        )}
      </main>
      <footer className="app-footer">
        <a
          className="author-link"
          href="https://github.com/Nivek-GP"
          target="_blank"
          rel="noreferrer"
        >
          by Nivek-GP
        </a>
      </footer>
    </div>
  )
}
