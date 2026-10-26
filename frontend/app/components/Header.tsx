import Link from 'next/link'
import PaxonLogo from '@/app/components/PaxonLogo'

const MENU = ['Services', 'Sectors', 'Digital solutions', 'Resources', 'About us']

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-20 items-center bg-white/95 backdrop-blur">
      <div className="container flex items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-paxon-blue" aria-label="Paxon home">
            <PaxonLogo />
          </Link>
          <nav className="hidden lg:block">
            <ul role="list" className="flex items-center gap-6 text-sm">
              {MENU.map((item) => (
                <li key={item} className="flex items-center gap-1">
                  {item === 'About us' ? <Link href="/about">{item}</Link> : <span>{item}</span>}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-70">
                    <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/help" className="hover:text-paxon-blue">
            Help
          </Link>
          <Link href="/help" className="btn-paxon text-sm">
            Contact us <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
