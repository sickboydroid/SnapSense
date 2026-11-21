import { useState, useEffect } from 'react'

const REPO = 'sickboydroid/SnapSense'

/**
 * Recognise the visitor's OS from the browser user-agent.
 * Returns one of: 'windows' | 'mac' | 'linux'
 */
export function detectOS() {
  if (typeof navigator === 'undefined') return 'windows'
  const ua = navigator.userAgent
  if (/Win/i.test(ua)) return 'windows'
  if (/Mac/i.test(ua)) return 'mac'
  if (/Linux/i.test(ua)) return 'linux'
  return 'windows'
}

/**
 * Maps each platform to the filename pattern electron-builder produces.
 * - Windows  → SnapSense-Setup-x.y.z.exe
 * - macOS    → SnapSense-x.y.z-arm64.dmg  (arm64 runs on Intel via Rosetta 2)
 * - Linux    → SnapSense-x.y.z-x86_64.AppImage
 */
export const OS_CONFIGS = {
  windows: { label: 'Windows', ext: '.exe',      pattern: /\.exe$/i },
  mac:     { label: 'macOS',   ext: '.dmg',      pattern: /\.dmg$/i },
  linux:   { label: 'Linux',   ext: '.AppImage', pattern: /\.AppImage$/i },
}

function formatBytes(bytes) {
  if (!bytes) return null
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(0)} MB`
}

/**
 * Fetches the latest GitHub release and resolves per-platform download URLs.
 *
 * Returns:
 *  {
 *    os:      'windows' | 'mac' | 'linux'    — detected OS
 *    assets:  { windows, mac, linux } | null  — null while loading or on error
 *    loading: boolean
 *    releasesUrl: string                       — fallback link to releases page
 *  }
 *
 * Each asset object:  { url, name, size }
 */
export function useDownload() {
  const [assets, setAssets] = useState(null)
  const [loading, setLoading] = useState(true)

  const os = detectOS()
  const releasesUrl = `https://github.com/${REPO}/releases/latest`

  useEffect(() => {
    let cancelled = false
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`GitHub API ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const map = {}
        for (const [platform, cfg] of Object.entries(OS_CONFIGS)) {
          const asset = data.assets?.find((a) => cfg.pattern.test(a.name))
          if (asset) {
            map[platform] = {
              url: asset.browser_download_url,
              name: asset.name,
              size: formatBytes(asset.size),
            }
          }
        }
        setAssets(Object.keys(map).length ? map : null)
      })
      .catch(() => {
        if (!cancelled) setAssets(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { os, assets, loading, releasesUrl }
}
