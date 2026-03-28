import Container from './Container'
import { ScrollReveal } from './ScrollReveal'

const faqs = [
  {
    q: 'Does it work with any app?',
    a: 'Yes. SnapSense captures whatever is on screen — browsers, IDEs, PDFs, design tools, or the desktop — then sends only the region you select for analysis.',
  },
  {
    q: 'What gets sent to the AI?',
    a: 'Only the pixels you snip, when you ask for insight. Nothing runs in the background without your shortcut and selection.',
  },
  {
    q: 'Which Windows versions are supported?',
    a: 'Windows 10 and 11. The installer is a standard desktop build — no Microsoft Store required for the beta.',
  },
]

export default function PreFooter() {
  return (
    <section id="faq" className="relative border-t border-white/10 py-20 md:py-28" aria-labelledby="faq-heading">
      <Container>
        <ScrollReveal>
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-400/90">FAQ</p>
          <h2
            id="faq-heading"
            className="mt-4 text-center text-2xl font-semibold tracking-tight text-neutral-100 md:text-3xl"
          >
            Before you install
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-[14px] text-neutral-500 md:text-[15px]">
            Quick answers about privacy, apps, and system requirements.
          </p>
        </ScrollReveal>
        <ScrollReveal className="mx-auto mt-12 max-w-2xl md:mt-14" delay={0.06}>
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-neutral-950/50 px-5 py-2 md:px-8">
            {faqs.map((item) => (
              <li key={item.q} className="py-6 first:pt-5 last:pb-5">
                <p className="text-[15px] font-semibold text-neutral-200">{item.q}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{item.a}</p>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </Container>
    </section>
  )
}
