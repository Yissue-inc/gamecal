interface GameIconProps {
  slug: string
  color: string
  size?: number
}

export function GameIcon({ slug, color, size = 16 }: GameIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
    style: { flexShrink: 0 } as React.CSSProperties,
  }

  switch (slug) {
    case 'fortnite':
      return (
        <svg {...props}>
          <polygon points="9,1 5,9 8,9 7,15 11,7 8,7" fill={color} />
        </svg>
      )
    case 'apex':
      return (
        <svg {...props}>
          <path d="M8 1L14 4V9C14 12 11 14.5 8 15C5 14.5 2 12 2 9V4L8 1Z" stroke={color} strokeWidth="1.5" />
          <polygon points="8,5 10,8 8,11 6,8" fill={color} />
        </svg>
      )
    case 'valorant':
      return (
        <svg {...props}>
          <rect x="6.5" y="1" width="3" height="14" rx="1" fill={color} />
          <rect x="1" y="6.5" width="14" height="3" rx="1" fill={color} />
          <rect x="3.5" y="3.5" width="3" height="3" rx="0.5" fill={color} opacity="0.6" transform="rotate(45 5 5)" />
        </svg>
      )
    case 'lol':
      return (
        <svg {...props}>
          <line x1="3" y1="13" x2="13" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="3" x2="13" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="8" r="2" fill={color} />
        </svg>
      )
    case 'destiny2':
      return (
        <svg {...props}>
          <polygon points="8,2 15,14 1,14" stroke={color} strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="10" r="2" fill={color} />
        </svg>
      )
    case 'diablo4':
      return (
        <svg {...props}>
          <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" stroke={color} strokeWidth="1.5" fill="none" />
          <line x1="8" y1="4" x2="8" y2="12" stroke={color} strokeWidth="1.5" />
          <line x1="4" y1="8" x2="12" y2="8" stroke={color} strokeWidth="1.5" />
        </svg>
      )
    case 'wow':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" fill="none" />
          <circle cx="5.5" cy="7" r="1.2" fill={color} />
          <circle cx="10.5" cy="7" r="1.2" fill={color} />
          <path d="M5 11 Q8 13.5 11 11" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M2 5 Q4 2 6 4" stroke={color} strokeWidth="1.2" fill="none" />
          <path d="M14 5 Q12 2 10 4" stroke={color} strokeWidth="1.2" fill="none" />
        </svg>
      )
    case 'pokemon-go':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5" fill="none" />
          <line x1="1.5" y1="8" x2="14.5" y2="8" stroke={color} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2" fill={color} />
          <circle cx="8" cy="8" r="1" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
        </svg>
      )
    case 'genshin':
      return (
        <svg {...props}>
          <path d="M8 2 C4 2 2 5 2 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M2 8 C2 11 5 14 8 14" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M8 14 C12 14 14 11 14 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M14 8 C14 5 11 2 8 2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="8" cy="8" r="1.5" fill={color} />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <polygon points="8,2 14,8 8,14 2,8" fill={color} opacity="0.9" />
        </svg>
      )
  }
}
