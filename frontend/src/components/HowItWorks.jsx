import { motion } from 'framer-motion'
import { Keyboard, MousePointer2, Sparkles } from 'lucide-react'
import Container from './Container'
import { ScrollReveal, Stagger, StaggerItem } from './ScrollReveal'

const steps = [
  {
    title: 'Press shortcut',
    desc: 'Trigger SnapSense from anywhere with a configurable hotkey.',
    icon: Keyboard,
    ring: 'border-blue-500/35 bg-black',
    iconColor: 'text-blue-300',
  },
  {
    title: 'Snip screen',
    desc: 'Drag to select the exact region you care about.',
    icon: MousePointer2,
    ring: 'border-violet-500/35 bg-black',
    iconColor: 'text-violet-300',
  },
  {
    title: 'Get instant answers',
    desc: 'Receive concise, contextual output tailored to what you captured.',
    icon: Sparkles,
    ring: 'border-teal-500/35 bg-black',
    iconColor: 'text-teal-300',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <Container>
        <ScrollReveal>
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-400/90">
            How it works
          </p>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-neutral-100 md:text-[2rem]">
            Three steps. Zero friction.
          </h2>
        </ScrollReveal>
        <div className="relative mt-20">
          {/* Runs only in the gutters; icon tiles use solid bg so the line does not cut through them */}
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-7 z-0 hidden h-px bg-linear-to-r from-blue-500/20 via-violet-500/20 to-teal-500/20 md:block lg:left-[12%] lg:right-[12%]" />
          <Stagger className="grid gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <StaggerItem key={s.title}>
                <motion.div whileHover={{ y: -2 }} className="relative flex flex-col items-center text-center">
                  <div
                    className={`relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ring-1 ring-white/5 ${s.ring}`}
                  >
                    <s.icon className={`h-6 w-6 ${s.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-2 text-[17px] font-semibold text-neutral-100">{s.title}</h3>
                  <p className="mt-3 max-w-[260px] text-[14px] leading-relaxed text-neutral-500">{s.desc}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Container>
    </section>
  )
}
