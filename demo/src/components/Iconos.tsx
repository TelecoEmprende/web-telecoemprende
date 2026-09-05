/*
 * Iconos dibujados a mano, todos con el mismo grosor de línea.
 * Heredan el color y el tamaño de donde se usen.
 */

type Props = { className?: string }

const comun = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconoRed({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M7 6h10M6 8l5 8M18 8l-5 8" />
    </svg>
  )
}

/* --- Los tres departamentos --- */

/** Tech: los corchetes y la barra de escribir código. */
export function IconoCodigo({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <path d="M9 8.5 5.5 12 9 15.5" />
      <path d="M15 8.5 18.5 12 15 15.5" />
      <path d="m13.2 6.8-2.4 10.4" />
    </svg>
  )
}

/** Marketing: un megáfono, con su cono y su asa. */
export function IconoMegafono({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <path d="M3.5 10.2 16.5 5v14L3.5 13.8Z" />
      <path d="M7 14v3.6a1.9 1.9 0 0 0 3.8 0v-2.4" />
      <path d="M19.4 9.8a3.6 3.6 0 0 1 0 4.4" />
    </svg>
  )
}

/** Eventos: dos personas, que es de lo que va montar un evento. */
export function IconoPersonas({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <circle cx="9.5" cy="8.5" r="3.1" />
      <path d="M3.8 19.2a5.7 5.7 0 0 1 11.4 0" />
      <path d="M16.3 6.3a3.1 3.1 0 0 1 0 5.6" />
      <path d="M17.4 14.4a5.7 5.7 0 0 1 3.3 4.8" />
    </svg>
  )
}

export function IconoFlecha({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  )
}

export function IconoCerrar({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconoPlay({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M9 6.5v11a1 1 0 0 0 1.53.85l8.5-5.5a1 1 0 0 0 0-1.7l-8.5-5.5A1 1 0 0 0 9 6.5Z" />
    </svg>
  )
}

export function IconoImagen({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 4.5-4.5 3 3L15 12l5 5" />
    </svg>
  )
}

/* Los dos de abajo son marcas registradas: se dibujan como son, no "a mano". */

export function IconoInstagram({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.4 6.6h.01" strokeWidth={2.2} />
    </svg>
  )
}

export function IconoLinkedin({ className }: Props) {
  return (
    <svg {...comun} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.8 10.6v6.2" />
      <path d="M7.8 7.6h.01" strokeWidth={2.2} />
      <path d="M11.7 16.8v-6.2" />
      <path d="M11.7 13.4c0-1.6 1-2.8 2.5-2.8s2.4 1.2 2.4 2.8v3.4" />
    </svg>
  )
}
