import { motion } from 'framer-motion'
import { Bot, ImageIcon, Maximize2 } from 'lucide-react'

export default function ProductMockup({ className = '' }) {
  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-neutral-950 shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-blue-500/10">
        <div className="flex items-center justify-between border-b border-white/10 bg-neutral-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/90" />
            </div>
            <span className="ml-2 text-[11px] font-medium text-neutral-500">SnapSense</span>
          </div>
          <Maximize2 className="h-3.5 w-3.5 text-neutral-500" strokeWidth={1.5} />
        </div>
        <div className="grid gap-0 md:grid-cols-[1fr_260px]">
          <div className="relative min-h-[220px] bg-neutral-900 p-6 md:min-h-[260px]">
            <div className="relative rounded-xl border border-dashed border-blue-500/45 bg-blue-500/5 p-4">
              <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-blue-300/90">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" strokeWidth={1.5} /> Selection
                </span>
                <span className="tabular-nums text-neutral-500">384 × 240</span>
              </div>
              <div className="space-y-2 font-mono text-[11px] leading-relaxed">
                <p className="text-emerald-400/95">function parseLog(line) {'{'}</p>
                <p className="pl-3 text-neutral-400">return line.match(/ERROR/)?.[0];</p>
                <p className="text-emerald-400/95">{'}'}</p>
              </div>
            </div>
            <motion.div
              animate={{ opacity: [0.35, 0.65, 0.35] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute bottom-6 right-8 h-14 w-14 rounded-md border-2 border-blue-400/50 bg-blue-500/10"
            />
          </div>
          <div className="border-t border-blue-500/10 bg-neutral-950 p-4 md:border-l md:border-t-0">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-teal-300/95">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/15 ring-1 ring-teal-500/25">
                <Bot className="h-3.5 w-3.5 text-teal-300" strokeWidth={1.5} />
              </span>
              Insight
            </div>
            <div className="space-y-2 text-[12px] leading-relaxed text-neutral-400">
              <p>
                Extracts <span className="font-medium text-blue-300">ERROR</span> tokens from log lines using a regular
                expression.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Regex', 'Debugging', 'Logs'].map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-blue-500/12 px-2 py-0.5 text-[10px] font-medium text-blue-200/90 ring-1 ring-blue-500/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-2 text-[11px] text-teal-200/95">
              Ready in 0.4s
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
