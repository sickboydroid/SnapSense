import { motion } from 'framer-motion'
import { Brain, Crosshair, MonitorSmartphone, Zap } from 'lucide-react'
import Container from './Container'
import { ScrollReveal, Stagger, StaggerItem } from './ScrollReveal'

const items = [
  {
    icon: Brain,
    title: 'Instant AI insights',
    desc: 'Explain code, summarize text, decode errors, and describe UI from a single snip.',
    iconWrap: 'bg-blue-500/15 ring-blue-500/25',
    iconColor: 'text-blue-300',
  },
  {
    icon: MonitorSmartphone,
    title: 'Works anywhere',
    desc: 'Browsers, IDEs, design tools, terminals — capture context from any app on Windows.',
    iconWrap: 'bg-violet-500/15 ring-violet-500/25',
    iconColor: 'text-violet-300',
  },
  {
    icon: Zap,
    title: 'Lightning-fast snipping',
    desc: 'Global shortcut, minimal chrome, and results in seconds so you stay in flow.',
    iconWrap: 'bg-amber-500/15 ring-amber-500/25',
    iconColor: 'text-amber-300',
  },
  {
    icon: Crosshair,
    title: 'Smart context',
    desc: 'Handles structure: code blocks, stack traces, diagrams, and mixed layouts.',
    iconWrap: 'bg-teal-500/15 ring-teal-500/25',
    iconColor: 'text-teal-300',
  },
]

export default function Features() {
  return (
    <section id="features" className="relative border-t border-white/10 py-24 md:py-32">
      <Container>
        <ScrollReveal>
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-400/90">Features</p>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-neutral-100 md:text-[2rem]">
            Built for speed and clarity
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-center text-[15px] leading-relaxed text-neutral-400 md:text-[17px]">
            Everything you need to turn any screen region into something you can act on.
          </p>
        </ScrollReveal>
        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {items.map((f) => (
            <StaggerItem key={f.title}>
              <motion.article
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="group h-full rounded-2xl border border-white/10 bg-neutral-950/90 p-6 ring-1 ring-white/5"
              >
                <div className={`mb-5 inline-flex rounded-lg p-2 ring-1 ${f.iconWrap}`}>
                  <f.icon className={`h-5 w-5 ${f.iconColor}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-[17px] font-semibold text-neutral-100">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{f.desc}</p>
              </motion.article>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
