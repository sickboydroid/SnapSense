import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Download, Play } from 'lucide-react'
import { StaggerLine, StaggerLines } from './animations/StaggerLines'
import Container from './Container'
import DemoVideo from './DemoVideo'

const steps = [
  { n: '1', label: 'Press shortcut' },
  { n: '2', label: 'Snip region' },
  { n: '3', label: 'Get insight' },
]

export default function Hero() {
  const scrollToDemo = () => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      <section
        className="relative isolate flex min-h-[calc(100svh-5.5rem)] flex-col overflow-hidden bg-black pb-12 pt-28 md:min-h-[calc(100svh-6rem)] md:pb-20 md:pt-36 lg:pb-24 lg:pt-40"
        aria-labelledby="hero-heading"
      >
        <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
          {/* Slight lift from pure #000 so the field has depth */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_92%_70%_at_50%_32%,rgb(12_12_14)_0%,#000_68%)]" />
          {/* Large soft blooms — read clearly on real displays */}
          <div className="absolute left-1/2 top-[8%] h-[min(58vh,520px)] w-[min(118vw,920px)] -translate-x-1/2 rounded-[50%] bg-blue-500/18 blur-[100px]" />
          <div className="absolute -right-[8%] top-[14%] h-[min(42vh,400px)] w-[min(42vh,400px)] rounded-full bg-sky-400/12 blur-[90px]" />
          <div className="absolute bottom-[-12%] left-1/2 h-[min(48vh,440px)] w-[min(105vw,860px)] -translate-x-1/2 rounded-[50%] bg-blue-600/12 blur-[110px]" />
          {/* Sharper crown glow behind headline stack */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_42%_at_50%_12%,rgb(59_130_246/0.22),transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_50%_92%,rgb(59_130_246/0.08),transparent_55%)]" />
          {/* Top accent + edge vignette */}
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-blue-400/30 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_85%_at_50%_40%,transparent_38%,rgb(0_0_0/0.72)_100%)]" />
          {/* Structure grid */}
          <div
            className="absolute inset-0 opacity-[0.55] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_82%_72%_at_50%_36%,#000_18%,transparent_78%)]"
          />
          {/* Micro grain */}
          <div
            className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <Container wide className="relative z-10 flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col items-center text-center md:max-w-[48rem]">
            <StaggerLines className="w-full">
              <StaggerLine
                as="h1"
                id="hero-heading"
                className="block text-balance font-semibold tracking-[-0.04em] text-[clamp(2.35rem,6.2vw,4rem)] leading-[1.08] text-white"
              >
                SnapSense
              </StaggerLine>
              <StaggerLine className="mt-4 block font-medium tracking-[-0.02em] text-[clamp(1.15rem,3vw,1.85rem)] leading-snug text-neutral-200 md:mt-5">
                Understand every{' '}
                <span className="bg-linear-to-r from-blue-200 via-blue-400 to-sky-300 bg-clip-text text-transparent">
                  screen.
                </span>
              </StaggerLine>
            </StaggerLines>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.22 }}
              className="mt-6 max-w-lg text-pretty text-[14px] leading-relaxed text-neutral-500 md:mt-7 md:max-w-xl md:text-[16px]"
            >
              Instantly snip any region on your desktop and get contextual AI answers about code, errors, UI, and docs —
              without switching apps.
            </motion.p>

            <motion.div
              id="download"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.28 }}
              className="scroll-mt-24 mt-7 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-3 md:scroll-mt-28"
            >
              <motion.a
                href="https://github.com/sickboydroid/SnapSense/releases/download/V1/SnapSense-Setup-0.1.0.exe"
                target="_blank"
                rel="noopener noreferrer"
                download
                whileHover={{ opacity: 0.95 }}
                whileTap={{ scale: 0.99 }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-[14px] font-semibold text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-blue-400 sm:flex-initial sm:min-w-[200px] md:px-7 md:py-3.5 md:text-[15px]"
              >
                <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
                Download for Windows
                <ArrowRight className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
              </motion.a>
              <motion.button
                type="button"
                onClick={scrollToDemo}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.99 }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/25 bg-transparent px-6 py-3 text-[14px] font-semibold text-neutral-100 transition-colors hover:border-white/40 sm:flex-initial sm:min-w-[160px] md:px-7 md:py-3.5 md:text-[15px]"
              >
                <Play className="h-4 w-4 shrink-0 fill-current text-neutral-200" />
                Watch demo
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.34 }}
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
                      <div
                        className="h-5 w-px shrink-0 bg-blue-500/25 sm:h-px sm:w-6 md:w-8"
                        aria-hidden
                      />
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
        className="border-t border-white/10 bg-black pb-16 pt-8 scroll-mt-24 md:scroll-mt-28 md:pb-24 md:pt-10"
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
              <div className="overflow-hidden rounded-lg bg-black ring-1 ring-black/20 md:rounded-xl">
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
