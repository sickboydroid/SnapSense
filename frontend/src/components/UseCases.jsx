import { motion } from 'framer-motion'
import { BookOpen, Code2, Palette } from 'lucide-react'
import Container from './Container'
import { ScrollReveal, Stagger, StaggerItem } from './ScrollReveal'

const cases = [
  {
    icon: BookOpen,
    title: 'For students',
    desc: 'Turn lecture slides, PDFs, and problem sets into explanations and study notes in one snip.',
    accent: 'border-blue-500/20 bg-blue-500/[0.07]',
    iconBg: 'bg-blue-500/15 ring-blue-500/25',
    iconColor: 'text-blue-300',
  },
  {
    icon: Code2,
    title: 'For developers',
    desc: 'Debug faster: capture stack traces, configs, and snippets for clarity and quicker fixes.',
    accent: 'border-violet-500/20 bg-violet-500/[0.07]',
    iconBg: 'bg-violet-500/15 ring-violet-500/25',
    iconColor: 'text-violet-300',
  },
  {
    icon: Palette,
    title: 'For designers',
    desc: 'Study UI patterns, spacing, and references from any tool or browser without exporting assets.',
    accent: 'border-teal-500/20 bg-teal-500/[0.07]',
    iconBg: 'bg-teal-500/15 ring-teal-500/25',
    iconColor: 'text-teal-300',
  },
]

export default function UseCases() {
  return (
    <section id="use-cases" className="relative border-t border-white/10 py-24 md:py-32">
      <Container>
        <ScrollReveal>
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-400/90">Use cases</p>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-neutral-100 md:text-[2rem]">
            Made for how you work
          </h2>
        </ScrollReveal>
        <Stagger className="mt-16 grid gap-5 md:grid-cols-3">
          {cases.map((c) => (
            <StaggerItem key={c.title}>
              <motion.article
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className={`h-full rounded-2xl border p-6 ring-1 ring-white/5 ${c.accent}`}
              >
                <div className={`mb-5 inline-flex rounded-lg p-2.5 ring-1 ${c.iconBg}`}>
                  <c.icon className={`h-5 w-5 ${c.iconColor}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-[18px] font-semibold text-neutral-100">{c.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">{c.desc}</p>
              </motion.article>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
