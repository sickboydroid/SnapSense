import logoMark from '../assets/logo.svg'
import Container from './Container'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12">
      <Container>
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5 text-[14px] font-semibold text-neutral-300">
            <img
              src={logoMark}
              alt=""
              width={34}
              height={34}
              className="h-[34px] w-[34px] shrink-0 object-contain bg-transparent"
              decoding="async"
            />
            SnapSense
          </div>
          <p className="text-center text-[12px] text-neutral-600 md:text-left">
            © {new Date().getFullYear()} SnapSense. All rights reserved.
          </p>
          <div className="flex gap-8 text-[12px] text-neutral-600">
            <a href="#" className="transition-colors hover:text-blue-300">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-blue-300">
              Terms
            </a>
          </div>
        </div>
      </Container>
    </footer>
  )
}
