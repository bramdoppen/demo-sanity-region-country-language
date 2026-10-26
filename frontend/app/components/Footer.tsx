import Link from 'next/link'
import PaxonLogo from '@/app/components/PaxonLogo'

const COLUMNS = [
  {
    title: 'Services',
    links: ['Fulfillment', 'Returns', 'Transport Management', 'Regulated logistics'],
  },
  {
    title: 'Sectors',
    links: ['Health & beauty', 'Fashion', 'Consumer electronics', 'Food & beverage'],
  },
  {title: 'Paxon', links: ['About us', 'Jobs', 'Help', 'Contact us']},
]

export default function Footer() {
  return (
    <footer className="bg-paxon-navy text-white">
      <div className="container grid gap-12 py-16 md:grid-cols-4">
        <div className="flex flex-col gap-4">
          <PaxonLogo />
          <p className="max-w-xs text-sm text-white/70">
            Logistics for complex supply chains with valuable products.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3
              className="mb-4 text-sm font-semibold text-white"
              style={{fontFamily: 'var(--font-sans)'}}
            >
              {column.title}
            </h3>
            <ul role="list" className="space-y-2 text-sm text-white/70">
              {column.links.map((link) => (
                <li key={link}>
                  {link === 'Help' || link === 'Contact us' ? (
                    <Link href="/help" className="hover:text-white">
                      {link}
                    </Link>
                  ) : (
                    link
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container py-6 text-xs text-white/50">
          Demo site. Paxon is part of bpost group. Content and policies on this site are fictional.
        </div>
      </div>
    </footer>
  )
}
