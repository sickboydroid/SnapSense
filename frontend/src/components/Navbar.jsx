import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import logoMark from '../assets/logo.svg'
import Container from './Container'

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#use-cases', label: 'Use cases' },
  { href: '#demo', label: 'Demo' },
]

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 pt-5 md:pt-6"
    >
      <Container wide>
        <nav className="flex items-center justify-between gap-6 rounded-2xl border border-white/10 bg-neutral-950/90 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] backdrop-blur-xl md:px-5">
          <a href="#" className="flex items-center gap-2.5 font-semibold tracking-tight text-neutral-100">
            <img
              src={logoMark}
              alt=""
              width={34}
              height={34}
              className="h-[34px] w-[34px] shrink-0 object-contain bg-transparent"
              decoding="async"
            />
            <span className="text-[15px]">SnapSense</span>
          </a>
          <div className="hidden items-center gap-0.5 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:text-blue-200"
              >
                {l.label}
              </a>
            ))}
          </div>
          <motion.a
            href="#download"
            whileHover={{ opacity: 0.95 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-400"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Download
          </motion.a>
        </nav>
      </Container>
    </motion.header>
  )
}
