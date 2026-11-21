import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import Container from './Container'
import DemoVideo from './DemoVideo'
import { HeroDownloadButton } from './DownloadButton'
import BlurText from './bits/BlurText'
import ShinyText from './bits/ShinyText'

const steps = [
  { n: '1', label: 'Press Win + Alt + S' },
  { n: '2', label: 'Snip region' },
  { n: '3', label: 'Get insight' },
]

export default function Hero() {
  return (
    <>
      <section
        className="relative isolate flex min-h-[calc(100svh-5.5rem)] flex-col overflow-hidden bg-neutral-950 pb-12 pt-28 md:min-h-[calc(100svh-6rem)] md:pb-20 md:pt-36 lg:pb-24 lg:pt-40"
        aria-labelledby="hero-heading"
      >
        <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_92%_70%_at_50%_32%,rgb(28_28_34)_0%,rgb(12_12_16)_68%)]" />
          <div className="absolute left-1/2 top-[8%] h-[min(58vh,520px)] w-[min(118vw,920px)] -translate-x-1/2 rounded-[50%] bg-blue-500/18 blur-[100px]" />
          <div className="absolute -right-[8%] top-[14%] h-[min(42vh,400px)] w-[min(42vh,400px)] rounded-full bg-sky-400/12 blur-[90px]" />
          <div className="absolute bottom-[-12%] left-1/2 h-[min(48vh,440px)] w-[min(105vw,860px)] -translate-x-1/2 rounded-[50%] bg-blue-600/12 blur-[110px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_42%_at_50%_12%,rgb(59_130_246/0.22),transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_50%_92%,rgb(59_130_246/0.08),transparent_55%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-blue-400/30 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_85%_at_50%_40%,transparent_42%,rgb(2_6_18/0.48)_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.55] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_82%_72%_at_50%_36%,#000_18%,transparent_78%)]"
          />
          <div
            className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <Container wide className="relative z-10 flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-176 flex-1 flex-col items-center text-center md:max-w-208">

            {/* ── Announcement badge ── */}
            <motion.a
              href="https://github.com/sickboydroid/SnapSense/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-[12px] font-semibold text-blue-300 ring-1 ring-blue-500/15 backdrop-blur-sm transition-colors hover:border-blue-400/50 hover:bg-blue-500/15 md:text-[13px]"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <ShinyText
                text="v0.1.5 — Now on Windows, macOS & Linux"
                speed={4}
                className="text-blue-300"
              />
              <span className="text-blue-400/60">→</span>
            </motion.a>

            {/* ── Headline with BlurText ── */}
            <h1
              id="hero-heading"
              className="block text-balance font-semibold tracking-[-0.04em] text-[clamp(2.35rem,6.2vw,4rem)] leading-[1.08] text-white"
            >
              <BlurText
                text="SnapSense"
                delay={100}
                stepDuration={0.5}
                className="justify-center"
              />
            </h1>

            <div className="mt-4 block font-medium tracking-[-0.02em] text-[clamp(1.15rem,3vw,1.85rem)] leading-snug text-neutral-200 md:mt-5">
              <BlurText
                text="Understand every screen."
                delay={80}
                stepDuration={0.38}
                direction="bottom"
                className="justify-center"
              />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.38 }}
              className="mt-6 max-w-lg text-pretty text-[14px] leading-relaxed text-neutral-500 md:mt-7 md:max-w-xl md:text-[16px]"
            >
              Instantly snip any region on your desktop and get contextual AI answers about code, errors, UI, and docs —
              without switching apps.
            </motion.p>

            {/* ── Download CTA ── */}
            <motion.div
              id="download"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.46 }}
              className="scroll-mt-24 mt-8 w-full sm:mt-9 md:scroll-mt-28"
            >
              <HeroDownloadButton githubUrl="https://github.com/sickboydroid/SnapSense" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.52 }}
              className="mt-4 flex items-center gap-2 text-[12px] text-neutral-600 md:text-[13px]"
            >
              Trigger capture anytime with{' '}
              <kbd className="rounded-md border border-white/15 bg-white/6 px-2 py-0.5 font-mono text-[11px] font-semibold text-neutral-300 shadow-sm">
                Win + Alt + S
              </kbd>
            </motion.p>

            {/* ── Step indicators ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.58 }}
              className="mt-auto w-full max-w-lg pt-12 md:pt-16"
            >
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-0 sm:gap-y-2">
                {steps.map((s, i) => (
                  <Fragment key={s.n}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-semibold text-blue-300 ring-1 ring-blue-500/30">
                        {s.n}
                      </span>
                      <span className="text-[12px] font-medium text-neutral-500 md:text-[13px]">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="h-5 w-px shrink-0 bg-blue-500/25 sm:h-px sm:w-6 md:w-8" aria-hidden />
                    )}
                  </Fragment>
                ))}
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      <section
        id="demo"
        aria-label="Product demo video"
        className="border-t border-white/10 bg-neutral-950/80 pb-16 pt-8 scroll-mt-24 md:scroll-mt-28 md:pb-24 md:pt-10"
      >
        <Container wide>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex w-full max-w-3xl flex-col items-stretch"
          >
            <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-600 md:mb-5">
              Product demo
            </p>
            <div className="rounded-xl bg-blue-500 p-1.5 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] md:rounded-2xl md:p-2">
              <div className="overflow-hidden rounded-lg bg-neutral-900 ring-1 ring-black/10 md:rounded-xl">
                <DemoVideo />
              </div>
            </div>
            <p className="mx-auto mt-6 max-w-md text-center text-[12px] text-neutral-600 md:mt-8">
              Free beta · No account required
            </p>
          </motion.div>
        </Container>
      </section>
    </>
  )
}
