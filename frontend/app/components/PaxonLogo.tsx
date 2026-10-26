export default function PaxonLogo({className = ''}: {className?: string}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="currentColor">
        <path d="M10.2 2h3.6v6.4L17 5.2l2.6 2.6-4.4 4.4H22v3.6h-6.4l3.2 3.2-2.6 2.6-4.4-4.4V22h-3.6v-6.4L5 18.8l-2.6-2.6 4.4-4.4H2V8.2h6.4L5.2 5 7.8 2.4l2.4 2.4z" />
      </svg>
      <span className="font-display text-2xl leading-none tracking-tight">paxon</span>
    </span>
  )
}
