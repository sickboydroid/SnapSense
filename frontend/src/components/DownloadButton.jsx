import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ChevronDown, ExternalLink } from 'lucide-react'
import { useDownload, OS_CONFIGS } from '../hooks/useDownload'

/* ─── tiny OS SVG icons ─────────────────────────────────────────────────── */

function WindowsIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851" />
    </svg>
  )
}

function AppleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function LinuxIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.504 0c-.155 0-.315.008-.48.021C7.576.336 3.59 2.808 3.55 8.66c-.002.8.077 1.5.216 2.123.267 1.2.788 2.09 1.306 2.777.518.686 1.028 1.162 1.36 1.49.16.164.275.3.328.408.055.11.076.214.098.325.09.462.06 1.11.06 1.697 0 .74-.015 1.518.01 2.233.014.433.077.862.195 1.28.12.42.324.84.634 1.218.31.38.752.726 1.326 1.026 1.149.6 2.73.91 4.704.91 1.972 0 3.553-.31 4.703-.91.574-.3 1.016-.647 1.326-1.026.31-.379.514-.799.634-1.219.118-.417.181-.847.195-1.28.025-.714.01-1.492.01-2.232 0-.587-.03-1.235.06-1.697.02-.111.042-.215.097-.325.053-.108.168-.244.328-.408.332-.328.842-.804 1.36-1.49.518-.686 1.04-1.576 1.306-2.777.139-.622.218-1.322.216-2.123-.04-5.85-4.028-8.323-8.474-8.639-.165-.013-.325-.021-.48-.021zm.043 4.33c.315 0 .564.244.564.545v6.84c0 .3-.25.544-.564.544-.315 0-.563-.244-.563-.545V4.875c0-.3.248-.545.563-.545zm-4.25 5.498c.316 0 .566.245.566.546 0 .3-.25.545-.565.545-.316 0-.566-.244-.566-.545 0-.3.25-.546.566-.546zm8.5 0c.317 0 .566.245.566.546 0 .3-.249.545-.565.545-.317 0-.566-.244-.566-.545 0-.3.249-.546.565-.546z" />
    </svg>
  )
}

const OS_ICONS = { windows: WindowsIcon, mac: AppleIcon, linux: LinuxIcon }
const OTHER_PLATFORMS = { windows: ['mac', 'linux'], mac: ['windows', 'linux'], linux: ['windows', 'mac'] }

/* ─── Loading shimmer ────────────────────────────────────────────────────── */

function Shimmer({ className = '' }) {
  return (
    <span
      className={`inline-block animate-pulse rounded bg-white/10 ${className}`}
      aria-hidden
    />
  )
}

/* ─── Hero-size download block ───────────────────────────────────────────── */

export function HeroDownloadButton({ githubUrl }) {
  const { os, assets, loading, releasesUrl } = useDownload()

  const primary = assets?.[os]
  const OsIcon = OS_ICONS[os] ?? WindowsIcon
  const others = OTHER_PLATFORMS[os] ?? ['windows', 'linux']
  const availableOthers = loading ? others : others.filter((platform) => assets?.[platform])

  const href = primary?.url ?? releasesUrl

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* ── primary row ── */}
      <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        {/* main download button */}
        <motion.a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          download={primary?.name}
          whileHover={{ opacity: 0.93 }}
          whileTap={{ scale: 0.985 }}
          className="group relative inline-flex flex-1 items-center justify-center gap-2.5 rounded-xl bg-blue-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-400 sm:flex-initial sm:min-w-[220px] md:px-7 md:py-4 md:text-[15px]"
        >
          <OsIcon className="h-4 w-4 shrink-0" />
          {loading ? (
            <>
              <Shimmer className="h-4 w-28" />
            </>
          ) : (
            <>
              <span>{primary ? `Download for ${OS_CONFIGS[os]?.label ?? 'Windows'}` : 'Browse releases'}</span>
              {primary?.size && (
                <span className="rounded-md bg-blue-400/30 px-1.5 py-0.5 text-[11px] font-medium text-blue-100 tabular-nums">
                  {primary.size}
                </span>
              )}
            </>
          )}
        </motion.a>

        {/* github link */}
        <motion.a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
          whileTap={{ scale: 0.985 }}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-5 py-3.5 text-[14px] font-semibold text-neutral-200 transition-colors hover:border-white/35 sm:flex-initial sm:min-w-[120px] md:px-6 md:py-4 md:text-[15px]"
        >
          GitHub
          <ExternalLink className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
        </motion.a>
      </div>

      {/* ── other platforms row ── */}
      {availableOthers.length > 0 && <div className="flex items-center gap-1.5 text-[12px] text-neutral-600">
        <span>Also available for</span>
        {availableOthers.map((platform, i) => {
          const asset = assets?.[platform]
          const Icon = OS_ICONS[platform]
          const label = OS_CONFIGS[platform]?.label ?? platform
          return (
            <span key={platform} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-neutral-700">·</span>}
              {loading ? (
                <Shimmer className="h-3 w-14" />
              ) : (
                <a
                  href={asset?.url ?? releasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={asset?.name}
                  className="inline-flex items-center gap-1 text-neutral-500 transition-colors hover:text-neutral-300"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </a>
              )}
            </span>
          )
        })}
      </div>
      }
    </div>
  )
}

/* ─── Compact navbar download button ────────────────────────────────────── */

export function NavDownloadButton() {
  const { os, assets, loading, releasesUrl } = useDownload()
  const [open, setOpen] = useState(false)

  const primary = assets?.[os]
  const OsIcon = OS_ICONS[os] ?? WindowsIcon
  const others = OTHER_PLATFORMS[os] ?? ['windows', 'linux']

  return (
    <div className="relative">
      <div className="flex items-center h-full gap-0">
        {/* main download link */}
        <motion.a
          href={primary?.url ?? releasesUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={primary?.name}
          whileHover={{ opacity: 0.92 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 rounded-l-full bg-blue-500 pl-4 pr-3 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-400"
        >
          {loading ? (
            <>
              <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <Shimmer className="h-3.5 w-16" />
            </>
          ) : (
            <>
              <OsIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{primary ? 'Download' : 'Releases'}</span>
            </>
          )}
        </motion.a>

        {/* chevron to show other platforms */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Other platforms"
          aria-expanded={open}
          className="flex items-center rounded-r-full border-l border-blue-400/40 bg-blue-500 px-2 py-[12.5px] h-full text-white transition-colors hover:bg-blue-400"
        >
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
          </motion.span>
        </button>
      </div>

      {/* dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[170px] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 py-1 px-3 shadow-xl shadow-black/40"
          >
            {/* current OS first */}
            {[os, ...others.filter((platform) => loading || assets?.[platform])].map((platform) => {
              const asset = assets?.[platform]
              const Icon = OS_ICONS[platform]
              const label = OS_CONFIGS[platform]?.label ?? platform
              const isCurrent = platform === os
              return (
                <a
                  key={platform}
                  href={asset?.url ?? releasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={asset?.name}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  <span className="flex-1">{label}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                      detected
                    </span>
                  )}
                  {asset?.size && (
                    <span className="text-[11px] tabular-nums text-neutral-600">{asset.size}</span>
                  )}
                </a>
              )
            })}
            <div className="mx-3 my-1 border-t border-white/8" />
            <a
              href={releasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-neutral-500 transition-colors hover:text-neutral-300"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              All releases
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* click-outside to close */}
      {open && (
        <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
      )}
    </div>
  )
}
